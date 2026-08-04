import type { AuthSession, AuthUser } from './types';

export const AUTH_TOKEN_STORAGE_KEY = 'auth-token';
const AUTH_REQUEST_TIMEOUT_MS = 4000;
const AUTH_REQUEST_TIMEOUT_MESSAGE = '认证服务响应超时，请稍后重试。';

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

type AuthStatusPayload = {
  needsSetup: boolean;
  isAuthenticated: boolean;
};

type AuthResponsePayload = {
  success?: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
  message?: string;
};

export class AuthApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

export function isAuthExpiredError(error: unknown) {
  return error instanceof AuthApiError && (error.status === 401 || error.status === 403);
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function resolveApiErrorMessage(payload: ApiErrorPayload | null, fallback: string) {
  const message = payload?.error ?? payload?.message ?? fallback;
  return localizeAuthError(message);
}

function localizeAuthError(message: string) {
  const messages: Record<string, string> = {
    'Username and password are required': '请填写用户名和密码。',
    'Username must be at least 3 characters, password at least 6 characters': '用户名至少 3 个字符，密码至少 6 个字符。',
    'User already exists. This is a single-user system.': '已经创建过账户，此系统只允许一个账户。',
    'Invalid username or password': '用户名或密码无效。',
    'Failed to check authentication status': '无法检查登录状态。',
    'Failed to load user': '无法加载当前用户。',
    'Registration failed': '创建账户失败。',
    'Login failed': '登录失败。',
  };

  return messages[message] ?? message;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(AUTH_REQUEST_TIMEOUT_MESSAGE);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function readAuthSession(payload: AuthResponsePayload | null, fallback: string): AuthSession {
  if (!payload?.token || !payload.user) {
    throw new Error(resolveApiErrorMessage(payload, fallback));
  }

  return {
    token: payload.token,
    user: payload.user,
  };
}

export function readStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? '';
}

export function storeToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function authHeaders(token: string, headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  nextHeaders.set('authorization', `Bearer ${token}`);
  return nextHeaders;
}

export async function fetchAuthStatus() {
  const response = await fetchWithTimeout('/api/auth/status');
  const payload = await parseJsonSafely<AuthStatusPayload>(response);
  if (!response.ok || !payload) {
    throw new Error('Failed to check authentication status');
  }
  return payload;
}

export async function fetchCurrentUser(token: string) {
  const response = await fetchWithTimeout('/api/auth/user', {
    headers: authHeaders(token),
  });
  const payload = await parseJsonSafely<{ user?: AuthUser } & ApiErrorPayload>(response);
  if (!response.ok || !payload?.user) {
    throw new AuthApiError(response.status, resolveApiErrorMessage(payload, 'Failed to load user'));
  }
  return payload.user;
}

export async function register(username: string, password: string) {
  const response = await fetchWithTimeout('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const payload = await parseJsonSafely<AuthResponsePayload>(response);
  if (!response.ok) {
    throw new AuthApiError(response.status, resolveApiErrorMessage(payload, 'Registration failed'));
  }
  return readAuthSession(payload, 'Registration failed');
}

export async function login(username: string, password: string) {
  const response = await fetchWithTimeout('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const payload = await parseJsonSafely<AuthResponsePayload>(response);
  if (!response.ok) {
    throw new AuthApiError(response.status, resolveApiErrorMessage(payload, 'Login failed'));
  }
  return readAuthSession(payload, 'Login failed');
}

export async function logout(token: string) {
  await fetchWithTimeout('/api/auth/logout', {
    method: 'POST',
    headers: authHeaders(token),
  }).catch(() => {});
}
