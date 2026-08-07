import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clearRealtimeToken } from "@/lib/realtimeToken";

export interface NotifPrefs {
  likes: boolean;
  comments: boolean;
  followers: boolean;
  messages: boolean;
  groups: boolean;
  premium: boolean;
}

export interface PrivacySettings {
  privateProfile: boolean;
  activityStatus: boolean;
  readReceipts: boolean;
  suggestions: boolean;
  searchVisibility: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  email: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  isVerified: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  status: string;
  country?: string | null;
  timezone?: string | null;
  notifPrefs?: NotifPrefs | null;
  privacySettings?: PrivacySettings | null;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (username: string, displayName: string, email: string, phone: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API = (import.meta.env.VITE_API_BASE_URL || "");

const USER_CACHE_KEY = "gilos_user_cache_v1";

function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch { return null; }
}

function writeCachedUser(u: AuthUser | null) {
  try {
    if (u) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_CACHE_KEY);
  } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Darhol cached foydalanuvchini ko'rsatish — HECH QANDAY spinner yo'q
  const [user, setUser] = useState<AuthUser | null>(() => readCachedUser());
  const [loading, setLoading] = useState(() => readCachedUser() === null);

  const fetchMe = async (retries = 1) => {
    try {
      // 8 soniya timeout
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API}/api/auth/me`, {
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        writeCachedUser(userData);
        // Apply saved language preference from server
        const savedLang = userData?.notifPrefs?.language as string | undefined;
        if (savedLang) {
          localStorage.setItem("olcha_lang_user", savedLang);
          const { default: i18nInst } = await import("@/lib/i18n");
          i18nInst.changeLanguage(savedLang);
        }
      } else if (res.status === 401) {
        setUser(null);
        writeCachedUser(null);
      }
      // 5xx va boshqalar: cache ni saqlaymiz
    } catch {
      // Timeout yoki tarmoq xatosi — bir marta qayta urinish
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return fetchMe(retries - 1);
      }
      // Tarmoq yo'q — cached user ni saqlaymiz, chiqarmaymiz
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMe(); }, []);

  const login = async (email: string, password: string) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(`${API}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        // Status avval tekshiriladi — Cloudflare HTML qaytarsa JSON.parse xato bermasligi uchun
        if (res.status === 429) {
          try {
            const d = await res.json().catch(() => ({}));
            return { error: d.error ?? "Ko'p urinish — biroz kuting" };
          } catch { return { error: "Ko'p urinish — biroz kuting" }; }
        }
        if (res.status === 403) return { error: "Kirish taqiqlangan — keyinroq urinib ko'ring" };
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          // Signal to caller: server is restarting; caller handles countdown + retry
          return { error: "__server_loading__" };
        }
        let data: any = {};
        try {
          const text = await res.text();
          data = text ? JSON.parse(text) : {};
        } catch { /* non-JSON javob — data bo'sh qoladi */ }
        if (!res.ok) return { error: data.error ?? `Server xatosi (${res.status})` };
        setUser(data);
        writeCachedUser(data);
        return {};
      } catch {
        if (attempt === 0) { await new Promise(r => setTimeout(r, 2000)); continue; }
        return { error: "Internet aloqasi yo'q yoki server band" };
      }
    }
    return { error: "Server bilan aloqa xatosi" };
  };

  const register = async (username: string, displayName: string, email: string, phone: string, password: string) => {
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, displayName, email, phone, password }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) return { error: data.error ?? "Ro'yxatdan o'tish xatosi" };
      setUser(data);
      writeCachedUser(data);
      return {};
    } catch {
      return { error: "Server bilan aloqa xatosi" };
    }
  };

  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    clearRealtimeToken();
    setUser(null);
    writeCachedUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
