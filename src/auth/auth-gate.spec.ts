import { describe, expect, test } from 'vitest';
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
  renewedTokens: string[];
  // Runs before a renewal answers, e.g. to let another page renew first.
  beforeRenew?: (token: string) => void;
  revokedTokens: Set<string>;
  announcedTokens: string[];
  // What another page of the browser would receive over the takeover channel.
  takeoverListener?: (token: string) => void;
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
        renewSession: async (token: string) => {
          api.beforeRenew?.(token);
          if (api.userError) throw api.userError;
          if (api.revokedTokens.has(token)) throw new FakeAuthError(403);
          api.revokedTokens.add(token);
          api.renewedTokens.push(token);
          return { token: `renewed-${api.renewedTokens.length}`, user };
        },
        isAuthExpiredError: (error: unknown) => error instanceof FakeAuthError && (error.status === 401 || error.status === 403),
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
      './session-channel': {
        announceSessionTakeover: (token: string) => { api.announcedTokens.push(token); },
        subscribeSessionTakeover: (listener: (token: string) => void) => {
          api.takeoverListener = listener;
          return () => { api.takeoverListener = undefined; };
        },
      },
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
  return {
    statusFailures: 0, storedToken: 'stored-token', statusCalls: 0, clearCalls: 0,
    renewedTokens: [], revokedTokens: new Set(), announcedTokens: [], ...overrides,
  };
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
    expect(gateStates(harness)).toEqual([{ mode: 'authenticated', token: 'renewed-1', user }]);
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

  test('a loading page replaces the stored token with a fresh session', async () => {
    const harness = createHarness();
    const api = authApi();
    const { cleanupBootstrap } = loadAuthGate(harness, api);
    await flushMicrotasks();

    expect(api.announcedTokens).toEqual(['stored-token']);
    expect(api.renewedTokens).toEqual(['stored-token']);
    expect(api.storedToken).toBe('renewed-1');
    expect(gateStates(harness)).toEqual([{ mode: 'authenticated', token: 'renewed-1', user }]);
    cleanupBootstrap();
  });

  test('a page that loses the renewal race takes over the token the other page stored', async () => {
    const harness = createHarness();
    const api = authApi({
      beforeRenew: (token) => {
        if (token !== 'stored-token') return;
        // The other tab renews the same stored token first and stores its result.
        api.revokedTokens.add('stored-token');
        api.storedToken = 'other-tab-token';
      },
    });
    const { cleanupBootstrap } = loadAuthGate(harness, api);
    await flushMicrotasks();

    expect(api.renewedTokens).toEqual(['other-tab-token']);
    expect(api.clearCalls).toBe(0);
    expect(gateStates(harness)).toEqual([{ mode: 'authenticated', token: 'renewed-1', user }]);
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
    const cleanups = [
      runEffect(harness, 'subscribeSessionTakeover'),
      runEffect(harness, 'createAuthSessionSocket'),
      runEffect(harness, 'validateCurrentToken'),
    ];
    return { harness, api, cleanup: () => { cleanups.forEach((cleanup) => cleanup()); gate.cleanupBootstrap(); } };
  }

  test('watches the session over a websocket instead of polling', async () => {
    const { harness, api, cleanup } = await authenticatedGate();
    expect(harness.sockets.map((socket) => socket.url)).toEqual(['/auth/session']);
    expect(harness.clock.pendingCount).toBe(0);

    emitServerMessage(harness, harness.sockets[0], { type: 'session-invalidated' });
    await flushMicrotasks();

    // The shared token is not removed here; the next page load drops it if it is dead.
    expect(api.clearCalls).toBe(0);
    expect(api.storedToken).toBe('renewed-1');
    expect(gateStates(harness).at(-1)).toEqual({ mode: 'login', token: '', user: null });
    expect(harness.sockets[0].closeCalls).toBe(1);
    cleanup();
  });

  test('a page displaced by another tab of the same browser keeps that tab token and explains why', async () => {
    const { harness, api, cleanup } = await authenticatedGate();
    api.storedToken = 'newer-tab-token';

    emitServerMessage(harness, harness.sockets[0], { type: 'session-invalidated' });
    await flushMicrotasks();

    expect(api.clearCalls).toBe(0);
    expect(api.storedToken).toBe('newer-tab-token');
    expect(gateStates(harness).at(-1)).toEqual({ mode: 'login', token: '', user: null });
    expect(harness.stateUpdates).toContain('此账户已在另一个浏览器标签页中打开，本页面已退出登录。');
    cleanup();
  });

  test('a takeover announced after the logout notice still explains why the page was logged out', async () => {
    const { harness, api, cleanup } = await authenticatedGate();
    const notice = '此账户已在另一个浏览器标签页中打开，本页面已退出登录。';

    // The server notice can beat the other tab storing its renewed token.
    emitServerMessage(harness, harness.sockets[0], { type: 'session-invalidated' });
    await flushMicrotasks();
    expect(harness.stateUpdates).not.toContain(notice);

    api.takeoverListener?.('renewed-1');
    expect(harness.stateUpdates.at(-1)).toBe(notice);
    cleanup();
  });

  test('an unrelated takeover announcement does not mark an ordinary logout', async () => {
    const { harness, api, cleanup } = await authenticatedGate();
    emitServerMessage(harness, harness.sockets[0], { type: 'session-invalidated' });
    await flushMicrotasks();

    api.takeoverListener?.('some-other-token');
    expect(harness.stateUpdates).not.toContain('此账户已在另一个浏览器标签页中打开，本页面已退出登录。');
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
