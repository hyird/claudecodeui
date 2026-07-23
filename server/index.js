import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// addon-serialize ships a real ESM build with named exports only, so it must be
// imported by name (a default import resolves to undefined under the bundler).
import { SerializeAddon } from '@xterm/addon-serialize';
import headlessXterm from '@xterm/headless';
import { Hono } from 'hono';
import { spawn as ptySpawn } from 'bun-pty';

import {
  authenticateToken,
  hashSessionToken,
  hasUsers,
  initializeAuthStore,
  loginUser,
  logoutToken,
  onSessionInvalidated,
  readBearerToken,
  registerUser,
  toAuthErrorResponse,
} from './auth-store.js';
import {
  decodeAuthClientMessage,
  decodeTabsClientMessage,
  decodeTerminalClientMessage,
  encodeAuthServerMessage,
  encodeTabsServerMessage,
  encodeTerminalServerMessage,
  sendTerminalOutput,
} from './wire.js';
import {
  createTerminalEventLog,
  getTerminalReplayPlan,
  recordTerminalEvent,
} from './terminal-stream.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
// In dev the server runs from server/index.js, so the built frontend is at <root>/dist.
// When bundled (bun build) the single server.js sits at the deploy root with dist/ beside
// it, so prefer a dist/ next to the running file and fall back to the repo layout.
const bundledDist = path.join(__dirname, 'dist');
const distDir = fs.existsSync(bundledDist) ? bundledDist : path.join(rootDir, 'dist');

const PORT = Number(process.env.PORT || 3001);
const SERVER_SNAPSHOT_SCROLLBACK = 1000;
const SAFE_ID = /^[a-zA-Z0-9_.:-]+$/;
const SPINNER_TITLE_PREFIX = /^[\u2800-\u28ff]+[\s:·.-]*/u;
const { Terminal: HeadlessTerminal } = headlessXterm;

const app = new Hono();
// Bun's ServerWebSocket.readyState uses the standard OPEN = 1.
const WS_OPEN = 1;
// WebSocket endpoints; each connection is tagged with its kind at upgrade time and
// dispatched through the single Bun.serve websocket handler via ws.data.
const WS_ROUTES = {
  '/auth/session': 'auth',
  '/terminal': 'terminal',
  '/terminal/tabs': 'tabs',
};

const sessions = new Map();
const authSessionSubscribers = new Map();
const tabSubscribers = new Set();
const tabsState = createInitialTabsState();

await initializeAuthStore();

function readString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

async function readJsonBody(c) {
  const contentType = c.req.header('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return {};
  }

  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function readRequestToken(c) {
  return readBearerToken(c.req.header('authorization')) || readString(c.req.query('token'));
}

async function requireAuth(c, next) {
  const token = readRequestToken(c);
  if (!token) {
    return c.json({ error: 'Access denied. No token provided.' }, 401);
  }

  const user = await authenticateToken(token);
  if (!user) {
    return c.json({ error: 'Invalid token' }, 403);
  }

  c.set('user', user);
  c.set('authToken', token);
  await next();
}

async function authenticateUpgrade(request) {
  const url = new URL(request.url);
  const token = readBearerToken(request.headers.get('authorization')) || readString(url.searchParams.get('token'));

  if (!token) {
    return null;
  }

  const user = await authenticateToken(token);
  if (!user) {
    return null;
  }

  return { url, user, token, tokenHash: hashSessionToken(token) };
}

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
      ws.send(payload);
      ws.close(4001, 'Session invalidated');
    } else {
      subscribers.delete(ws);
    }
  }
  authSessionSubscribers.delete(tokenHash);
});

function createTab(index) {
  const entropy = Math.random().toString(36).slice(2, 8);
  return {
    id: `terminal-${Date.now()}-${index}-${entropy}`,
    title: `\u7ec8\u7aef ${index}`,
  };
}

function createInitialTabsState() {
  const firstTab = createTab(1);
  return {
    tabs: [firstTab],
    activeId: firstTab.id,
    nextIndex: 2,
  };
}

function cleanTerminalTitle(title) {
  return readString(title)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .replace(SPINNER_TITLE_PREFIX, '')
    .trim()
    .slice(0, 80);
}

function getTabStatus(tabId) {
  const session = sessions.get(tabId);
  if (!session) {
    return 'disconnected';
  }

  if (session.closed) {
    return 'exited';
  }

  return session.socket?.readyState === WS_OPEN ? 'connected' : 'disconnected';
}

