import { describe, expect, test } from 'bun:test';
import {
  createHarness, emitServerMessage, flushMicrotasks, loadModule, runEffect, type Harness,
} from '../terminal/test-support/component-harness';
import type { AuthGateProps, AuthUser } from './types';

class FakeAuthError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

const user: AuthUser = { id: 1, username: 'tester', role: 'admin' };

type AuthApiFake = {
  statusFailures: number;
  userError?: FakeAuthError;
  storedToken: string;
  statusCalls: number;
  clearCalls: number;
};

type GateState = { mode: string; token: string; user: AuthUser | null };

function loadAuthGate(harness: Harness, api: AuthApiFake) {
  const stub = () => null;
  const AuthGate = loadModule(new URL('./AuthGate.tsx', import.meta.url), harness, {
    overrides: {
      './api': {
        fetchAuthStatus: async () => {
          api.statusCalls += 1;
          if (api.statusCalls <= api.statusFailures) throw new Error('network down');
          return { needsSetup: false };
        },
        fetchCurrentUser: async () => {
          if (api.userError) throw api.userError;
          return user;
        },
        isAuthExpiredError: (error: unknown) => error instanceof FakeAuthError && error.status === 401,
        readStoredToken: () => api.storedToken,
        clearStoredToken: () => { api.clearCalls += 1; api.storedToken = ''; },
        storeToken: (token: string) => { api.storedToken = token; },
        login: async () => ({ token: 'login-token', user }),
        register: async () => ({ token: 'register-token', user }),
        logout: async () => {},
      },
      './AuthLoadingScreen': { default: stub },
      './LoginForm': { default: stub },
      './SetupForm': { default: stub },
    },
  }).default as (props: AuthGateProps) => unknown;
  const props: AuthGateProps = { children: () => null };
  const render = () => {
    harness.hooks.beginRender();
    return AuthGate(props);
  };
  AuthGate(props);
  const cleanupBootstrap = runEffect(harness, 'loadAuthState');
  return { render, cleanupBootstrap };
}

function authApi(overrides: Partial<AuthApiFake> = {}): AuthApiFake {
  return { statusFailures: 0, storedToken: 'stored-token', statusCalls: 0, clearCalls: 0, ...overrides };
}

function gateStates(harness: Harness) {
  return harness.stateUpdates.filter((value): value is GateState => (
    typeof value === 'object' && value !== null && 'mode' in value
  ));
}

describe('auth bootstrap', () => {
  test('transient failures retry with backoff and keep the stored token', async () => {
    const harness = createHarness();
    const api = authApi({ statusFailures: 2 });
    const { cleanupBootstrap } = loadAuthGate(harness, api);
    await flushMicrotasks();
    expect(api.statusCalls).toBe(1);

    harness.clock.advance(249);
    await flushMicrotasks();
    expect(api.statusCalls).toBe(1);
    harness.clock.advance(1);
    await flushMicrotasks();
    expect(api.statusCalls).toBe(2);
    harness.clock.advance(750);
    await flushMicrotasks();

    expect(api.statusCalls).toBe(3);
    expect(api.clearCalls).toBe(0);
    expect(gateStates(harness)).toEqual([{ mode: 'authenticated', token: 'stored-token', user }]);
    cleanupBootstrap();
  });

  test('exhausted retries show the login form without deleting a possibly valid token', async () => {
    const harness = createHarness();
    const api = authApi({ statusFailures: Number.POSITIVE_INFINITY });
    const { cleanupBootstrap } = loadAuthGate(harness, api);
    for (const delay of [0, 250, 750, 2000]) {
      harness.clock.advance(delay);
      await flushMicrotasks();
    }

    expect(api.statusCalls).toBe(4);
    expect(api.clearCalls).toBe(0);
    expect(api.storedToken).toBe('stored-token');
    expect(gateStates(harness)).toEqual([{ mode: 'login', token: '', user: null }]);
    cleanupBootstrap();
  });

  test('an expired stored token is cleared and the login form shown', async () => {
    const harness = createHarness();
    const api = authApi({ userError: new FakeAuthError(401) });
    const { cleanupBootstrap } = loadAuthGate(harness, api);
    await flushMicrotasks();

    expect(api.clearCalls).toBe(1);
    expect(gateStates(harness)).toEqual([{ mode: 'login', token: '', user: null }]);
    cleanupBootstrap();
  });
});

describe('auth session monitor', () => {
  async function authenticatedGate() {
    const harness = createHarness();
    const api = authApi();
    const gate = loadAuthGate(harness, api);
    await flushMicrotasks();
    gate.render();
    const cleanups = [runEffect(harness, 'createAuthSessionSocket'), runEffect(harness, 'validateCurrentToken')];
    return { harness, api, cleanup: () => { cleanups.forEach((cleanup) => cleanup()); gate.cleanupBootstrap(); } };
  }

  test('watches the session over a websocket instead of polling', async () => {
    const { harness, api, cleanup } = await authenticatedGate();
    expect(harness.sockets.map((socket) => socket.url)).toEqual(['/auth/session']);
    expect(harness.clock.pendingCount).toBe(0);

    emitServerMessage(harness, harness.sockets[0], { type: 'session-invalidated' });
    await flushMicrotasks();

    expect(api.clearCalls).toBe(1);
    expect(gateStates(harness).at(-1)).toEqual({ mode: 'login', token: '', user: null });
    expect(harness.sockets[0].closeCalls).toBe(1);
    cleanup();
  });

  test('a dropped session socket reconnects without logging out', async () => {
    const { harness, api, cleanup } = await authenticatedGate();
    harness.sockets[0].close();
    harness.clock.advance(5000);

    expect(harness.sockets).toHaveLength(2);
    expect(api.clearCalls).toBe(0);
    cleanup();
  });
});
