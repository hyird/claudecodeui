import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import serializeXterm from '@xterm/addon-serialize';
import headlessXterm from '@xterm/headless';
import { Hono } from 'hono';
import pty from 'node-pty';
import { WebSocket, WebSocketServer } from 'ws';

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
import { sendTerminalOutput } from './terminal-ws-codec.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const PORT = Number(process.env.PORT || 3001);
const BUFFER_LIMIT = 5000;
const SAFE_ID = /^[a-zA-Z0-9_.:-]+$/;
const SPINNER_TITLE_PREFIX = /^[\u2800-\u28ff]+[\s:·.-]*/u;
const { SerializeAddon } = serializeXterm;
const { Terminal: HeadlessTerminal } = headlessXterm;

const app = new Hono();
const webSocketServerOptions = {
  noServer: true,
  perMessageDeflate: {
    threshold: 512,
    zlibDeflateOptions: { level: 3 },
  },
};
const authSessionWss = new WebSocketServer(webSocketServerOptions);
const terminalWss = new WebSocketServer(webSocketServerOptions);
const tabsWss = new WebSocketServer(webSocketServerOptions);

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

function parseMessage(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch {
    return null;
  }
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

function writeUpgradeRejection(socket, statusCode, message) {
  const body = `${message}\n`;
  socket.write(
    `HTTP/1.1 ${statusCode} ${message}\r\n` +
    'Connection: close\r\n' +
    'Content-Type: text/plain; charset=utf-8\r\n' +
    `Content-Length: ${Buffer.byteLength(body)}\r\n` +
    '\r\n' +
    body,
  );
  socket.destroy();
}

async function authenticateUpgrade(request, socket) {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const token = readBearerToken(request.headers.authorization) || readString(url.searchParams.get('token'));

  if (!token) {
    writeUpgradeRejection(socket, 401, 'Unauthorized');
    return null;
  }

  const user = await authenticateToken(token);
  if (!user) {
    writeUpgradeRejection(socket, 403, 'Forbidden');
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

  ws.on('close', () => {
    subscribers.delete(ws);
    if (subscribers.size === 0) {
      authSessionSubscribers.delete(tokenHash);
    }
  });
}

onSessionInvalidated((tokenHash) => {
  const subscribers = authSessionSubscribers.get(tokenHash);
  if (!subscribers) {
    return;
  }

  const payload = JSON.stringify({ type: 'session-invalidated' });
  for (const ws of subscribers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload, () => {
        ws.close(4001, 'Session invalidated');
      });
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

  return session.socket?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected';
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
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'tabs', state: serializeTabsState() }));
  }
}

function broadcastTabsState() {
  const payload = JSON.stringify({ type: 'tabs', state: serializeTabsState() });
  for (const ws of tabSubscribers) {
    if (ws.readyState === WebSocket.OPEN) {
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
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', message }));
  }
}

function handleTabsCommand(ws, message) {
  if (message?.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }));
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
    scrollback: BUFFER_LIMIT,
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
    session.terminalSnapshot = session.serializer.serialize();
  });
}

function resizeSession(session, cols, rows) {
  session.terminal.resize(cols, rows);
  session.pty.resize(cols, rows);
  session.terminalSnapshot = session.serializer.serialize();
}

