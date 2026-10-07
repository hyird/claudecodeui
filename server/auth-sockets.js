import { authenticateToken, hashSessionToken, onSessionInvalidated, readBearerToken } from './auth-store.js';
import { encodeAuthServerMessage } from './wire.js';
import { readString } from './terminal-validation.js';
import { WS_OPEN } from './terminal-output.js';

export function readOfferedSubprotocols(request) {
  return (request.headers.get('sec-websocket-protocol') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

// Browsers cannot set headers on a WebSocket handshake, so the client sends its session
// token as an `auth.<token>` subprotocol. That keeps the token out of the URL, and so out
// of reverse-proxy access logs, browser history and Referer headers. The query parameter
// and Authorization header stay supported for non-browser clients.
function readSubprotocolToken(offered) {
  const entry = offered.find((value) => value.startsWith('auth.'));
  return entry ? entry.slice('auth.'.length) : '';
}

// Mirrors the HTTP guard's status codes: a missing token is 401, while a token that no
// longer resolves to a live session (e.g. displaced by a newer login) is 403.
export async function authenticateUpgrade(request, offered) {
  const url = new URL(request.url);
  const token = readSubprotocolToken(offered)
    || readBearerToken(request.headers.get('authorization'))
    || readString(url.searchParams.get('token'));

  if (!token) {
    return { rejectStatus: 401, rejectMessage: 'Unauthorized' };
  }

  const user = await authenticateToken(token);
  if (!user) {
    return { rejectStatus: 403, rejectMessage: 'Forbidden' };
  }

  return { url, user, token, tokenHash: hashSessionToken(token) };
}

export function createAuthSocketSessions() {
  const authSessionSubscribers = new Map();

  function addAuthSessionSubscriber(tokenHash, ws) {
    let subscribers = authSessionSubscribers.get(tokenHash);
    if (!subscribers) {
      subscribers = new Set();
      authSessionSubscribers.set(tokenHash, subscribers);
    }
    subscribers.add(ws);
  }

  function removeAuthSessionSubscriber(tokenHash, ws) {
    const subscribers = authSessionSubscribers.get(tokenHash);
    if (!subscribers) {
      return;
    }
    subscribers.delete(ws);
    if (subscribers.size === 0) {
      authSessionSubscribers.delete(tokenHash);
    }
  }

  onSessionInvalidated((tokenHash) => {
    const subscribers = authSessionSubscribers.get(tokenHash);
    if (!subscribers) {
      return;
    }

    const payload = encodeAuthServerMessage({ type: 'session-invalidated' });
    for (const ws of subscribers) {
      if (ws.readyState === WS_OPEN) {
        if (ws.data.kind === 'auth') ws.send(payload);
        ws.close(4001, 'Session invalidated');
      } else {
        subscribers.delete(ws);
      }
    }
    authSessionSubscribers.delete(tokenHash);
  });

  return { addAuthSessionSubscriber, removeAuthSessionSubscriber };
}
