// Builds a WebSocket URL for a backend path.
//
// In dev, Vite's http-proxy cannot relay a WebSocket upgrade to the Bun.serve
// backend (the handshake never completes), so we connect straight to the
// backend port instead of going through the Vite origin. In production the app
// is served by the backend itself, so the same origin (window.location.host)
// is correct and no bypass is needed.
export function websocketUrl(path: string, token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.DEV ? `${window.location.hostname}:3001` : window.location.host;
  const url = new URL(`${protocol}//${host}${path}`);
  url.searchParams.set('token', token);
  return url.toString();
}