function createSession(sessionId, options) {
  const cwd = resolveCwd(options.cwd);
  const shell = resolveShell();
  const terminalSnapshot = createTerminalSnapshot(options.cols, options.rows);
  const shellProcess = pty.spawn(shell.command, shell.args, {
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
    socket: null,
    closed: false,
  };

  shellProcess.onData((chunk) => {
    writeTerminalSnapshot(session, chunk);

    if (session.socket?.readyState === WebSocket.OPEN) {
      sendTerminalOutput(session.socket, chunk);
    }
  });

  shellProcess.onExit(({ exitCode, signal }) => {
    session.closed = true;
    const suffix = signal ? ` (${signal})` : '';
    const message = `\r\n\x1b[33mProcess exited with code ${exitCode}${suffix}\x1b[0m\r\n`;
    if (session.socket?.readyState === WebSocket.OPEN) {
      sendTerminalOutput(session.socket, message);
      session.socket.send(JSON.stringify({ type: 'exit', exitCode, signal }));
    }
    session.socket = null;
    sessions.delete(sessionId);
    broadcastTabsState();
  });

  sessions.set(sessionId, session);
  return session;
}

function attachSocket(ws, session) {
  const oldSocket = session.socket;
  session.socket = ws;
  if (oldSocket && oldSocket !== ws && oldSocket.readyState === WebSocket.OPEN) {
    oldSocket.close(1000, 'Replaced by newer terminal view');
  }

  ws.send(JSON.stringify({ type: 'ready', cwd: session.cwd, sessionId: session.id }));
  const terminalSnapshot = session.terminalSnapshot;
  if (terminalSnapshot) {
    sendTerminalOutput(ws, terminalSnapshot);
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
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid session id' }));
    return null;
  }

  const cols = readNumber(message.cols, 100);
  const rows = readNumber(message.rows, 30);
  const forceRestart = message.forceRestart === true;

  if (forceRestart) {
    closeSession(sessionId, false);
  }

  const session = sessions.get(sessionId) || createSession(sessionId, {
    cwd: message.cwd,
    cols,
    rows,
  });

  resizeSession(session, cols, rows);
  attachSocket(ws, session);
  return session;
}

terminalWss.on('connection', (ws) => {
  let activeSession = null;

  ws.on('message', (raw) => {
    const message = parseMessage(raw);
    if (!message || typeof message.type !== 'string') {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
      return;
    }

    if (message.type === 'init') {
      activeSession = handleInit(ws, message);
      return;
    }

    if (!activeSession) {
      ws.send(JSON.stringify({ type: 'error', message: 'Terminal is not initialized' }));
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
      activeSession = null;
      ws.close(1000, 'Terminal closed');
      return;
    }

    if (message.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    }
  });

  ws.on('close', () => {
    if (activeSession && sessions.get(activeSession.id) === activeSession) {
      detachSocket(activeSession, ws);
    }
  });
});

tabsWss.on('connection', (ws) => {
  tabSubscribers.add(ws);
  sendTabsState(ws);

  ws.on('message', (raw) => {
    handleTabsCommand(ws, parseMessage(raw));
  });

  ws.on('close', () => {
    tabSubscribers.delete(ws);
  });
});

authSessionWss.on('connection', (ws, request, auth) => {
  addAuthSessionSubscriber(auth.tokenHash, ws);
  ws.send(JSON.stringify({ type: 'session-active' }));

  ws.on('message', (raw) => {
    const message = parseMessage(raw);
    if (message?.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    }
  });
});

async function handleUpgrade(request, socket, head) {
  const auth = await authenticateUpgrade(request, socket);
  if (!auth) {
    return;
  }

  const { pathname } = auth.url;
  if (pathname === '/auth/session') {
    authSessionWss.handleUpgrade(request, socket, head, (ws) => {
      authSessionWss.emit('connection', ws, request, auth);
    });
    return;
  }

  if (pathname === '/terminal') {
    terminalWss.handleUpgrade(request, socket, head, (ws) => {
      terminalWss.emit('connection', ws, request);
    });
    return;
  }

  if (pathname === '/terminal/tabs') {
    tabsWss.handleUpgrade(request, socket, head, (ws) => {
      tabsWss.emit('connection', ws, request);
    });
    return;
  }

  socket.destroy();
}

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
  app.use('*', serveStatic({ root: distDir }));
  app.get('*', async (c) => c.html(await fs.promises.readFile(path.join(distDir, 'index.html'), 'utf8')));
}

const server = serve({
  fetch: app.fetch,
  port: PORT,
}, () => {
  console.log(`Terminal server listening on http://localhost:${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
  void handleUpgrade(request, socket, head).catch((error) => {
    console.error('WebSocket upgrade error:', error);
    socket.destroy();
  });
});
