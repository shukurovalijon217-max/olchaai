import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await AsyncStorage.getItem("@olcha_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers ?? {}) as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}