function serializeTabsState() {
  if (tabsState.tabs.length === 0) {
    const firstTab = createTab(1);
    tabsState.tabs.push(firstTab);
    tabsState.activeId = firstTab.id;
    tabsState.nextIndex = 2;
  }

  if (!tabsState.tabs.some((tab) => tab.id === tabsState.activeId)) {
    tabsState.activeId = tabsState.tabs[0].id;
  }

  return {
    tabs: tabsState.tabs.map((tab) => ({
      ...tab,
      title: cleanTerminalTitle(tab.title) || tab.title,
      status: getTabStatus(tab.id),
    })),
    activeId: tabsState.activeId,
    nextIndex: tabsState.nextIndex,
  };
}

function sendTabsState(ws) {
  if (ws.readyState === WS_OPEN) {
    ws.send(encodeTabsServerMessage({ type: 'tabs', state: serializeTabsState() }));
  }
}

function broadcastTabsState() {
  const payload = encodeTabsServerMessage({ type: 'tabs', state: serializeTabsState() });
  for (const ws of tabSubscribers) {
    if (ws.readyState === WS_OPEN) {
      ws.send(payload);
    } else {
      tabSubscribers.delete(ws);
    }
  }
}

function addTab() {
  const tab = createTab(tabsState.nextIndex);
  tabsState.tabs.push(tab);
  tabsState.activeId = tab.id;
  tabsState.nextIndex += 1;
  broadcastTabsState();
  return serializeTabsState();
}

function setActiveTab(activeId) {
  if (!SAFE_ID.test(activeId) || !tabsState.tabs.some((tab) => tab.id === activeId)) {
    return false;
  }

  tabsState.activeId = activeId;
  broadcastTabsState();
  return true;
}

function updateTabTitle(tabId, rawTitle) {
  if (!SAFE_ID.test(tabId)) {
    return false;
  }

  const title = cleanTerminalTitle(rawTitle);
  if (!title) {
    return false;
  }

  const tab = tabsState.tabs.find((candidate) => candidate.id === tabId);
  if (!tab) {
    return false;
  }

  if (tab.title !== title) {
    tab.title = title;
    broadcastTabsState();
  }

  return true;
}

function removeTab(tabId) {
  if (!SAFE_ID.test(tabId) || tabsState.tabs.length <= 1) {
    return false;
  }

  const closedIndex = tabsState.tabs.findIndex((tab) => tab.id === tabId);
  if (closedIndex < 0) {
    return false;
  }

  tabsState.tabs = tabsState.tabs.filter((tab) => tab.id !== tabId);
  if (tabsState.activeId === tabId) {
    tabsState.activeId = tabsState.tabs[Math.max(0, closedIndex - 1)]?.id ?? tabsState.tabs[0].id;
  }

  closeSession(tabId, false);
  broadcastTabsState();
  return true;
}

function restartTab(tabId) {
  if (!SAFE_ID.test(tabId)) {
    return false;
  }

  const tabIndex = tabsState.tabs.findIndex((tab) => tab.id === tabId);
  if (tabIndex < 0) {
    return false;
  }

  const oldTab = tabsState.tabs[tabIndex];
  const replacement = {
    ...createTab(tabsState.nextIndex),
    title: oldTab.title,
  };
  tabsState.tabs[tabIndex] = replacement;
  tabsState.activeId = replacement.id;
  tabsState.nextIndex += 1;
  closeSession(tabId, false);
  broadcastTabsState();
  return serializeTabsState();
}

function sendTabsError(ws, message) {
  if (ws.readyState === WS_OPEN) {
    ws.send(encodeTabsServerMessage({ type: 'error', message }));
  }
}

function handleTabsCommand(ws, message) {
  if (message?.type === 'ping') {
    ws.send(encodeTabsServerMessage({ type: 'pong' }));
    return;
  }

  if (message?.type === 'add-tab') {
    addTab();
    return;
  }

  if (message?.type === 'set-active') {
    const activeId = readString(message.activeId);
    if (!activeId || !setActiveTab(activeId)) {
      sendTabsError(ws, 'Invalid active tab');
    }
    return;
  }

  if (message?.type === 'update-title') {
    const tabId = readString(message.tabId);
    if (!tabId || !updateTabTitle(tabId, message.title)) {
      sendTabsError(ws, 'Invalid tab update');
    }
    return;
  }

  if (message?.type === 'restart-tab') {
    const tabId = readString(message.tabId);
    if (!tabId || !restartTab(tabId)) {
      sendTabsError(ws, 'Invalid tab restart');
    }
    return;
  }

  if (message?.type === 'close-tab') {
    const tabId = readString(message.tabId);
    if (!tabId || !removeTab(tabId)) {
      sendTabsError(ws, 'Invalid tab close');
    }
    return;
  }

  sendTabsError(ws, 'Unknown tabs command');
}

