import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isPremium?: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, password: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

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
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Login failed");
    }
    const data = await res.json() as AuthUser & { token: string };
    if (!data.token) throw new Error("Server javobida token yo'q");
    const { token: authToken, ...userData } = data;
    setUser(userData as AuthUser);
    setToken(authToken);
    await AsyncStorage.setItem("@olcha_token", authToken);
    await AsyncStorage.setItem("@olcha_user", JSON.stringify(userData));
  };

  const register = async (username: string, displayName: string, password: string, phone: string) => {
    const email = `${username}@olchaai.com`;
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, email, phone, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Registration failed");
    }
    const data = await res.json() as AuthUser & { token: string };
    if (!data.token) throw new Error("Server javobida token yo'q");
    const { token: authToken, ...userData } = data;
    setUser(userData as AuthUser);
    setToken(authToken);
    await AsyncStorage.setItem("@olcha_token", authToken);
    await AsyncStorage.setItem("@olcha_user", JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove(["@olcha_token", "@olcha_user"]);
  };

  const updateUser = (partial: Partial<AuthUser>) => {
    setUser((prev) => prev ? { ...prev, ...partial } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
