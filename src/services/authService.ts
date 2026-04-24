import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import {ENV} from '../config/env';
import {checkNetwork} from '../utils/network';
import type {LoginResponse, AuthTokens, User} from '../types';

const AUTH_BASE_URL = ENV.AUTH_BASE_URL;
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

  const isOnline = await checkNetwork();
  if (!isOnline) {
    throw new AuthError('No internet connection', 0);
  }
  const url = `${AUTH_BASE_URL}${path}`;

  if (body) {
    const safeBody = {...body};
    if ('password' in safeBody) {
      safeBody.password = '***';
    }
    if ('client_secret' in safeBody) {
      safeBody.client_secret = '***';
    }
    if ('refreshToken' in safeBody) {
      safeBody.refreshToken = '***' + String(safeBody.refreshToken).slice(-6);
    }
  }
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
    const startTime = Date.now();
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const elapsed = Date.now() - startTime;

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

    const data = (await response.json()) as T;
    const responsePreview = JSON.stringify(data).substring(0, 300);
    return data;
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

export async function exchangeCode(
  code: string,
  clientSecret: string,
): Promise<{tokens: AuthTokens; user: User}> {
  const deviceInfo = {
    device_token: 'mobile-app-token',
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

export async function logoutApi(accessToken: string): Promise<void> {
  await authRequest('/api/auth/logout', {
    token: accessToken,
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await authRequest('/api/auth/forgot-password', {
    body: {email},
  });
}

export async function changePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await authRequest('/api/auth/change-password', {
    body: {current_password: currentPassword, new_password: newPassword},
    token: accessToken,
  });
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<AuthTokens | null> {
  const data = await AsyncStorage.getItem(TOKEN_KEY);
  return data ? JSON.parse(data) : null;
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}
