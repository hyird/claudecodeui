import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import {
  AuthApiError,
  authHeaders,
  clearStoredToken,
  fetchAuthStatus,
  isAuthExpiredError,
  login,
  logout,
  readStoredToken,
  register,
  storeToken,
} from './api';

const originalFetch = globalThis.fetch;
const originalLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;

let fetchCalls: Array<{ url: string; init?: RequestInit }>;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stubFetch(handler: (url: string, init?: RequestInit) => Response) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ url: String(input), init });
    return handler(String(input), init);
  }) as typeof fetch;
}

beforeEach(() => {
  fetchCalls = [];
  const store = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  } as Storage;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  (globalThis as { localStorage?: Storage }).localStorage = originalLocalStorage;
});

describe('token storage', () => {
  test('stores, reads and clears the token', () => {
    expect(readStoredToken()).toBe('');
    storeToken('tok-123');
    expect(readStoredToken()).toBe('tok-123');
    clearStoredToken();
    expect(readStoredToken()).toBe('');
  });
});

describe('authHeaders', () => {
  test('adds a bearer token and preserves existing headers', () => {
    const headers = authHeaders('tok', { 'x-test': 'y' });
    expect(headers.get('authorization')).toBe('Bearer tok');
    expect(headers.get('x-test')).toBe('y');
  });
});

describe('request timeout', () => {
  test('auth requests carry an abort signal', async () => {
    stubFetch((_url, init) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return jsonResponse(200, { needsSetup: false, isAuthenticated: true });
    });

    await expect(fetchAuthStatus()).resolves.toEqual({
      needsSetup: false,
      isAuthenticated: true,
    });
  });
});

describe('isAuthExpiredError', () => {
  test('is true only for a 401/403 AuthApiError', () => {
    expect(isAuthExpiredError(new AuthApiError(401, 'x'))).toBe(true);
    expect(isAuthExpiredError(new AuthApiError(403, 'x'))).toBe(true);
    expect(isAuthExpiredError(new AuthApiError(500, 'x'))).toBe(false);
    expect(isAuthExpiredError(new Error('nope'))).toBe(false);
  });
});

describe('register', () => {
  test('returns the session and posts to the register endpoint', async () => {
    stubFetch(() => jsonResponse(200, { success: true, user: { id: 1, username: 'alice' }, token: 'tok' }));
    const session = await register('alice', 'secret123');
    expect(session).toEqual({ token: 'tok', user: { id: 1, username: 'alice' } });
    expect(fetchCalls[0]?.url).toBe('/api/auth/register');
    expect(fetchCalls[0]?.init?.method).toBe('POST');
    expect(fetchCalls[0]?.init?.body).toBe(JSON.stringify({ username: 'alice', password: 'secret123' }));
  });

  test('localizes the single-user server error', async () => {
    stubFetch(() => jsonResponse(403, { error: 'User already exists. This is a single-user system.' }));
    try {
      await register('alice', 'secret123');
      throw new Error('register should have rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthApiError);
      expect((error as AuthApiError).status).toBe(403);
      expect((error as AuthApiError).message).toBe('已经创建过账户，此系统只允许一个账户。');
    }
  });
});

describe('login', () => {
  test('returns the session on success', async () => {
    stubFetch(() => jsonResponse(200, { success: true, user: { id: 1, username: 'alice' }, token: 'fresh' }));
    expect(await login('alice', 'secret123')).toEqual({ token: 'fresh', user: { id: 1, username: 'alice' } });
  });

  test('localizes an invalid-credentials error', async () => {
    stubFetch(() => jsonResponse(401, { error: 'Invalid username or password' }));
    try {
      await login('alice', 'wrong');
      throw new Error('login should have rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthApiError);
      expect((error as AuthApiError).status).toBe(401);
      expect((error as AuthApiError).message).toBe('用户名或密码无效。');
    }
  });
});

describe('logout', () => {
  test('never throws even when the request fails', async () => {
    globalThis.fetch = (async () => { throw new Error('network down'); }) as typeof fetch;
    await expect(logout('tok')).resolves.toBeUndefined();
  });
});
