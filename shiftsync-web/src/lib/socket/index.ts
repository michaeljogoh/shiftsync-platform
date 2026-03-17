'use client';

import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/stores/auth.store';

let socket: Socket | null = null;

const SOCKET_URL =
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
    : 'http://localhost:3000';

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token: useAuthStore.getState().accessToken },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function closeSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function useSocket(): Socket {
  return getSocket();
}
