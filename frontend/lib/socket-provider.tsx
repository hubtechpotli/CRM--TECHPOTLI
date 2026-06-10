"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getWsUrl } from "@/lib/ws-url";
import { useAuthStore } from "@/store/auth-store";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const restoreSessionToken = useAuthStore((s) => s.restoreSessionToken);
  const [socket, setSocket] = useState<Socket | null>(null);

  const token = useMemo(() => restoreSessionToken() ?? accessToken, [accessToken, restoreSessionToken]);

  useEffect(() => {
    if (!token) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      return;
    }

    const wsUrl = getWsUrl();
    const instance = io(wsUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    setSocket(instance);

    return () => {
      instance.disconnect();
    };
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
