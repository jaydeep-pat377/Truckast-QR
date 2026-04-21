import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {Buffer} from 'buffer';
import {
  login as apiLogin,
  exchangeCode,
  refreshAccessToken,
  logoutApi,
  getMe,
  saveTokens,
  loadTokens,
  clearTokens,
} from '../services/authService';
import {ENV} from '../config/env';
import type {AuthTokens, User} from '../types';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  /** Whether the tenant has QR scanning enabled for users */
  qrUserActive: boolean;
  /** The tenant-specific backend API URL */
  backendUrl: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Derive tenant flags from user metadata
  const qrUserActive = useMemo(
    () => state.user?.metadata?.tenant?.qr_user_active ?? false,
    [state.user],
  );

  const backendUrl = useMemo(
    () => ENV.IS_LOCAL
      ? ENV.API_BASE_URL  // Local dev — always use .env URL
      : state.user?.metadata?.tenant?.tenant_backend_url || ENV.API_BASE_URL,
    [state.user],
  );

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const tokens = await loadTokens();
        if (tokens) {
          const user = await getMe(tokens.accessToken);
          setState({user, tokens, isLoading: false, isAuthenticated: true});
          return;
        }
      } catch {
        await clearTokens();
      }
      setState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
      });
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Step 1: Federated login → code + client_secret
    const {code, client_secret} = await apiLogin(email, password);

    // Step 2: Exchange for tokens + user profile
    const {tokens, user} = await exchangeCode(code, client_secret);
    await saveTokens(tokens);

    setState({user, tokens, isLoading: false, isAuthenticated: true});
  }, []);

  const logout = useCallback(async () => {
    try {
      if (state.tokens?.accessToken) {
        await logoutApi(state.tokens.accessToken);
      }
    } catch {
      // Ignore logout API errors — clear local state regardless
    }
    await clearTokens();
    setState({
      user: null,
      tokens: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, [state.tokens]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!state.tokens) {
      return null;
    }

    try {
      // Decode JWT to check expiry
      const payload = JSON.parse(
        Buffer.from(
          state.tokens.accessToken.split('.')[1],
          'base64',
        ).toString('utf8'),
      );
      const expiresAt = payload.exp * 1000;

      // If token is still valid (1-minute buffer), return it
      if (Date.now() < expiresAt - 60_000) {
        return state.tokens.accessToken;
      }

      // Token expired — refresh
      const newTokens = await refreshAccessToken(state.tokens.refreshToken);
      await saveTokens(newTokens);
      setState(prev => ({...prev, tokens: newTokens}));
      return newTokens.accessToken;
    } catch {
      // Refresh failed — force logout
      await clearTokens();
      setState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return null;
    }
  }, [state.tokens]);

  const value = useMemo(
    () => ({...state, login, logout, getAccessToken, qrUserActive, backendUrl}),
    [state, login, logout, getAccessToken, qrUserActive, backendUrl],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
