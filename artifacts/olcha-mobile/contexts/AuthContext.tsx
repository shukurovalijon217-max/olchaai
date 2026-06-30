import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  isPremium?: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isVerified?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: Partial<AuthUser>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function authFetch(path: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers ?? {}) as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem("@olcha_token"),
          AsyncStorage.getItem("@olcha_user"),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          const res = await authFetch("/api/auth/me", {}, storedToken);
          if (res.ok) {
            const fresh = await res.json() as AuthUser;
            setUser(fresh);
            await AsyncStorage.setItem("@olcha_user", JSON.stringify(fresh));
          }
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await authFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: identifier, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "Login failed");
    }
    const data = await res.json() as AuthUser & { token?: string };
    const authToken = data.token ?? String(data.id);
    const { token: _t, ...userData } = data;
    setUser(userData as AuthUser);
    setToken(authToken);
    await AsyncStorage.setItem("@olcha_token", authToken);
    await AsyncStorage.setItem("@olcha_user", JSON.stringify(userData));
  };

  const register = async (username: string, displayName: string, email: string, password: string) => {
    const res = await authFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, displayName, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "Registration failed");
    }
    const data = await res.json() as AuthUser & { token?: string };
    const authToken = data.token ?? String(data.id);
    const { token: _t, ...userData } = data;
    setUser(userData as AuthUser);
    setToken(authToken);
    await AsyncStorage.setItem("@olcha_token", authToken);
    await AsyncStorage.setItem("@olcha_user", JSON.stringify(userData));
  };

  const logout = async () => {
    try { await authFetch("/api/auth/logout", { method: "POST" }, token); } catch {}
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove(["@olcha_token", "@olcha_user"]);
  };

  const updateUser = (partial: Partial<AuthUser>) => {
    setUser(prev => prev ? { ...prev, ...partial } : prev);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await authFetch("/api/auth/me", {}, token);
      if (res.ok) {
        const fresh = await res.json() as AuthUser;
        setUser(fresh);
        await AsyncStorage.setItem("@olcha_user", JSON.stringify(fresh));
      }
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
