import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export interface NotifPrefs {
  likes: boolean;
  comments: boolean;
  followers: boolean;
  messages: boolean;
  groups: boolean;
  premium: boolean;
  emailNotifs?: boolean;
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

const API = (import.meta.env.VITE_API_BASE_URL);

function PushInitializer({ userId }: { userId: number | null }) {
  usePushNotifications(!!userId);
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async (retries = 2) => {
    try {
      const res = await fetch(`${API}/api/auth/me`, { credentials: "include" });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        // Apply saved language preference from server (overrides localStorage if different)
        const savedLang = userData?.notifPrefs?.language as string | undefined;
        if (savedLang) {
          localStorage.setItem("olcha_lang_user", savedLang);
          const { default: i18nInst } = await import("@/lib/i18n");
          i18nInst.changeLanguage(savedLang);
        }
      } else if (res.status === 401) {
        // Real session expiry — log out
        setUser(null);
      }
      // Other status codes (500, 503, etc.): keep current user state
    } catch {
      // Network error (internet disconnect, timeout, etc.)
      // Retry before giving up — don't log the user out on a transient error
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1500));
        return fetchMe(retries - 1);
      }
      // After all retries exhausted, keep existing user state (don't logout)
      // Only clear user on initial load (when user is still null from useState)
      setUser(prev => prev);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMe(); }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) return { error: data.error ?? "Kirish xatosi" };
      setUser(data);
      /* Touch daily streak — fire-and-forget */
      fetch(`${API}/api/gamification/streak/touch`, { method: "POST", credentials: "include" }).catch(() => {});
      return {};
    } catch {
      return { error: "Server bilan aloqa xatosi" };
    }
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
      /* Touch daily streak on first login */
      fetch(`${API}/api/gamification/streak/touch`, { method: "POST", credentials: "include" }).catch(() => {});
      return {};
    } catch {
      return { error: "Server bilan aloqa xatosi" };
    }
  };

  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refetch: fetchMe }}>
      <PushInitializer userId={user?.id ?? null} />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