function resolveShell() {
  if (os.platform() === 'win32') {
    return {
      command: process.env.ComSpec || 'powershell.exe',
      args: process.env.ComSpec ? [] : ['-NoLogo'],
    };
  }

  return {
    command: process.env.SHELL || '/bin/bash',
    args: [],
  };
}

function resolveCwd(requestedCwd) {
  const fallback = os.homedir() || process.cwd();
  const candidate = readString(requestedCwd, fallback).trim() || fallback;
  const resolved = path.resolve(candidate);

  try {
    if (fs.statSync(resolved).isDirectory()) {
      return resolved;
    }
  } catch {
    // Fall through to home.
  }

  return fallback;
}

function createTerminalSnapshot(cols, rows) {
  const terminal = new HeadlessTerminal({
    allowProposedApi: true,
    cols,
    rows,
    scrollback: SERVER_SNAPSHOT_SCROLLBACK,
  });
  const serializer = new SerializeAddon();
  terminal.loadAddon(serializer);

  return {
    terminal,
    serializer,
    terminalSnapshot: '',
  };
}

function writeTerminalSnapshot(session, chunk) {
  session.terminal.write(chunk, () => {
    session.snapshotDirty = true;
  });
}

function readTerminalSnapshot(session) {
  if (session.snapshotDirty || !session.terminalSnapshot) {
    session.terminalSnapshot = session.serializer.serialize();
    session.snapshotDirty = false;
  }

  return session.terminalSnapshot;
}

function resizeSession(session, cols, rows) {
  session.terminal.resize(cols, rows);
  session.pty.resize(cols, rows);
  session.snapshotDirty = true;
  readTerminalSnapshot(session);
}

function sendTerminalEvent(ws, event) {
  if (ws?.readyState !== WS_OPEN) {
    return;
  }

  if (event.type === 'output') {
    sendTerminalOutput(ws, event.data, event.seq);
    return;
  }

  ws.send(encodeTerminalServerMessage(event));
}

function recordAndSendTerminalEvent(session, event) {
  const sequencedEvent = recordTerminalEvent(session.terminalEvents, event);
  sendTerminalEvent(session.socket, sequencedEvent);
  return sequencedEvent;
}

function createSession(sessionId, options) {
  const cwd = resolveCwd(options.cwd);
  const shell = resolveShell();
  const terminalSnapshot = createTerminalSnapshot(options.cols, options.rows);
  const shellProcess = ptySpawn(shell.command, shell.args, {
    name: 'xterm-256color',
    cols: options.cols,
    rows: options.rows,
    cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      FORCE_COLOR: '3',
    },
  });

  const session = {
    id: sessionId,
    cwd,
    pty: shellProcess,
    terminal: terminalSnapshot.terminal,
    serializer: terminalSnapshot.serializer,
    terminalSnapshot: terminalSnapshot.terminalSnapshot,
    snapshotDirty: false,
    socket: null,
    terminalEvents: createTerminalEventLog(),
    closed: false,
  };

  shellProcess.onData((chunk) => {
    writeTerminalSnapshot(session, chunk);

    recordAndSendTerminalEvent(session, { type: 'output', data: chunk });
  });

  shellProcess.onExit(({ exitCode, signal }) => {
    session.closed = true;
    const suffix = signal ? ` (${signal})` : '';
    const message = `\r\n\x1b[33mProcess exited with code ${exitCode}${suffix}\x1b[0m\r\n`;
    recordAndSendTerminalEvent(session, { type: 'output', data: message });
    recordAndSendTerminalEvent(session, { type: 'exit', exitCode, signal });
    session.socket = null;
    sessions.delete(sessionId);
    broadcastTabsState();
  });

  sessions.set(sessionId, session);
  return session;
}

