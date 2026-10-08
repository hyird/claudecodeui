import { decodeAuthClientMessage, decodeTabsClientMessage, encodeAuthServerMessage } from './wire.js';
import { readOfferedSubprotocols, authenticateUpgrade } from './auth-sockets.js';
import { websocketWritable } from './terminal-output.js';

const WS_ROUTES = {
  '/auth/session': 'auth',
  '/terminal': 'terminal',
  '/terminal/output': 'terminal-output',
  '/terminal/input': 'terminal-input',
  '/terminal/tabs': 'tabs',
};
// Marker subprotocol echoed back on a successful upgrade.
const WS_SUBPROTOCOL = 'cloudcli.v1';

export function createWebSocketGateway({ app, sessions, workspaces, terminals, authSessions }) {
  const { workspaceFor, sendTabsState, handleTabsCommand } = workspaces;
  const { handleTerminalMessage, detachSocket } = terminals;
  const { addAuthSessionSubscriber, removeAuthSessionSubscriber } = authSessions;

  const websocketHandlers = {
    open(ws) {
      const { kind } = ws.data;
      addAuthSessionSubscriber(ws.data.auth.tokenHash, ws);
      if (kind === 'tabs') {
        ws.data.workspace.tabSubscribers.add(ws);
        sendTabsState(ws);
        return;
      }
      if (kind === 'auth') {
        ws.send(encodeAuthServerMessage({ type: 'session-active' }));
      }
    },
    message(ws, raw) {
      if (!websocketWritable(ws)) return;
      const { kind } = ws.data;
      if (kind === 'terminal' || kind === 'terminal-output' || kind === 'terminal-input') {
        handleTerminalMessage(ws, raw);
        return;
      }
      if (kind === 'tabs') {
        handleTabsCommand(ws, decodeTabsClientMessage(raw));
        return;
      }
      if (kind === 'auth') {
        const message = decodeAuthClientMessage(raw);
        if (message?.type === 'ping') {
          ws.send(encodeAuthServerMessage({ type: 'pong' }));
        }
      }
    },
    drain(ws) {
      if (ws.getBufferedAmount() === 0) ws.data.snapshotBufferAllowance = 0;
    },
    close(ws) {
      const { kind } = ws.data;
      removeAuthSessionSubscriber(ws.data.auth.tokenHash, ws);
      if (kind === 'terminal' || kind === 'terminal-output' || kind === 'terminal-input') {
        const activeSession = ws.data.activeSession;
        if (activeSession && sessions.get(activeSession.id) === activeSession) {
          detachSocket(activeSession, ws);
        }
        return;
      }
      if (kind === 'tabs') {
        ws.data.workspace.tabSubscribers.delete(ws);
        return;
      }
    },
  };

  return {
  async fetch(request, srv) {
      const kind = WS_ROUTES[new URL(request.url).pathname];
      if (kind) {
        const offered = readOfferedSubprotocols(request);
        const auth = await authenticateUpgrade(request, offered);
        if (auth.rejectStatus) {
          return new Response(auth.rejectMessage, { status: auth.rejectStatus });
        }
        const data = {
          kind,
          auth,
          workspace: workspaceFor(auth.user.id),
          ...(kind.startsWith('terminal') ? { activeSession: null } : {}),
        };
        // Only select a subprotocol the client actually offered — selecting one it did
        // not offer makes the browser fail the handshake.
        const headers = offered.includes(WS_SUBPROTOCOL)
          ? { 'sec-websocket-protocol': WS_SUBPROTOCOL }
          : undefined;
        if (srv.upgrade(request, { data, headers })) {
          return undefined;
        }
        return new Response('WebSocket upgrade failed', { status: 400 });
      }
      return app.fetch(request);
    },
  websocket: websocketHandlers,
};
}
