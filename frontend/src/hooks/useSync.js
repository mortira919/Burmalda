import { useEffect } from 'react';
import { io } from 'socket.io-client';

// Single shared socket instance for the whole app session
let _socket = null;

function getSocket() {
  if (!_socket) {
    // Connect through vite proxy (same origin in dev, same server in prod)
    _socket = io(window.location.origin, { path: '/socket.io' });
  }
  return _socket;
}

/**
 * Call `callback` whenever any user on the server makes a data mutation.
 * Pass a stable callback (useCallback with []) to avoid re-subscribing on every render.
 */
export function useSync(callback) {
  useEffect(() => {
    const s = getSocket();
    s.on('data:changed', callback);
    return () => { s.off('data:changed', callback); };
  }, [callback]);
}