function attachSocket(ws, session, lastSeq = 0) {
  const oldSocket = session.socket;
  session.socket = ws;
  if (oldSocket && oldSocket !== ws && oldSocket.readyState === WS_OPEN) {
    oldSocket.close(1000, 'Replaced by newer terminal view');
  }

  const replayPlan = getTerminalReplayPlan(session.terminalEvents, lastSeq);
  ws.send(encodeTerminalServerMessage({
    type: 'ready',
    cwd: session.cwd,
    sessionId: session.id,
    reset: replayPlan.mode === 'reset',
    gap: replayPlan.gap,
    lastSeq: replayPlan.lastSeq,
  }));

  if (replayPlan.mode === 'replay') {
    for (const event of replayPlan.events) {
      sendTerminalEvent(ws, event);
    }
  } else {
    const terminalSnapshot = readTerminalSnapshot(session);
    if (terminalSnapshot) {
      sendTerminalOutput(ws, terminalSnapshot);
    }
  }
  broadcastTabsState();
}

function detachSocket(session, ws) {
  if (session.socket === ws) {
    session.socket = null;
    broadcastTabsState();
  }
}

function closeSession(sessionId, broadcast = true) {
  const session = sessions.get(sessionId);
  if (!session) {
    return false;
  }

  session.socket?.close(1000, 'Terminal closed');
  session.socket = null;
  session.pty.kill();
  sessions.delete(sessionId);
  if (broadcast) {
    broadcastTabsState();
  }
  return true;
}

function handleInit(ws, message) {
  const sessionId = readString(message.sessionId);
  if (!sessionId || !SAFE_ID.test(sessionId)) {
    ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Invalid session id' }));
    return null;
  }

  const cols = readNumber(message.cols, 100);
  const rows = readNumber(message.rows, 30);
  const forceRestart = message.forceRestart === true;
  const lastSeq = readNumber(message.lastSeq, 0);

  if (forceRestart) {
    closeSession(sessionId, false);
  }

  const session = sessions.get(sessionId) || createSession(sessionId, {
    cwd: message.cwd,
    cols,
    rows,
  });

  resizeSession(session, cols, rows);
  attachSocket(ws, session, lastSeq);
  return session;
}

function handleTerminalMessage(ws, raw) {
  const message = decodeTerminalClientMessage(raw);
  if (!message || typeof message.type !== 'string') {
    ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Invalid message' }));
    return;
  }

  if (message.type === 'init') {
    ws.data.activeSession = handleInit(ws, message);
    return;
  }

  const activeSession = ws.data.activeSession;
  if (!activeSession) {
    ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Terminal is not initialized' }));
    return;
  }

  if (activeSession.socket !== ws) {
    ws.close(1000, 'Terminal connection replaced');
    return;
  }

  if (message.type === 'input') {
    activeSession.pty.write(readString(message.data));
    return;
  }

  if (message.type === 'resize') {
    resizeSession(activeSession, readNumber(message.cols, 100), readNumber(message.rows, 30));
    return;
  }

  if (message.type === 'close') {
    closeSession(activeSession.id);
    ws.data.activeSession = null;
    ws.close(1000, 'Terminal closed');
    return;
  }

  if (message.type === 'ping') {
    ws.send(encodeTerminalServerMessage({ type: 'pong' }));
  }
}

