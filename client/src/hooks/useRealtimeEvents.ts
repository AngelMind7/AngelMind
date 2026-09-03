import { useEffect, useRef, useState } from "react";
import { getFirebaseIdToken } from "@/firebase";
import { trpc } from "@/lib/trpc";

type RealtimeStatus = "disabled" | "connecting" | "connected" | "reconnecting";
type ParsedSseEvent = { id?: number; event?: string; data?: string };

export function parseSseBlock(block: string): ParsedSseEvent {
  const result: ParsedSseEvent = {};
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("id:")) result.id = Number(line.slice(3).trim());
    else if (line.startsWith("event:")) result.event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (data.length > 0) result.data = data.join("\n");
  return result;
}

export function useRealtimeEvents(enabled: boolean) {
  const utils = trpc.useUtils();
  const lastEventId = useRef<number>(0);
  const [status, setStatus] = useState<RealtimeStatus>(enabled ? "connecting" : "disabled");

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof fetch === "undefined") { setStatus("disabled"); return; }
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let socket: WebSocket | undefined;
    let sseFallbackUsed = false;

    const scheduleReconnect = () => { if (!disposed) reconnectTimer = setTimeout(() => void connect(), 5_000); };
    const handleEvent = (payload: string) => {
      try { const event = JSON.parse(payload) as { id?: number }; if (typeof event.id === "number" && Number.isSafeInteger(event.id)) lastEventId.current = event.id; } catch { /* invalid event is ignored */ }
      void utils.invalidate();
    };
    const connectSse = async (token: string) => {
      controller = new AbortController();
      const url = new URL("/api/events/stream", window.location.origin);
      if (lastEventId.current > 0) url.searchParams.set("lastEventId", String(lastEventId.current));
      const response = await fetch(url, { headers: { authorization: `Bearer ${token}`, accept: "text/event-stream" }, credentials: "include", signal: controller.signal });
      if (!response.ok || !response.body) throw new Error(`Realtime stream failed: ${response.status}`);
      setStatus("connected");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (!disposed) { const chunk = await reader.read(); if (chunk.done) break; buffer += decoder.decode(chunk.value, { stream: true }); const blocks = buffer.split("\n\n"); buffer = blocks.pop() ?? ""; for (const block of blocks) { const event = parseSseBlock(block); if (typeof event.id === "number" && Number.isSafeInteger(event.id)) lastEventId.current = event.id; if (event.event !== "heartbeat" && event.data) handleEvent(event.data); } }
    };
    const connect = async () => {
      if (disposed) return;
      setStatus(lastEventId.current > 0 ? "reconnecting" : "connecting");
      const token = await getFirebaseIdToken(); if (disposed) return; if (!token) { setStatus("disabled"); return; }
      if (typeof WebSocket === "function" && !sseFallbackUsed) {
        await new Promise<void>(resolve => {
          const protocol = `angelmind.bearer.${token}`;
          const url = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/events/ws${lastEventId.current ? `?lastEventId=${lastEventId.current}` : ""}`;
          socket = new WebSocket(url, protocol);
          socket.onopen = () => { setStatus("connected"); resolve(); };
          socket.onmessage = event => handleEvent(String(event.data));
          socket.onerror = () => { sseFallbackUsed = true; try { socket?.close(); } catch {} resolve(); };
          socket.onclose = () => { if (!disposed && !sseFallbackUsed) scheduleReconnect(); };
        });
        if (!sseFallbackUsed || disposed) return;
      }
      try { await connectSse(token); } catch (error) { if (!disposed && !(error instanceof DOMException && error.name === "AbortError")) console.warn("[Realtime] Stream disconnected", error); }
      sseFallbackUsed = false;
      scheduleReconnect();
    };
    void connect();
    return () => { disposed = true; if (reconnectTimer) clearTimeout(reconnectTimer); controller?.abort(); socket?.close(); };
  }, [enabled, utils]);
  return status;
}
