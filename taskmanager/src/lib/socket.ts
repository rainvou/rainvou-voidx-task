/* ------------------------------------------------------------------ */
/*  Socket.io – server config & client hook                            */
/* ------------------------------------------------------------------ */

import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket as ClientSocket } from "socket.io-client";

/* ================================================================== */
/*  SERVER                                                             */
/* ================================================================== */

export interface ServerToClientEvents {
  "comment:created": (payload: { taskId: string; comment: unknown }) => void;
  "comment:updated": (payload: { taskId: string; comment: unknown }) => void;
  "comment:deleted": (payload: { taskId: string; commentId: string }) => void;
  "reaction:added": (payload: { commentId: string; reaction: unknown }) => void;
  "reaction:removed": (payload: { commentId: string; reactionId: string }) => void;
}

export interface ClientToServerEvents {
  "project:join": (projectId: string) => void;
  "project:leave": (projectId: string) => void;
}

/**
 * Initialise a Socket.io server with room-based project isolation.
 *
 * Every client joins a room named `project:<projectId>` so that events
 * are scoped to the correct project.
 */
export function createSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      path: "/api/socket",
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    },
  );

  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("project:join", (projectId: string) => {
      const room = `project:${projectId}`;
      socket.join(room);
      console.log(`[socket] ${socket.id} joined room ${room}`);
    });

    socket.on("project:leave", (projectId: string) => {
      const room = `project:${projectId}`;
      socket.leave(room);
      console.log(`[socket] ${socket.id} left room ${room}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

/**
 * Emit an event to every client in a project room.
 */
export function emitToProject<E extends keyof ServerToClientEvents>(
  io: SocketIOServer,
  projectId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void {
  io.to(`project:${projectId}`).emit(event, ...args);
}

/* ================================================================== */
/*  CLIENT HOOK                                                        */
/* ================================================================== */

export interface UseSocketReturn {
  socket: ClientSocket | null;
  connected: boolean;
}

/**
 * React hook that manages a Socket.io client connection scoped to a
 * project room.
 *
 * Usage:
 *   const { socket, connected } = useSocket(projectId);
 *
 * The socket will automatically join the project room on connect and
 * leave + disconnect on unmount.
 */
export function useSocket(projectId: string | undefined): UseSocketReturn {
  const socketRef = useRef<ClientSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!projectId) return;

    const socketUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const socket = io(socketUrl, {
      path: "/api/socket",
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("project:join", projectId);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.emit("project:leave", projectId);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [projectId]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { socket: socketRef.current, connected };
}
