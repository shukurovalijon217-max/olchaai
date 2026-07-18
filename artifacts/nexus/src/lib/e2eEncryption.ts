/**
 * E2E Encryption — WhatsApp/Signal style
 * ECDH P-256 key exchange + AES-GCM message encryption
 * Private key NEVER leaves the device (stored in IndexedDB / localStorage)
 */

const DB_NAME = "olchaai_e2e";
const KEY_STORE = "keys";
const PRIVATE_KEY_ID = "myPrivateKey";

/* ── IndexedDB helpers ───────────────────────────────────────── */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(KEY_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, "readonly");
    const req = tx.objectStore(KEY_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, "readwrite");
    const req = tx.objectStore(KEY_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ── Key generation & storage ───────────────────────────────── */
export async function generateAndStoreKeyPair(): Promise<string> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,   // extractable private key (to persist in IDB)
    ["deriveKey", "deriveBits"],
  );

  // Export public key as JWK (share with server)
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  // Export private key as JWK (keep in IDB, never sent to server)
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  await idbSet(PRIVATE_KEY_ID, privateJwk);

  return JSON.stringify(publicJwk);
}

export async function hasKeyPair(): Promise<boolean> {
  try {
    const k = await idbGet(PRIVATE_KEY_ID);
    return k !== null;
  } catch {
    return false;
  }
}

async function getPrivateKey(): Promise<CryptoKey | null> {
  try {
    const jwk = await idbGet<JsonWebKey>(PRIVATE_KEY_ID);
    if (!jwk) return null;
    return crypto.subtle.importKey(
      "jwk", jwk,
      { name: "ECDH", namedCurve: "P-256" },
      false, ["deriveKey", "deriveBits"],
    );
  } catch {
    return null;
  }
}

/* ── Shared secret derivation ───────────────────────────────── */
async function deriveSharedKey(theirPublicJwk: JsonWebKey, myPrivateKey: CryptoKey): Promise<CryptoKey> {
  const theirKey = await crypto.subtle.importKey(
    "jwk", theirPublicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false, [],
  );
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirKey },
    myPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/* ── Encrypt / decrypt ───────────────────────────────────────── */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKeyJwk: string,
): Promise<{ ciphertext: string; nonce: string } | null> {
  try {
    const privateKey = await getPrivateKey();
    if (!privateKey) return null;

    const theirJwk = JSON.parse(recipientPublicKeyJwk) as JsonWebKey;
    const sharedKey = await deriveSharedKey(theirJwk, privateKey);

    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      sharedKey,
      encoded,
    );

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      nonce: btoa(String.fromCharCode(...nonce)),
    };
  } catch {
    return null;
  }
}

export async function decryptMessage(
  ciphertext: string,
  nonce: string,
  senderPublicKeyJwk: string,
): Promise<string | null> {
  try {
    const privateKey = await getPrivateKey();
    if (!privateKey) return null;

    const theirJwk = JSON.parse(senderPublicKeyJwk) as JsonWebKey;
    const sharedKey = await deriveSharedKey(theirJwk, privateKey);

    const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const nonceBytes = Uint8Array.from(atob(nonce), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonceBytes },
      sharedKey,
      ciphertextBytes,
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

/* ── API helpers ─────────────────────────────────────────────── */
const KEY_CACHE = new Map<number, string>();

export async function fetchAndCachePublicKey(userId: number): Promise<string | null> {
  if (KEY_CACHE.has(userId)) return KEY_CACHE.get(userId)!;
  try {
    const res = await fetch(`/api/e2e/key/${userId}`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json() as { publicKey: string };
    KEY_CACHE.set(userId, data.publicKey);
    return data.publicKey;
  } catch {
    return null;
  }
}

export async function uploadPublicKey(publicKeyJwk: string): Promise<boolean> {
  try {
    const res = await fetch("/api/e2e/key", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKey: publicKeyJwk }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Call this on app startup — generates key pair if not yet set up */
export async function initE2E(): Promise<void> {
  try {
    const has = await hasKeyPair();
    if (has) return;
    const publicKeyJwk = await generateAndStoreKeyPair();
    await uploadPublicKey(publicKeyJwk);
  } catch {
    // E2E init failure is non-fatal — messages fall back to plaintext
  }
}
