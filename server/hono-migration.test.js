import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

import { WebSocket } from 'ws';
import { cloudcli } from '../proto/messages.js';

const NODE_BIN = process.execPath;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const {
  TabsClientMessage,
  TabsServerMessage,
  AuthServerMessage,
  TerminalClientMessage,
  TerminalServerMessage,
} = cloudcli;

function toUint8(raw) {
  return raw instanceof Uint8Array ? raw : new Uint8Array(raw);
}

// The test is a browser-side client of the server, so it encodes client frames
// and decodes server frames straight off the shared protobuf schema.
function encodeTabsClientMessage(message) {
  if (message.type === 'add-tab') {
    return TabsClientMessage.encode({ addTab: {} }).finish();
  }
  if (message.type === 'update-title') {
    return TabsClientMessage.encode({ updateTitle: { tabId: message.tabId, title: message.title } }).finish();
  }
  throw new Error(`Unsupported tabs client message in test: ${message.type}`);
}

function decodeTabsServerMessage(raw) {
  const message = TabsServerMessage.decode(toUint8(raw));
  if (message.body === 'tabs') {
    const state = message.tabs;
    return {
      type: 'tabs',
      state: {
        tabs: (state.tabs ?? []).map((tab) => ({ id: tab.id, title: tab.title, status: tab.status })),
        activeId: state.activeId,
      },
    };
  }
  if (message.body === 'error') {
    return { type: 'error', message: message.error.message };
  }
  if (message.body === 'pong') {
    return { type: 'pong' };
  }
  return null;
}

function decodeAuthServerMessage(raw) {
  const message = AuthServerMessage.decode(toUint8(raw));
  if (message.body === 'sessionActive') {
    return { type: 'session-active' };
  }
  if (message.body === 'sessionInvalidated') {
    return { type: 'session-invalidated' };
  }
  if (message.body === 'pong') {
    return { type: 'pong' };
  }
  return null;
}

let serverProcess;
let serverOutput = '';
let baseUrl;
let wsBaseUrl;
let testDbPath;
let authToken;

const TEST_USERNAME = 'alice';
const TEST_PASSWORD = 'secret123';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port);
          return;
        }
        reject(new Error('Unable to allocate a test port'));
      });
    });
  });
}

// Read rejected upgrade status directly without depending on client error formatting.
function wsHandshakeStatus(pathname, token, protocols) {
  return new Promise((resolve, reject) => {
    const target = new URL(baseUrl);
    protocols ??= token ? ['cloudcli.v1', 'auth.' + token] : undefined;
    const protocolHeader = protocols ? `Sec-WebSocket-Protocol: ${protocols.join(', ')}\r\n` : '';
    const socket = net.connect(Number(target.port), target.hostname, () => {
      socket.write(
        `GET ${pathname} HTTP/1.1\r\n` +
        `Host: ${target.host}\r\n` +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
        'Sec-WebSocket-Version: 13\r\n' +
        protocolHeader +
        '\r\n',
      );
    });
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const match = buffer.match(/^HTTP\/1\.1 (\d{3})/);
      if (match) {
        socket.destroy();
        resolve(Number(match[1]));
      }
    });
    socket.once('error', reject);
    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error('Timed out waiting for websocket handshake status'));
    });
  });
}

// Node's fetch transparently decodes compressed bodies, so read the raw response off
// the socket to assert what actually travelled over the wire.
function rawGet(pathname, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(baseUrl);
    const headerLines = Object.entries(extraHeaders)
      .map(([name, value]) => `${name}: ${value}\r\n`)
      .join('');
    const socket = net.connect(Number(target.port), target.hostname, () => {
      socket.write(
        `GET ${pathname} HTTP/1.1\r\n` +
        `Host: ${target.host}\r\n` +
        'Connection: close\r\n' +
        headerLines +
        '\r\n',
      );
    });

    const chunks = [];
    socket.on('data', (chunk) => chunks.push(chunk));
    socket.on('end', () => {
      const raw = Buffer.concat(chunks);
      const separator = raw.indexOf('\r\n\r\n');
      const [statusLine, ...headerRows] = raw.subarray(0, separator).toString('utf8').split('\r\n');
      const headers = Object.fromEntries(headerRows.map((row) => {
        const index = row.indexOf(':');
        return [row.slice(0, index).toLowerCase().trim(), row.slice(index + 1).trim()];
      }));
      resolve({
        status: Number(statusLine.split(' ')[1]),
        headers,
        bodyLength: raw.length - separator - 4,
      });
    });
    socket.once('error', reject);
    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error('Timed out reading the raw response'));
    });
  });
}

async function waitForHealth(url) {
  const deadline = Date.now() + 10_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `Timed out waiting for the Node server on ${url}.\n`
    + `Last error: ${lastError?.message ?? 'none'}\n`
    + `Server output:\n${serverOutput || '(none)'}`,
  );
}

