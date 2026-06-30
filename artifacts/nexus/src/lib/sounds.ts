/* ── OlCha Notification Sound System (Web Audio API — no files needed) ── */

/* ── Feature preferences (shared utility) ── */
const PREFS_KEY = "olcha_feature_prefs";
export function loadFeaturePrefs(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch { return {}; }
}
export function saveFeaturePrefs(p: Record<string, boolean>) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
}
export function getFeaturePref(id: string, def = true): boolean {
  const p = loadFeaturePrefs();
  return id in p ? p[id] : def;
}

function getCtx(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch { return null; }
}

function isMuted(): boolean {
  try { return localStorage.getItem("olcha_sound_muted") === "1"; } catch { return false; }
}

export function setSoundMuted(muted: boolean) {
  try { localStorage.setItem("olcha_sound_muted", muted ? "1" : "0"); } catch {}
}

export function isSoundEnabled(): boolean {
  return !isMuted();
}

/* ── gentle 2-note ping for incoming message ── */
export function playMessageSound(vol = 0.35) {
  if (isMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  [[900, 0], [1200, 0.11]].forEach(([freq, delay]) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = ac.currentTime + delay;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.start(t);
    osc.stop(t + 0.29);
  });
}

/* ── SMS / text notification (single soft tone) ── */
export function playSmsSound(vol = 0.28) {
  if (isMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  [700, 900, 700].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = ac.currentTime + i * 0.09;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.start(t);
    osc.stop(t + 0.13);
  });
}

/* ── call ringtone (repeating pattern, returns stop fn) ── */
export function playCallRingtone(): () => void {
  if (isMuted()) return () => {};
  let active = true;
  let ac: AudioContext | null = null;

  const ring = () => {
    if (!active) return;
    ac = getCtx();
    if (!ac) return;
    const pattern: [number, number, number][] = [
      [820, 0,    0.15],
      [820, 0.18, 0.15],
      [1040, 0.38, 0.18],
    ];
    pattern.forEach(([freq, delay, dur]) => {
      if (!active || !ac) return;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      const t = ac.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.setValueAtTime(0.22, t + dur - 0.03);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    });
  };

  ring();
  const iv = setInterval(() => { if (active) ring(); }, 2200);

  return () => {
    active = false;
    clearInterval(iv);
    try { ac?.close(); } catch {}
  };
}

/* ── positive chime (quest complete / reaction) ── */
export function playSuccessSound(vol = 0.3) {
  if (isMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = ac.currentTime + i * 0.10;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * (1 - i * 0.12), t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.start(t);
    osc.stop(t + 0.23);
  });
}
