'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'failed';

export function SocketStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onReconnectAttempt = () => setStatus('reconnecting');
    const onReconnectFailed = () => setStatus('failed');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect_failed', onReconnectFailed);

    if (socket.connected) setStatus('connected');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect_failed', onReconnectFailed);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {status === 'connected' && (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" title="Connected" />
        </span>
      )}
      {status === 'reconnecting' && (
        <span className="inline-flex items-center gap-1.5 text-primary">
          <span className="size-2 rounded-full bg-primary" />
          <span>Reconnecting…</span>
        </span>
      )}
      {status === 'failed' && (
        <span className="inline-flex items-center gap-1.5 text-destructive">
          <span className="size-2 rounded-full bg-destructive" />
          <span>Live updates paused</span>
        </span>
      )}
      {status === 'disconnected' && (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-muted-foreground" />
        </span>
      )}
    </div>
  );
}
