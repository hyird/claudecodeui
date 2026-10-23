// Builds a WebSocket URL for a backend path.
//
// Development connects directly to the backend port; production uses the same
// origin as the served page.
export function websocketUrl(path: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.DEV ? `${window.location.hostname}:3001` : window.location.host;
  return `${protocol}//${host}${path}`;
}

// Marker subprotocol the server echoes back on a successful upgrade.
export const WS_SUBPROTOCOL = 'cloudcli.v1';

// Opens an authenticated socket.
//
// The browser WebSocket API cannot set request headers, so the session token
// rides in Sec-WebSocket-Protocol rather than the query string. A token in the
// URL leaks into reverse-proxy access logs, browser history and Referer headers;
// a subprotocol value stays in the handshake.
export function openAuthenticatedSocket(path: string, token: string): WebSocket {
  return new WebSocket(websocketUrl(path), [WS_SUBPROTOCOL, `auth.${token}`]);
}
