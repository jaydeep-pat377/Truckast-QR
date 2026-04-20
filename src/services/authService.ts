import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import type {LoginResponse, AuthTokens, User} from '../types';

const AUTH_BASE_URL = 'https://api.truckast.ai';
const TOKEN_KEY = '@auth_tokens';
const REQUEST_TIMEOUT_MS = 15_000;

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

async function authRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
    token?: string;
  } = {},
): Promise<T> {
  const {method = 'POST', body, token} = options;
  const url = `${AUTH_BASE_URL}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let message = `HTTP ${response.status}`;
      try {
        const json = JSON.parse(text);
        message = json.message || json.error || message;
      } catch {
        if (text) {
          message = text;
        }
      }
      throw new AuthError(message, response.status);
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof AuthError) {
      throw err;
    }
    throw new AuthError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Step 1: Login with email/password — returns code + client_secret */
export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await authRequest<{
    success: boolean;
    data: {code: string; client_secret: string};
  }>('/api/auth/mobile/login', {
    body: {email, password},
  });
  return response.data;
}

/** Step 2: Exchange code + client_secret for access/refresh tokens + user */
export async function exchangeCode(
  code: string,
  clientSecret: string,
): Promise<{tokens: AuthTokens; user: User}> {
  const deviceInfo = {
    device_token: 'mobile-app-token', // TODO: Use FCM/APNs token in production
    device_type: Platform.OS,
    device_name: `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} Device`,
  };

  const response = await authRequest<{
    success: boolean;
    data: {
      user: User;
      accessToken: string;
      refreshToken: string;
    };
  }>('/api/auth/mobile/exchange-code', {
    body: {code, client_secret: clientSecret, device_info: deviceInfo},
  });

  return {
    tokens: {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    },
    user: response.data.user,
  };
}

/** Refresh the access token using the refresh token */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<AuthTokens> {
  const response = await authRequest<{
    success: boolean;
    data: {accessToken: string; refreshToken: string};
  }>('/api/auth/refresh', {
    body: {refreshToken},
  });
  return response.data;
}

/** Get the current authenticated user's profile */
export async function getMe(accessToken: string): Promise<User> {
  const response = await authRequest<{
    success: boolean;
    data: {user: User};
  }>('/api/auth/me', {
    method: 'GET',
    token: accessToken,
  });
  return response.data.user;
}

/** Logout and invalidate the session */
export async function logoutApi(accessToken: string): Promise<void> {
  await authRequest('/api/auth/logout', {
    token: accessToken,
  });
}

/** Request a password reset email */
export async function forgotPassword(email: string): Promise<void> {
  await authRequest('/api/auth/forgot-password', {
    body: {email},
  });
}

// ── Token persistence ──

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  // TODO: Use react-native-keychain or expo-secure-store for production
  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<AuthTokens | null> {
  const data = await AsyncStorage.getItem(TOKEN_KEY);
  return data ? JSON.parse(data) : null;
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}