function readTabsWebSocketMessage(ws, predicate, description) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${description}`)), 5000);
    const onMessage = (raw) => {
      const message = decodeTabsServerMessage(raw);
      if (message && (!predicate || predicate(message))) {
        clearTimeout(timeout);
        ws.off('message', onMessage);
        ws.off('error', onError);
        resolve(message);
      }
    };
    const onError = (error) => {
      clearTimeout(timeout);
      ws.off('message', onMessage);
      reject(error);
    };
    ws.on('message', onMessage);
    ws.once('error', onError);
  });
}

async function createTestTab() {
  const tabsSocket = new WebSocket(`${wsBaseUrl}/terminal/tabs`, ['cloudcli.v1', `auth.${authToken}`]);
  const initial = await readTabsWebSocketMessage(tabsSocket, (message) => message.type === 'tabs', 'initial test tabs');
  const updated = readTabsWebSocketMessage(
    tabsSocket,
    (message) => message.type === 'tabs' && message.state.tabs.length === initial.state.tabs.length + 1,
    'new test tab',
  );
  tabsSocket.send(encodeTabsClientMessage({ type: 'add-tab' }));
  const tabId = (await updated).state.activeId;
  tabsSocket.close();
  return tabId;
}

function readTerminalWebSocketMessage(ws, predicate, description) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${description}`)), 5000);
    const onMessage = (raw) => {
      const message = TerminalServerMessage.decode(toUint8(raw));
      if (!predicate || predicate(message)) {
        clearTimeout(timeout);
        ws.off('message', onMessage);
        ws.off('error', onError);
        resolve(message);
      } else if (message.body === 'error') {
        clearTimeout(timeout);
        ws.off('message', onMessage);
        ws.off('error', onError);
        reject(new Error(`Terminal rejected ${description}: ${message.error.message}`));
      }
    };
    const onError = (error) => {
      clearTimeout(timeout);
      ws.off('message', onMessage);
      reject(error);
    };
    ws.on('message', onMessage);
    ws.once('error', onError);
  });
}

before(async () => {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  wsBaseUrl = `ws://127.0.0.1:${port}`;
  testDbPath = path.join(os.tmpdir(), `cloudcli-auth-${process.pid}-${Date.now()}.sqlite`);
  serverProcess = spawn(NODE_BIN, [process.env.CLOUDCLI_TEST_SERVER_ENTRY || 'server/index.js'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: {
      ...process.env,
      PORT: String(port),
      CLOUDCLI_DB_PATH: testDbPath,
      // This suite drives ordinary PTYs even from a shell configured for the service.
      CLOUDCLI_PERSIST_TERMINALS: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Keep the server's own output so a failed boot reports the real cause instead of
  // just a health-check timeout.
  serverProcess.once('error', (error) => {
    serverOutput += `failed to spawn "${NODE_BIN}": ${error.message}\n`;
  });
  serverProcess.stdout.on('data', (chunk) => { serverOutput += chunk.toString('utf8'); });
  serverProcess.stderr.on('data', (chunk) => { serverOutput += chunk.toString('utf8'); });

  await waitForHealth(baseUrl);
});

after(async () => {
  if (serverProcess && !serverProcess.killed) {
    const exitPromise = new Promise((resolve) => {
      serverProcess.once('exit', resolve);
    });
    serverProcess.kill();
    await Promise.race([
      exitPromise,
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  }

  if (testDbPath && fs.existsSync(testDbPath)) {
    fs.rmSync(testDbPath, { force: true });
  }
});

test('auth API creates the first user in SQLite and returns tokens for login', async () => {
  const initialStatus = await fetch(`${baseUrl}/api/auth/status`);
  assert.equal(initialStatus.status, 200);
  assert.deepEqual(await initialStatus.json(), {
    needsSetup: true,
    isAuthenticated: false,
  });

  const register = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD }),
  });
  assert.equal(register.status, 200);
  const registered = await register.json();
  assert.equal(registered.success, true);
  assert.equal(registered.user.username, TEST_USERNAME);
  assert.equal(typeof registered.token, 'string');
  assert.ok(registered.token.length > 20);
  assert.ok(fs.existsSync(testDbPath), 'SQLite database file should be created');
  const registrationToken = registered.token;
  authToken = registrationToken;

  const statusAfterSetup = await fetch(`${baseUrl}/api/auth/status`);
  assert.equal(statusAfterSetup.status, 200);
  assert.deepEqual(await statusAfterSetup.json(), {
    needsSetup: false,
    isAuthenticated: false,
  });

  const currentUser = await fetch(`${baseUrl}/api/auth/user`, {
    headers: { authorization: `Bearer ${authToken}` },
  });
  assert.equal(currentUser.status, 200);
  assert.deepEqual(await currentUser.json(), {
    user: { id: registered.user.id, username: TEST_USERNAME, role: 'admin' },
  });

  const authSessionSocket = new WebSocket(`${wsBaseUrl}/auth/session`, ['cloudcli.v1', `auth.${registrationToken}`]);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for auth session websocket')), 5000);
    authSessionSocket.once('open', () => {
      clearTimeout(timeout);
      resolve();
    });
    authSessionSocket.once('error', reject);
  });
  const invalidationNotice = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for session invalidation notice')), 5000);
    authSessionSocket.on('message', (raw) => {
      const message = decodeAuthServerMessage(raw);
      if (message?.type === 'session-invalidated') {
        clearTimeout(timeout);
        resolve(message);
      }
    });
    authSessionSocket.once('error', reject);
  });

  const duplicateRegister = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'another', password: 'secret456' }),
  });
  assert.equal(duplicateRegister.status, 403);

  const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: TEST_USERNAME, password: 'wrong-password' }),
  });
  assert.equal(badLogin.status, 401);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD }),
  });
  assert.equal(login.status, 200);
  const loggedIn = await login.json();
  assert.equal(loggedIn.success, true);
  assert.equal(loggedIn.user.username, TEST_USERNAME);
  assert.equal(typeof loggedIn.token, 'string');
  assert.notEqual(loggedIn.token, registrationToken);
  authToken = loggedIn.token;
  assert.deepEqual(await invalidationNotice, { type: 'session-invalidated' });

  const displacedUser = await fetch(`${baseUrl}/api/auth/user`, {
    headers: { authorization: `Bearer ${registrationToken}` },
  });
  assert.equal(displacedUser.status, 403);
  assert.deepEqual(await displacedUser.json(), { error: 'Invalid token' });

  assert.equal(await wsHandshakeStatus('/terminal/tabs', registrationToken), 403);

  const activeUser = await fetch(`${baseUrl}/api/auth/user`, {
    headers: { authorization: `Bearer ${authToken}` },
  });
  assert.equal(activeUser.status, 200);
});

