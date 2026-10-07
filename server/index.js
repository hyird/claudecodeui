import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { initializeAuthStore } from './auth-store.js';
import { createPersistentPtyBackend } from './persistent-pty.js';
import { registerAuthRoutes } from './auth-http.js';
import { createAuthSocketSessions } from './auth-sockets.js';
import { registerStaticRoutes } from './static-assets.js';
import { createTerminalWorkspaces } from './terminal-workspaces.js';
import { createTerminalSessions } from './terminal-sessions.js';
import { createWebSocketGateway } from './websocket-server.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const bundledDist = path.join(directory, 'dist');
const distDir = fs.existsSync(bundledDist) ? bundledDist : path.join(directory, '..', 'dist');

await initializeAuthStore();
const app = new Hono();
const sessions = new Map();
const persistentPty = createPersistentPtyBackend();
const workspaces = createTerminalWorkspaces({
  sessions, persistentPty,
  closeSession: (...args) => terminals.closeSession(...args),
});
const terminals = createTerminalSessions({ sessions, persistentPty, workspaces });
const authSessions = createAuthSocketSessions();

app.get('/api/health', (c) => c.json({
  ok: true,
  sessions: persistentPty.enabled ? persistentPty.count() : sessions.size,
  persistentSessions: persistentPty.enabled,
  persistentBackend: persistentPty.enabled ? 'bun-pty' : null,
}));
registerAuthRoutes(app, workspaces);
registerStaticRoutes(app, distDir);

const server = Bun.serve({
  port: Number(process.env.PORT || 3001),
  idleTimeout: 0,
  ...createWebSocketGateway({ app, sessions, workspaces, terminals, authSessions }),
});
console.log(`Terminal server listening on http://localhost:${server.port}`);
