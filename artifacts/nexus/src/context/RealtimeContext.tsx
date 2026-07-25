import { createContext, useContext, useEffect, useRef, useCallback, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

type Handler = (msg: any) => void;

interface RealtimeContextValue {
  send: (msg: Record<string, unknown>) => void;
  subscribe: (type: string, handler: Handler) => () => void;
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function buildWsUrl(userId: number) {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/go/ws?userId=${userId}`;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Map<string, Set<Handler>>>(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subscribe = useCallback((type: string, handler: Handler) => {
    if (!handlersRef.current.has(type)) handlersRef.current.set(type, new Set());
    handlersRef.current.get(type)!.add(handler);
    return () => { handlersRef.current.get(type)?.delete(handler); };
  }, []);

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let closedByUs = false;

    const connect = () => {
      const ws = new WebSocket(buildWsUrl(userId));
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closedByUs) reconnectTimerRef.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => { try { ws.close(); } catch {} };
      ws.onmessage = (e) => {
        let msg: any;
        try { msg = JSON.parse(e.data); } catch { return; }
        const key = msg.event ?? msg.type;
        if (!key) return;
        handlersRef.current.get(key)?.forEach(h => {
          try { h(msg); } catch {}
        });
      };
    };
    connect();

    return () => {
      closedByUs = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user?.id]);

  return (
    <RealtimeContext.Provider value={{ send, subscribe, connected }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used inside RealtimeProvider");
  return ctx;
}