// One Bun.serve websocket handler for all three endpoints. ws.data.kind (set at upgrade)
// selects the behaviour; per-connection state lives on ws.data instead of a closure.
const websocketHandlers = {
  open(ws) {
    const { kind } = ws.data;
    if (kind === 'tabs') {
      tabSubscribers.add(ws);
      sendTabsState(ws);
      return;
    }
    if (kind === 'auth') {
      addAuthSessionSubscriber(ws.data.auth.tokenHash, ws);
      ws.send(encodeAuthServerMessage({ type: 'session-active' }));
    }
  },
  message(ws, raw) {
    const { kind } = ws.data;
    if (kind === 'terminal') {
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
  close(ws) {
    const { kind } = ws.data;
    if (kind === 'terminal') {
      const activeSession = ws.data.activeSession;
      if (activeSession && sessions.get(activeSession.id) === activeSession) {
        detachSocket(activeSession, ws);
      }
      return;
    }
    if (kind === 'tabs') {
      tabSubscribers.delete(ws);
      return;
    }
    if (kind === 'auth') {
      removeAuthSessionSubscriber(ws.data.auth.tokenHash, ws);
    }
  },
};

app.get('/api/health', (c) => c.json({ ok: true, sessions: sessions.size }));

app.get('/api/auth/status', async (c) => c.json({
  needsSetup: !(await hasUsers()),
  isAuthenticated: false,
}));

app.post('/api/auth/register', async (c) => {
  try {
    const body = await readJsonBody(c);
    return c.json(await registerUser(body.username, body.password));
  } catch (error) {
    const response = toAuthErrorResponse(error);
    console.error('Registration error:', error);
    return c.json(response.body, response.status);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const body = await readJsonBody(c);
    return c.json(await loginUser(body.username, body.password));
  } catch (error) {
    const response = toAuthErrorResponse(error);
    if (response.status >= 500) {
      console.error('Login error:', error);
    }
    return c.json(response.body, response.status);
  }
});

app.get('/api/auth/user', requireAuth, (c) => c.json({
  user: c.get('user'),
}));

app.post('/api/auth/logout', requireAuth, async (c) => {
  await logoutToken(c.get('authToken'));
  return c.json({ success: true, message: 'Logged out successfully' });
});

app.use('/api/terminal/*', requireAuth);

app.get('/api/terminal/tabs', (c) => c.json({ ok: true, state: serializeTabsState() }));

app.post('/api/terminal/tabs', (c) => c.json({ ok: true, state: addTab() }));

app.post('/api/terminal/tabs/active', async (c) => {
  const body = await readJsonBody(c);
  const activeId = readString(body.activeId);
  if (!activeId || !setActiveTab(activeId)) {
    return c.json({ ok: false, error: 'Invalid active tab' }, 400);
  }

  return c.json({ ok: true, state: serializeTabsState() });
});

app.patch('/api/terminal/tabs/:sessionId', async (c) => {
  const body = await readJsonBody(c);
  const sessionId = readString(c.req.param('sessionId'));
  if (!sessionId || !updateTabTitle(sessionId, body.title)) {
    return c.json({ ok: false, error: 'Invalid tab update' }, 400);
  }

  return c.json({ ok: true, state: serializeTabsState() });
});

app.post('/api/terminal/tabs/:sessionId/restart', (c) => {
  const sessionId = readString(c.req.param('sessionId'));
  const state = restartTab(sessionId);
  if (!state) {
    return c.json({ ok: false, error: 'Invalid tab restart' }, 400);
  }

  return c.json({ ok: true, state });
});

app.delete('/api/terminal/tabs/:sessionId', (c) => {
  const sessionId = readString(c.req.param('sessionId'));
  if (!sessionId || !removeTab(sessionId)) {
    return c.json({ ok: false, error: 'Invalid tab close' }, 400);
  }

  return c.json({ ok: true, state: serializeTabsState() });
});

app.post('/api/terminal/close', async (c) => {
  const body = await readJsonBody(c);
  const sessionId = readString(body.sessionId);
  if (!sessionId || !SAFE_ID.test(sessionId)) {
    return c.json({ ok: false, error: 'Invalid session id' }, 400);
  }

  return c.json({ ok: true, closed: closeSession(sessionId) });
});

if (fs.existsSync(distDir)) {
  const indexHtmlPath = path.join(distDir, 'index.html');
  // Single-file frontend: serve any real asset that survives inlining (e.g. logo.svg),
  // otherwise fall back to index.html so the SPA handles the route.
  app.get('*', async (c) => {
    const requestPath = decodeURIComponent(new URL(c.req.url).pathname);
    const candidate = path.normalize(path.join(distDir, requestPath));
    if (
      requestPath !== '/'
      && candidate.startsWith(distDir)
      && fs.existsSync(candidate)
      && fs.statSync(candidate).isFile()
    ) {
      return new Response(Bun.file(candidate));
    }
    return c.html(await fs.promises.readFile(indexHtmlPath, 'utf8'));
  });
}

const server = Bun.serve({
  port: PORT,
  // No idle timeout: terminal sockets are kept alive by the client heartbeat, and tab/
  // auth sockets are long-lived. Matches the previous `ws` server, which never idled out.
  idleTimeout: 0,
  async fetch(request, srv) {
    const kind = WS_ROUTES[new URL(request.url).pathname];
    if (kind) {
      const auth = await authenticateUpgrade(request);
      if (!auth) {
        return new Response('Unauthorized', { status: 401 });
      }
      const data = kind === 'terminal'
        ? { kind, activeSession: null }
        : kind === 'auth'
          ? { kind, auth }
          : { kind };
      if (srv.upgrade(request, { data })) {
        return undefined;
      }
      return new Response('WebSocket upgrade failed', { status: 400 });
    }
    return app.fetch(request);
  },
  websocket: websocketHandlers,
});

console.log(`Terminal server listening on http://localhost:${server.port}`);
