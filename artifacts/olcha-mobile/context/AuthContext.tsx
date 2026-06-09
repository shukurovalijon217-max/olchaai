import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface User {
  id: number;
  username: string;
  displayName: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  status: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("olcha_user").then((raw) => {
      if (raw) setUser(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Kirish muvaffaqiyatsiz");
    setUser(data);
    await AsyncStorage.setItem("olcha_user", JSON.stringify(data));
  }, []);

  const register = useCallback(async (username: string, displayName: string, email: string, password: string) => {
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Ro'yxatdan o'tish muvaffaqiyatsiz");
    setUser(data);
    await AsyncStorage.setItem("olcha_user", JSON.stringify(data));
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${BASE}/auth/logout`, { method: "POST" }).catch(() => {});
    setUser(null);
    await AsyncStorage.removeItem("olcha_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