test('a page opened in another browser tab renews the session and logs out the previous page', async () => {
  const previousToken = authToken;
  const previousPage = new WebSocket(`${wsBaseUrl}/auth/session`, ['cloudcli.v1', `auth.${previousToken}`]);
  const invalidated = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for the previous page to be logged out')), 5000);
    previousPage.on('message', (raw) => {
      if (decodeAuthServerMessage(raw)?.type === 'session-invalidated') {
        clearTimeout(timeout);
        resolve();
      }
    });
    previousPage.once('error', reject);
  });
  await new Promise((resolve, reject) => {
    previousPage.once('open', resolve);
    previousPage.once('error', reject);
  });

  const renewal = await fetch(`${baseUrl}/api/auth/session`, {
    method: 'POST',
    headers: { authorization: `Bearer ${previousToken}` },
  });
  assert.equal(renewal.status, 200);
  const renewed = await renewal.json();
  assert.equal(renewed.user.username, TEST_USERNAME);
  assert.notEqual(renewed.token, previousToken);
  authToken = renewed.token;
  await invalidated;
  previousPage.close();

  const replayed = await fetch(`${baseUrl}/api/auth/session`, {
    method: 'POST',
    headers: { authorization: `Bearer ${previousToken}` },
  });
  assert.equal(replayed.status, 403);
  assert.equal((await fetch(`${baseUrl}/api/auth/session`, { method: 'POST' })).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/auth/user`, {
    headers: { authorization: `Bearer ${authToken}` },
  })).status, 200);
});

test('collaborator accounts have isolated tabs and cannot open another user terminal', async () => {
  const ownerHeaders = { authorization: `Bearer ${authToken}` };
  const created = await fetch(`${baseUrl}/api/auth/users`, {
    method: 'POST',
    headers: { ...ownerHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'teammate', password: 'secret456' }),
  });
  assert.equal(created.status, 201);
  const collaborator = (await created.json()).user;
  assert.equal(collaborator.role, 'member');

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'teammate', password: 'secret456' }),
  });
  assert.equal(login.status, 200);
  const memberToken = (await login.json()).token;
  const forbidden = await fetch(`${baseUrl}/api/auth/users`, {
    headers: { authorization: `Bearer ${memberToken}` },
  });
  assert.equal(forbidden.status, 403);

  const ownerTabs = new WebSocket(`${wsBaseUrl}/terminal/tabs`, ['cloudcli.v1', `auth.${authToken}`]);
  const memberTabs = new WebSocket(`${wsBaseUrl}/terminal/tabs`, ['cloudcli.v1', `auth.${memberToken}`]);
  const ownerState = await readTabsWebSocketMessage(ownerTabs, (message) => message.type === 'tabs', 'owner tabs');
  const memberState = await readTabsWebSocketMessage(memberTabs, (message) => message.type === 'tabs', 'member tabs');
  const ownerTabId = ownerState.state.tabs[0].id;
  assert.notEqual(ownerTabId, memberState.state.tabs[0].id);

  const foreignTerminal = new WebSocket(`${wsBaseUrl}/terminal`, ['cloudcli.v1', `auth.${memberToken}`]);
  await new Promise((resolve, reject) => { foreignTerminal.once('open', resolve); foreignTerminal.once('error', reject); });
  const denied = readTerminalWebSocketMessage(
    foreignTerminal,
    (message) => message.body === 'error',
    'foreign terminal denial',
  );
  foreignTerminal.send(TerminalClientMessage.encode({ init: {
    sessionId: ownerTabId, inputStreamId: randomUUID(), cols: 80, rows: 24,
  } }).finish());
  assert.equal((await denied).error.message, 'Terminal is not available');
  foreignTerminal.close();
  ownerTabs.close();
  const memberDisconnected = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for removed user tabs to close')), 5000);
    memberTabs.once('close', (code) => { clearTimeout(timeout); resolve(code); });
    memberTabs.once('error', reject);
  });

  const removed = await fetch(`${baseUrl}/api/auth/users/${collaborator.id}`, {
    method: 'DELETE', headers: ownerHeaders,
  });
  assert.equal(removed.status, 200);
  assert.equal(await memberDisconnected, 4001);
  const invalidated = await fetch(`${baseUrl}/api/auth/user`, {
    headers: { authorization: `Bearer ${memberToken}` },
  });
  assert.equal(invalidated.status, 403);
  assert.equal((await fetch(`${baseUrl}/api/auth/user`, { headers: ownerHeaders })).status, 200);
});

test('terminal tab WebSocket requires auth and generates UUID ids', async () => {
  assert.equal(await wsHandshakeStatus('/terminal/tabs'), 401);

  const authenticated = new WebSocket(`${wsBaseUrl}/terminal/tabs`, ['cloudcli.v1', `auth.${authToken}`]);
  const firstMessage = await readTabsWebSocketMessage(
    authenticated,
    (message) => message.type === 'tabs',
    'tabs websocket message',
  );
  assert.equal(firstMessage.type, 'tabs');
  assert.ok(Array.isArray(firstMessage.state.tabs));
  const tabId = firstMessage.state.tabs[0].id;
  assert.match(tabId, UUID_V4_PATTERN);

  authenticated.send(encodeTabsClientMessage({ type: 'add-tab' }));
  const addedState = await readTabsWebSocketMessage(
    authenticated,
    (message) => message.type === 'tabs' && message.state.tabs.length === 2,
    'tabs websocket add-tab update',
  );
  const addedTabId = addedState.state.tabs[1].id;
  assert.match(addedTabId, UUID_V4_PATTERN);
  assert.notEqual(addedTabId, tabId);

  authenticated.send(encodeTabsClientMessage({ type: 'update-title', tabId, title: '\u2819 Ruvia' }));
  const titleUpdate = await readTabsWebSocketMessage(
    authenticated,
    (message) => (
      message.type === 'tabs' &&
      message.state.tabs.some((tab) => tab.id === tabId && tab.title === 'Ruvia')
    ),
    'tabs websocket title update',
  );
  assert.equal(titleUpdate.state.tabs.find((tab) => tab.id === tabId).title, 'Ruvia');

  authenticated.close();
});

test('inactive PTYs report background and preserve their exited state', async () => {
  const tabsSocket = new WebSocket(`${wsBaseUrl}/terminal/tabs`, ['cloudcli.v1', `auth.${authToken}`]);
  let tabsMessage = await readTabsWebSocketMessage(
    tabsSocket,
    (message) => message.type === 'tabs',
    'initial tabs state for background status',
  );

  if (tabsMessage.state.tabs.length < 2) {
    tabsSocket.send(encodeTabsClientMessage({ type: 'add-tab' }));
    tabsMessage = await readTabsWebSocketMessage(
      tabsSocket,
      (message) => message.type === 'tabs' && message.state.tabs.length === 2,
      'second tab for background status',
    );
  }

  const inactiveTab = tabsMessage.state.tabs.find((tab) => tab.id !== tabsMessage.state.activeId);
  assert.ok(inactiveTab, 'expected an inactive terminal tab');

  const connectedState = readTabsWebSocketMessage(
    tabsSocket,
    (message) => (
      message.type === 'tabs'
      && message.state.tabs.some((tab) => tab.id === inactiveTab.id && tab.status === 'connected')
    ),
    'connected inactive PTY status',
  );
  const terminalSocket = new WebSocket(`${wsBaseUrl}/terminal`, ['cloudcli.v1', `auth.${authToken}`]);
  const terminalReady = readTerminalWebSocketMessage(
    terminalSocket,
    (message) => message.body === 'ready',
    'inactive PTY ready message',
  );
  terminalSocket.on('open', () => {
    terminalSocket.send(TerminalClientMessage.encode({
      init: {
        sessionId: inactiveTab.id,
        cols: 120,
        rows: 40,
        cwd: '',
        forceRestart: true,
        inputStreamId: randomUUID(),
      },
    }).finish());
  });
  await terminalReady;
  await connectedState;

  const backgroundState = readTabsWebSocketMessage(
    tabsSocket,
    (message) => (
      message.type === 'tabs'
      && message.state.tabs.some((tab) => tab.id === inactiveTab.id && tab.status === 'background')
    ),
    'background PTY status after detaching its viewer',
  );
  terminalSocket.close();
  const backgroundMessage = await backgroundState;
  assert.equal(
    backgroundMessage.state.tabs.find((tab) => tab.id === inactiveTab.id).status,
    'background',
  );

  const reconnectedState = readTabsWebSocketMessage(
    tabsSocket,
    (message) => (
      message.type === 'tabs'
      && message.state.tabs.some((tab) => tab.id === inactiveTab.id && tab.status === 'connected')
    ),
    'reattached PTY status',
  );
  const exitSocket = new WebSocket(`${wsBaseUrl}/terminal`, ['cloudcli.v1', `auth.${authToken}`]);
  const exitReady = readTerminalWebSocketMessage(
    exitSocket,
    (message) => message.body === 'ready',
    'reattached PTY ready message',
  );
  exitSocket.on('open', () => {
    exitSocket.send(TerminalClientMessage.encode({
      init: {
        sessionId: inactiveTab.id,
        cols: 120,
        rows: 40,
        cwd: '',
        forceRestart: false,
        inputStreamId: randomUUID(),
      },
    }).finish());
  });
  await exitReady;
  await reconnectedState;

  const exitedState = readTabsWebSocketMessage(
    tabsSocket,
    (message) => (
      message.type === 'tabs'
      && message.state.tabs.some((tab) => tab.id === inactiveTab.id && tab.status === 'exited')
    ),
    'exited PTY status',
  );
  exitSocket.send(TerminalClientMessage.encode({
    input: { data: 'exit\r', inputSeq: 1 },
  }).finish());
  const exitedMessage = await exitedState;
  assert.equal(
    exitedMessage.state.tabs.find((tab) => tab.id === inactiveTab.id).status,
    'exited',
  );

  exitSocket.close();
  tabsSocket.close();
});

test('terminal WebSocket rejects legacy non-UUID session ids', async () => {
  const socket = new WebSocket(`${wsBaseUrl}/terminal`, ['cloudcli.v1', `auth.${authToken}`]);
  const rejection = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for legacy id rejection')), 5000);
    socket.once('error', reject);
    socket.on('message', (raw) => {
      const message = TerminalServerMessage.decode(toUint8(raw));
      if (message.body === 'error') {
        clearTimeout(timeout);
        resolve(message.error.message);
      }
    });
  });

  socket.on('open', () => {
    socket.send(TerminalClientMessage.encode({
      init: {
        sessionId: 'terminal-1785067387023-1-2ziyq2',
        cols: 120,
        rows: 40,
        cwd: '',
        forceRestart: false,
      },
    }).finish());
  });

  assert.equal(await rejection, 'Invalid session id');
  socket.close();
});

test('one terminal socket carries raw output and deduplicated input acknowledgements', async (t) => {
  const tabId = await createTestTab();
  const ws = new WebSocket(wsBaseUrl + '/terminal', ['cloudcli.v1', 'auth.' + authToken]);
  t.after(() => ws.close());
  const ready = readTerminalWebSocketMessage(ws, message => message.body === 'ready', 'terminal ready');
  ws.on('open', () => ws.send(TerminalClientMessage.encode({ init: {
    sessionId: tabId, inputStreamId: randomUUID(), cols: 100, rows: 30,
  } }).finish()));
  await ready;
  const ack = readTerminalWebSocketMessage(ws, message => message.body === 'inputAck', 'input acknowledgement');
  const output = readTerminalWebSocketMessage(ws, message => message.body === 'output' && message.seq > 0, 'live output');
  ws.send(TerminalClientMessage.encode({ input: { data: 'echo SINGLE_WS_OK\\r', inputSeq: 1 } }).finish());
  assert.equal((await ack).inputAck.inputSeq, 1);
  assert.equal((await output).output.compressed, false);
  const duplicate = readTerminalWebSocketMessage(ws, message => message.body === 'inputAck', 'duplicate acknowledgement');
  ws.send(TerminalClientMessage.encode({ input: { data: 'echo SINGLE_WS_OK\\r', inputSeq: 1 } }).finish());
  assert.equal((await duplicate).inputAck.inputSeq, 1);
  ws.send(TerminalClientMessage.encode({ close: {} }).finish());
});

test('terminal input is acknowledged and duplicate delivery is ignored', async () => {
  const sessionId = await createTestTab();
  const socket = new WebSocket(`${wsBaseUrl}/terminal`, ['cloudcli.v1', `auth.${authToken}`]);
  const inputStreamId = randomUUID();
  let output = '';
  let markerResolve;
  const markerSeen = new Promise((resolve) => { markerResolve = resolve; });

  socket.on('message', (raw) => {
    const message = TerminalServerMessage.decode(toUint8(raw));
    if (message.body !== 'output') {
      return;
    }
    const payload = message.output.data ?? new Uint8Array(0);
    output += (message.output.compressed ? inflateSync(payload) : Buffer.from(payload)).toString('utf8');
    if (output.includes('__RELIABLE_INPUT__')) {
      markerResolve();
    }
  });

  const ready = readTerminalWebSocketMessage(
    socket,
    (message) => message.body === 'ready',
    'terminal ready message',
  );
  socket.on('open', () => {
    socket.send(TerminalClientMessage.encode({
      init: {
        sessionId,
        cols: 120,
        rows: 40,
        cwd: '',
        forceRestart: true,
        inputStreamId,
      },
    }).finish());
  });
  await ready;

  // Build the marker at runtime so it does not appear in the command echoed
  // by the PTY. The server's ready frame can arrive before the shell has printed its
  // first prompt; counting a literal marker in the input would then race shell startup
  // and make a correctly ignored resend look like a second execution.
  const markerScript = "process.stdout.write(['__RELIABLE','_INPUT__'].join('')+String.fromCharCode(10))";
  const command = `node -e ${JSON.stringify(markerScript)}\r`;
  const firstAck = readTerminalWebSocketMessage(
    socket,
    (message) => message.body === 'inputAck' && message.inputAck.inputSeq === 1,
    'first terminal input acknowledgement',
  );
  socket.send(TerminalClientMessage.encode({
    input: { data: command, inputSeq: 1 },
  }).finish());
  await firstAck;
  await markerSeen;
  await new Promise((resolve) => setTimeout(resolve, 100));
  const occurrencesBeforeDuplicate = output.split('__RELIABLE_INPUT__').length - 1;

  const duplicateAck = readTerminalWebSocketMessage(
    socket,
    (message) => message.body === 'inputAck' && message.inputAck.inputSeq === 1,
    'duplicate terminal input acknowledgement',
  );
  socket.send(TerminalClientMessage.encode({
    input: { data: command, inputSeq: 1 },
  }).finish());
  await duplicateAck;
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert.equal(
    output.split('__RELIABLE_INPUT__').length - 1,
    occurrencesBeforeDuplicate,
    'a resent input frame must not execute twice',
  );

  socket.send(TerminalClientMessage.encode({ close: {} }).finish());
  socket.close();
});

test('terminal session generations preserve reconnect input and identify a rebuilt PTY', async (t) => {
  const sessionId = await createTestTab();
  const inputStreamId = randomUUID();
  const sockets = [];
  t.after(() => sockets.forEach((socket) => socket.terminate()));

  async function attach(forceRestart = false) {
    const socket = new WebSocket(`${wsBaseUrl}/terminal`, ['cloudcli.v1', `auth.${authToken}`]);
    sockets.push(socket);
    const ready = readTerminalWebSocketMessage(socket, (message) => message.body === 'ready', 'generation ready');
    socket.on('open', () => {
      socket.send(TerminalClientMessage.encode({
        init: { sessionId, inputStreamId, forceRestart, cols: 80, rows: 24 },
      }).finish());
    });
    return { socket, ready: (await ready).ready };
  }

  async function sendInput(socket, inputSeq) {
    const acknowledgement = readTerminalWebSocketMessage(
      socket,
      (message) => message.body === 'inputAck' && message.inputAck.inputSeq === inputSeq,
      `generation input acknowledgement ${inputSeq}`,
    );
    // A newline is valid for cmd, PowerShell and POSIX shells alike.
    socket.send(TerminalClientMessage.encode({ input: { data: '\r', inputSeq } }).finish());
    await acknowledgement;
  }

  const first = await attach();
  assert.match(first.ready.sessionGeneration, UUID_V4_PATTERN);
  await sendInput(first.socket, 1);
  const resumed = await attach();
  assert.equal(resumed.ready.sessionGeneration, first.ready.sessionGeneration);
  await sendInput(resumed.socket, 2);

  const rebuilt = await attach(true);
  assert.notEqual(rebuilt.ready.sessionGeneration, resumed.ready.sessionGeneration);
  await sendInput(rebuilt.socket, 1);
  rebuilt.socket.send(TerminalClientMessage.encode({ close: {} }).finish());
});

test('SPA fallback serves the built index for client routes when dist exists', async () => {
  const response = await fetch(`${baseUrl}/not-a-real-api-route`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<div id="root"><\/div>/);
});

test('missing files, unknown API routes and malformed paths are 404s rather than the SPA', async () => {
  for (const pathname of ['/assets/missing.js', '/fonts/missing.woff2', '/api/not-a-route', '/api']) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 404, pathname);
    assert.doesNotMatch(await response.text(), /<div id="root">/, pathname);
  }
  const malformed = await rawGet('/%E0%A4%A');
  assert.equal(malformed.status, 404);
});

test('websocket auth accepts the token as a subprotocol so it stays out of the URL', async () => {
  const socket = new WebSocket(`${wsBaseUrl}/terminal/tabs`, ['cloudcli.v1', `auth.${authToken}`]);
  // The server pushes the tabs state as soon as the socket opens, so the listener has
  // to be attached before awaiting anything or that first frame is missed.
  const state = await readTabsWebSocketMessage(
    socket,
    (message) => message.type === 'tabs',
    'tabs state over a subprotocol-authenticated socket',
  );
  assert.equal(state.type, 'tabs');

  // The server must select the marker protocol, never echo the token back.
  assert.equal(socket.protocol, 'cloudcli.v1');
  socket.close();

  // A bad token is rejected; the token never needs to appear in the URL.
  assert.equal(
    await wsHandshakeStatus('/terminal/tabs', null, ['cloudcli.v1', 'auth.not-a-real-token']),
    403,
  );
});

test('URL query credentials are rejected for HTTP and WebSocket requests', async () => {
  const query = `?token=${encodeURIComponent(authToken)}`;
  const response = await fetch(`${baseUrl}/api/auth/user${query}`);
  assert.equal(response.status, 401);
  assert.equal(await wsHandshakeStatus(`/terminal/tabs${query}`, null), 401);
});

test('the built frontend is served compressed and revalidates with an ETag', async () => {
  const identity = await rawGet('/', { 'Accept-Encoding': 'identity' });
  assert.equal(identity.status, 200);
  assert.equal(identity.headers['content-encoding'], undefined);
  assert.equal(identity.headers.vary, 'Accept-Encoding');
  const etag = identity.headers.etag;
  assert.ok(etag, 'expected an ETag on the served index');

  const gzipped = await rawGet('/', { 'Accept-Encoding': 'gzip' });
  assert.equal(gzipped.status, 200);
  assert.equal(gzipped.headers['content-encoding'], 'gzip');
  assert.ok(
    gzipped.bodyLength < identity.bodyLength / 2,
    `expected gzip to at least halve the payload, got ${gzipped.bodyLength} vs ${identity.bodyLength}`,
  );

  const brotli = await rawGet('/', { 'Accept-Encoding': 'br, gzip' });
  assert.equal(brotli.headers['content-encoding'], 'br');
  assert.ok(brotli.bodyLength <= gzipped.bodyLength, 'brotli should not be larger than gzip');

  // A repeat visit must revalidate to an empty 304 rather than re-sending the bundle.
  const revalidated = await rawGet('/', { 'If-None-Match': etag });
  assert.equal(revalidated.status, 304);
  assert.equal(revalidated.bodyLength, 0);
  // Proxies may weaken the validator or send several of them.
  for (const header of [`W/${etag}`, `"stale", ${etag}`, '*']) {
    assert.equal((await rawGet('/', { 'If-None-Match': header })).status, 304, header);
  }
  assert.equal((await rawGet('/', { 'If-None-Match': '"stale"' })).status, 200);
});

test('bundled Nerd Font and Chinese fonts are cached WOFF2 assets without double compression', async () => {
  for (const style of ['Regular', 'Bold']) {
    const fontUrl = `${baseUrl}/fonts/MapleMonoNFCN-${style}-v7.9-base.woff2`;
    const response = await fetch(fontUrl, {
      headers: { 'Accept-Encoding': 'br, gzip' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'font/woff2');
    assert.match(response.headers.get('cache-control'), /max-age=31536000, immutable/);
    assert.equal(response.headers.get('content-encoding'), null);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(Buffer.from(bytes.subarray(0, 4)).toString(), 'wOF2');
    const cached = await fetch(fontUrl, {
      headers: { 'If-None-Match': response.headers.get('etag') },
    });
    assert.equal(cached.status, 304);
  }
});

// Generate the sequence with Node instead of the Unix-only `seq` utility so this
// end-to-end test exercises the server's real default shell on Windows too. The
// marker is assembled at runtime so the shell's command echo cannot satisfy the
// completion check before the generated output has arrived.
const BULK_OUTPUT_SCRIPT = "let s='';"
  + "for(let i=1;i<=200000;i++)s+=i+String.fromCharCode(10);"
  + "process.stdout.write(s+['__DO','NE__'].join('')+String.fromCharCode(10))";
const BULK_OUTPUT_COMMAND = `node -e ${JSON.stringify(BULK_OUTPUT_SCRIPT)}\r`;
// 9*2 + 90*3 + 900*4 + 9000*5 + 90000*6 + 100001*7: digits plus one LF per line.
// A PTY may expand LF to CRLF, so this is a portable lower bound rather than an exact
// transport length.
const SEQ_OUTPUT_MIN_CHARS = 1288895;
const TERMINAL_OUTPUT_MAX_FRAME_BYTES = 16 * 1024;

test('bulk terminal output stays responsive with bounded frames and no lost bytes', async () => {
  // Drive a real shell through a real socket: every byte must arrive in order,
  // frames stay bounded, and a control request remains responsive during the flood.
  const sessionId = await createTestTab();
  const socket = new WebSocket(`${wsBaseUrl}/terminal`, ['cloudcli.v1', `auth.${authToken}`]);
  const inputStreamId = randomUUID();

  let outputFrames = 0;
  let largestOutputFrame = 0;
  let text = '';
  let ready = false;
  let pingAt = null;
  let pongAt = null;
  let complete = false;
  let holdingCredit = true;
  let holdTimer;
  let latestSeq = 0;
  let heldBytes;
  let bytesBeforeResume;

  const done = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(
        `Timed out; ${outputFrames} frames, ${text.length} chars so far; `
        + `tail ${JSON.stringify(text.slice(-200))}`,
      )),
      30000,
    );
    socket.on('error', (error) => { clearTimeout(timeout); reject(error); });
    socket.on('message', (raw) => {
      const message = TerminalServerMessage.decode(toUint8(raw));
      if (message.body === 'pong' && pingAt !== null) {
        pongAt = performance.now();
        if (complete) { clearTimeout(timeout); resolve(); }
        return;
      }
      if (message.body === 'ready' && !ready) {
        ready = true;
        socket.send(TerminalClientMessage.encode({
          input: { data: BULK_OUTPUT_COMMAND, inputSeq: 1 },
        }).finish());
        return;
      }
      if (message.body !== 'output') {
        return;
      }
      outputFrames += 1;
      const payload = message.output.data ?? new Uint8Array(0);
      const decoded = message.output.compressed ? inflateSync(payload) : Buffer.from(payload);
      largestOutputFrame = Math.max(largestOutputFrame, decoded.byteLength);
      text += decoded.toString('utf8');
      latestSeq = message.seq;
      if (!holdingCredit) socket.send(TerminalClientMessage.encode({ outputAck: { seq: latestSeq } }).finish());
      if (holdingCredit && !holdTimer && text.length >= 256 * 1024) {
        // Deliberately stop consuming: the real PTY must stop producing output.
        // Give already-read native pipe data time to arrive, then observe a plateau.
        holdTimer = setTimeout(() => {
          heldBytes = text.length;
          setTimeout(() => {
            bytesBeforeResume = text.length;
            holdingCredit = false;
            socket.send(TerminalClientMessage.encode({ outputAck: { seq: latestSeq } }).finish());
          }, 50);
        }, 100);
      }
      if (pingAt === null && text.length >= 256 * 1024) {
        pingAt = performance.now();
        socket.send(TerminalClientMessage.encode({ ping: {} }).finish());
      }
      if (text.includes('__DONE__\r\n')) {
        complete = true;
        if (pongAt !== null) { clearTimeout(timeout); resolve(); }
      }
    });
  });

  socket.on('open', () => {
    socket.send(TerminalClientMessage.encode({
      init: {
        sessionId,
        cols: 120,
        rows: 40,
        cwd: '',
        forceRestart: true,
        inputStreamId,
      },
    }).finish());
  });

  await done;

  // Nothing may be dropped or reordered by the batching: every line of the sequence
  // must be present, in order, with the full byte count.
  const normalizedText = text.replaceAll('\r\n', '\n');
  assert.ok(
    normalizedText.includes('\n200000\n__DONE__'),
    'expected the last line of the sequence followed by the completion marker',
  );
  assert.ok(
    normalizedText.indexOf('\n100000\n') < normalizedText.indexOf('\n200000\n'),
    'sequence lines must arrive in order',
  );
  assert.ok(
    text.length >= SEQ_OUTPUT_MIN_CHARS,
    `expected at least ${SEQ_OUTPUT_MIN_CHARS} chars of output, got ${text.length}`,
  );
  assert.ok(
    largestOutputFrame <= TERMINAL_OUTPUT_MAX_FRAME_BYTES,
    `expected output frames no larger than ${TERMINAL_OUTPUT_MAX_FRAME_BYTES} bytes, `
      + `got ${largestOutputFrame}`,
  );

  const expected = Array.from({ length: 200000 }, (_, i) => String(i + 1)).join('\n');
  assert.ok(normalizedText.includes(`${expected}\n__DONE__`), 'every sequence line must arrive intact and in order');
  assert.ok(pongAt !== null && pingAt !== null && pongAt - pingAt < 250,
    `control traffic stalled during bulk output: ${pongAt - pingAt} ms`);
  assert.equal(bytesBeforeResume, heldBytes, 'the PTY must pause until consumption credit returns');
  assert.ok(heldBytes < SEQ_OUTPUT_MIN_CHARS, 'the producer must not finish while credit is withheld');

  socket.send(TerminalClientMessage.encode({ close: {} }).finish());
  socket.close();
});
