import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { after, before, test } from 'node:test';

import { WebSocket } from 'ws';
import packageJson from '../package.json' with { type: 'json' };

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

test('server runtime dependencies use Hono instead of Express', () => {
  assert.ok(packageJson.dependencies.hono, 'hono dependency is required');
  assert.ok(packageJson.dependencies['@hono/node-server'], '@hono/node-server dependency is required');
  assert.ok(packageJson.dependencies.typeorm, 'typeorm dependency is required');
  assert.ok(packageJson.dependencies['better-sqlite3'], 'better-sqlite3 SQLite driver is required');
  assert.ok(packageJson.dependencies['reflect-metadata'], 'reflect-metadata dependency is required by TypeORM');
  assert.equal(packageJson.dependencies.express, undefined, 'express must be removed');
  assert.equal(packageJson.devDependencies['@types/express'], undefined, '@types/express must be removed');
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

  const displacedTabsSocket = new WebSocket(`${wsBaseUrl}/terminal/tabs?token=${encodeURIComponent(registrationToken)}`);
  const displacedTabsSocketError = await new Promise((resolve) => {
    displacedTabsSocket.once('error', resolve);
    displacedTabsSocket.once('open', () => {
      displacedTabsSocket.close();
      resolve(new Error('Unexpected displaced websocket open'));
    });
  });
  assert.match(String(displacedTabsSocketError.message), /403/);

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
  const unauthenticated = new WebSocket(`${wsBaseUrl}/terminal/tabs`);
  const unauthorizedError = await new Promise((resolve) => {
    unauthenticated.once('error', resolve);
    unauthenticated.once('open', () => resolve(new Error('Unexpected unauthenticated websocket open')));
  });
  assert.match(String(unauthorizedError.message), /401/);

  const authenticated = new WebSocket(`${wsBaseUrl}/terminal/tabs?token=${encodeURIComponent(authToken)}`);
  const firstMessage = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for tabs websocket message')), 5000);
    authenticated.once('message', (raw) => {
      clearTimeout(timeout);
      resolve(JSON.parse(String(raw)));
    });
    authenticated.once('error', reject);
  });
  assert.equal(firstMessage.type, 'tabs');
  assert.ok(Array.isArray(firstMessage.state.tabs));
  authenticated.close();
});

test('SPA fallback serves the built index for client routes when dist exists', async () => {
  const response = await fetch(`${baseUrl}/not-a-real-api-route`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<div id="root"><\/div>/);
});
