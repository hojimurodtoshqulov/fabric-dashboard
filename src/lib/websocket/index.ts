import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { WSEvent, WSEventType } from "@/types";

let io: SocketIOServer | null = null;

export function initWebSocket(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/ws",
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId as string;
    const role = socket.handshake.auth?.role as string;

    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.join(`user:${userId}`);
    if (role) socket.join(`role:${role}`);

    console.log(`[WS] User connected: ${userId}`);

    socket.on("disconnect", () => {
      console.log(`[WS] User disconnected: ${userId}`);
    });

    socket.on("join-room", (room: string) => {
      socket.join(room);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitToUser<T>(userId: string, event: WSEventType, payload: T) {
  if (!io) return;
  io.to(`user:${userId}`).emit("event", {
    type: event,
    payload,
    timestamp: new Date().toISOString(),
  } satisfies WSEvent<T>);
}

export function emitToRole<T>(role: string, event: WSEventType, payload: T) {
  if (!io) return;
  io.to(`role:${role}`).emit("event", {
    type: event,
    payload,
    timestamp: new Date().toISOString(),
  } satisfies WSEvent<T>);
}

export function emitToAll<T>(event: WSEventType, payload: T) {
  if (!io) return;
  io.emit("event", {
    type: event,
    payload,
    timestamp: new Date().toISOString(),
  } satisfies WSEvent<T>);
}

export async function publishEvent<T>(event: WSEventType, payload: T) {
  // no-op without Redis
}
