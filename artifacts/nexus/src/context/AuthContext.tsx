import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
  status: string;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (username: string, displayName: string, email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res = await fetch(`${API}/api/auth/me`, { credentials: "include" });
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMe(); }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Kirish xatosi" };
    setUser(data);
    return {};
  };

  const register = async (username: string, displayName: string, email: string, password: string) => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, displayName, email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Ro'yxatdan o'tish xatosi" };
    setUser(data);
    return {};
  };

  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
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
