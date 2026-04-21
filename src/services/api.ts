import {ENV} from '../config/env';
import {checkNetwork} from '../utils/network';

// Base URL from .env file — overridden per-tenant via backendUrl from auth context.
const DEFAULT_API_BASE_URL = ENV.API_BASE_URL;

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: Record<string, unknown>;
    authToken?: string;
    params?: Record<string, string>;
    baseUrl?: string;
  } = {},
): Promise<T> {
  const {method = 'GET', body, authToken, params, baseUrl} = options;

  const isOnline = await checkNetwork();
  if (!isOnline) {
    throw new NetworkError('No internet connection');
  }

  const base = baseUrl || DEFAULT_API_BASE_URL;
  let url = `${base}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  // Log request details
  console.log(`[API] ➡️ ${method} ${path}`);
  console.log(`[API]    Base URL: ${base}`);
  console.log(`[API]    Full URL: ${url}`);
  if (params) {
    console.log(`[API]    Params:`, JSON.stringify(params));
  }
  if (body) {
    const bodyPreview = JSON.stringify(body).substring(0, 300);
    console.log(`[API]    Body: ${bodyPreview}`);
  }
  console.log(`[API]    Auth: ${authToken ? 'Bearer ***' + authToken.slice(-6) : 'none'}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
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
      console.log(`[API] ❌ ${method} ${path} → ${response.status} (${elapsed}ms)`);
      console.log(`[API]    Error Response: ${text.substring(0, 300)}`);
      throw new ApiError(text || `HTTP ${response.status}`, response.status);
    }

    const data = (await response.json()) as T;
    const responsePreview = JSON.stringify(data).substring(0, 300);
    console.log(`[API] ✅ ${method} ${path} → ${response.status} (${elapsed}ms)`);
    console.log(`[API]    Response: ${responsePreview}`);
    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    console.log(`[API] ❌ ${method} ${path} → Network Error`);
    console.log(`[API]    Error: ${err instanceof Error ? err.message : err}`);
    throw new NetworkError(
      err instanceof Error ? err.message : 'Network request failed',
    );
  } finally {
    clearTimeout(timeout);
  }
}
