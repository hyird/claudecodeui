import { useCallback, useEffect, useState } from 'react';

import {
  clearStoredToken,
  fetchAuthStatus,
  fetchCurrentUser,
  isAuthExpiredError,
  login,
  logout,
  readStoredToken,
  register,
  storeToken,
} from './api';
import AuthLoadingScreen from './AuthLoadingScreen';
import LoginForm from './LoginForm';
import SetupForm from './SetupForm';
import type { AuthActionResult, AuthGateProps, AuthSession, AuthUser } from './types';
import { decodeAuthServerMessage } from '../terminal/wsCodec';
import { openAuthenticatedSocket } from '../wsHost';

type AuthMode = 'loading' | 'setup' | 'login' | 'authenticated';

type AuthState = {
  mode: AuthMode;
  token: string;
  user: AuthUser | null;
};

const loadingState: AuthState = {
  mode: 'loading',
  token: '',
  user: null,
};
const AUTH_BOOTSTRAP_RETRY_DELAYS_MS = [250, 750, 2000] as const;

function authenticatedState(session: AuthSession): AuthState {
  return {
    mode: 'authenticated',
    token: session.token,
    user: session.user,
  };
}

function clearStoredTokenIfCurrent(token: string) {
  if (!token || readStoredToken() === token) {
    clearStoredToken();
  }
}

function createAuthSessionSocket(token: string) {
  return openAuthenticatedSocket('/auth/session', token);
}

export default function AuthGate({ children }: AuthGateProps) {
  const [state, setState] = useState<AuthState>(loadingState);

  useEffect(() => {
    let disposed = false;
    let retryTimer = 0;

    const loadAuthState = async (attempt = 0) => {
      try {
        const status = await fetchAuthStatus();
        const storedToken = readStoredToken();

        if (storedToken) {
          try {
            const user = await fetchCurrentUser(storedToken);
            if (!disposed) {
              setState(authenticatedState({ token: storedToken, user }));
            }
            return;
          } catch (error) {
            if (isAuthExpiredError(error)) {
              clearStoredTokenIfCurrent(storedToken);
            } else {
              throw error;
            }
          }
        }

        if (!disposed) {
          setState({ mode: status.needsSetup ? 'setup' : 'login', token: '', user: null });
        }
      } catch {
        if (disposed) {
          return;
        }

        const retryDelay = AUTH_BOOTSTRAP_RETRY_DELAYS_MS[attempt];
        if (retryDelay !== undefined) {
          retryTimer = window.setTimeout(() => {
            void loadAuthState(attempt + 1);
          }, retryDelay);
          return;
        }

        // A server/network failure is not proof that the stored credential is
        // invalid. Keep it so a later refresh can recover without another login.
        setState({ mode: 'login', token: '', user: null });
      }
    };

    void loadAuthState();

    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
    };
  }, []);

  const completeAuth = useCallback((session: AuthSession) => {
    storeToken(session.token);
    setState(authenticatedState(session));
  }, []);

  const handleAuthInvalidated = useCallback((invalidToken = '') => {
    clearStoredTokenIfCurrent(invalidToken);
    setState({ mode: 'login', token: '', user: null });
  }, []);

  const handleLogin = useCallback(async (username: string, password: string): Promise<AuthActionResult> => {
    try {
      completeAuth(await login(username, password));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录失败。',
      };
    }
  }, [completeAuth]);

  const handleRegister = useCallback(async (username: string, password: string): Promise<AuthActionResult> => {
    try {
      completeAuth(await register(username, password));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建账户失败。',
      };
    }
  }, [completeAuth]);

  useEffect(() => {
    if (state.mode !== 'authenticated' || !state.token) {
      return;
    }

    let disposed = false;
    let reconnectTimer = 0;
    let socket: WebSocket | null = null;
    const invalidateSession = () => {
      if (disposed) {
        return;
      }
      disposed = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
      handleAuthInvalidated(state.token);
    };
    const connect = () => {
      socket = createAuthSessionSocket(state.token);
      socket.binaryType = 'arraybuffer';
      socket.addEventListener('message', (event) => {
        void (async () => {
          const message = await decodeAuthServerMessage(event.data);
          if (message?.type === 'session-invalidated') {
            invalidateSession();
          }
        })();
      });
      socket.addEventListener('close', (event) => {
        if (disposed) {
          return;
        }
        if (event.code === 4001) {
          invalidateSession();
          return;
        }
        reconnectTimer = window.setTimeout(connect, 5000);
      });
    };

    connect();

    return () => {
      disposed = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [handleAuthInvalidated, state.mode, state.token]);

  useEffect(() => {
    if (state.mode !== 'authenticated' || !state.token) {
      return;
    }

    let disposed = false;
    let validating = false;
    const validateCurrentToken = () => {
      if (validating) {
        return;
      }
      validating = true;
      void fetchCurrentUser(state.token)
        .catch((error) => {
          if (!disposed && isAuthExpiredError(error)) {
            handleAuthInvalidated(state.token);
          }
        })
        .finally(() => {
          validating = false;
        });
    };
    const validateWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        validateCurrentToken();
      }
    };

    window.addEventListener('focus', validateCurrentToken);
    document.addEventListener('visibilitychange', validateWhenVisible);

    return () => {
      disposed = true;
      window.removeEventListener('focus', validateCurrentToken);
      document.removeEventListener('visibilitychange', validateWhenVisible);
    };
  }, [handleAuthInvalidated, state.mode, state.token]);

  const handleLogout = useCallback(async () => {
    const token = state.token;
    clearStoredTokenIfCurrent(token);
    setState({ mode: 'login', token: '', user: null });
    if (token) {
      await logout(token);
    }
  }, [state.token]);

  if (state.mode === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (state.mode === 'setup') {
    return <SetupForm onRegister={handleRegister} />;
  }

  if (state.mode === 'login' || !state.user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <>
      {children({
        token: state.token,
        user: state.user,
        logout: handleLogout,
        invalidateAuth: handleAuthInvalidated,
      })}
    </>
  );
}
