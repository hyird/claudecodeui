import { useCallback, useEffect, useState } from 'react';

import {
  clearStoredToken,
  fetchAuthStatus,
  fetchCurrentUser,
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

function authenticatedState(session: AuthSession): AuthState {
  return {
    mode: 'authenticated',
    token: session.token,
    user: session.user,
  };
}

export default function AuthGate({ children }: AuthGateProps) {
  const [state, setState] = useState<AuthState>(loadingState);

  useEffect(() => {
    let disposed = false;

    const loadAuthState = async () => {
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
          } catch {
            clearStoredToken();
          }
        }

        if (!disposed) {
          setState({ mode: status.needsSetup ? 'setup' : 'login', token: '', user: null });
        }
      } catch {
        if (!disposed) {
          setState({ mode: 'login', token: '', user: null });
        }
      }
    };

    void loadAuthState();

    return () => {
      disposed = true;
    };
  }, []);

  const completeAuth = useCallback((session: AuthSession) => {
    storeToken(session.token);
    setState(authenticatedState(session));
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

  const handleLogout = useCallback(async () => {
    const token = state.token;
    clearStoredToken();
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
      })}
    </>
  );
}
