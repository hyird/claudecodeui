import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { after, before, test } from 'node:test';

import { WebSocket } from 'ws';
import { cloudcli } from '../proto/messages.js';

const { TabsClientMessage, TabsServerMessage, AuthServerMessage } = cloudcli;

function toUint8(raw) {
  return raw instanceof Uint8Array ? raw : new Uint8Array(raw);
}

// The test is a browser-side client of the server, so it encodes client frames
// and decodes server frames straight off the shared protobuf schema.
function encodeTabsClientMessage(message) {
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
        nextIndex: state.nextIndex,
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

// Bun's built-in `ws` client does not surface the rejected handshake's HTTP
// status in its error, so read the status line straight off the socket.
function wsHandshakeStatus(pathname, token) {
  return new Promise((resolve, reject) => {
    const target = new URL(baseUrl);
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    const socket = net.connect(Number(target.port), target.hostname, () => {
      socket.write(
        `GET ${pathname}${query} HTTP/1.1\r\n` +
        `Host: ${target.host}\r\n` +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
        'Sec-WebSocket-Version: 13\r\n' +
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

  throw lastError ?? new Error('Timed out waiting for health endpoint');
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

before(async () => {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  wsBaseUrl = `ws://127.0.0.1:${port}`;
  testDbPath = path.join(os.tmpdir(), `cloudcli-auth-${process.pid}-${Date.now()}.sqlite`);
  serverProcess = spawn(process.execPath, ['server/index.js'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      CLOUDCLI_DB_PATH: testDbPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

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

  const blockedTabs = await fetch(`${baseUrl}/api/terminal/tabs`);
  assert.equal(blockedTabs.status, 401);
  assert.deepEqual(await blockedTabs.json(), { error: 'Access denied. No token provided.' });

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
    user: { id: registered.user.id, username: TEST_USERNAME },
  });

  const authSessionSocket = new WebSocket(`${wsBaseUrl}/auth/session?token=${encodeURIComponent(registrationToken)}`);
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

  const displacedTabs = await fetch(`${baseUrl}/api/terminal/tabs`, {
    headers: { authorization: `Bearer ${registrationToken}` },
  });
  assert.equal(displacedTabs.status, 403);
  assert.deepEqual(await displacedTabs.json(), { error: 'Invalid token' });

  assert.equal(await wsHandshakeStatus('/terminal/tabs', registrationToken), 403);

  const activeUser = await fetch(`${baseUrl}/api/auth/user`, {
    headers: { authorization: `Bearer ${authToken}` },
  });
  assert.equal(activeUser.status, 200);
});

test('terminal tab HTTP API preserves existing behavior', async () => {
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const headers = { authorization: `Bearer ${authToken}` };
  const tabs = await fetch(`${baseUrl}/api/terminal/tabs`, { headers });
  assert.equal(tabs.status, 200);
  const initialState = await tabs.json();
  assert.equal(initialState.ok, true);
  assert.equal(initialState.state.tabs.length, 1);

  const added = await fetch(`${baseUrl}/api/terminal/tabs`, { method: 'POST', headers });
  assert.equal(added.status, 200);
  const addedState = await added.json();
  assert.equal(addedState.ok, true);
  assert.equal(addedState.state.tabs.length, 2);

  const invalidActive = await fetch(`${baseUrl}/api/terminal/tabs/active`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ activeId: '../bad' }),
  });
  assert.equal(invalidActive.status, 400);
  assert.deepEqual(await invalidActive.json(), { ok: false, error: 'Invalid active tab' });
});

test('terminal tab WebSocket requires and accepts auth token', async () => {
  assert.equal(await wsHandshakeStatus('/terminal/tabs'), 401);

  const authenticated = new WebSocket(`${wsBaseUrl}/terminal/tabs?token=${encodeURIComponent(authToken)}`);
  const firstMessage = await readTabsWebSocketMessage(
    authenticated,
    (message) => message.type === 'tabs',
    'tabs websocket message',
  );
  assert.equal(firstMessage.type, 'tabs');
  assert.ok(Array.isArray(firstMessage.state.tabs));
  const tabId = firstMessage.state.tabs[0].id;

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

test('SPA fallback serves the built index for client routes when dist exists', async () => {
  const response = await fetch(`${baseUrl}/not-a-real-api-route`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<div id="root"><\/div>/);
});
