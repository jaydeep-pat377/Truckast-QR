// Default base URL — overridden per-tenant via backendUrl from auth context.
const DEFAULT_API_BASE_URL = 'https://api.truckast.ai';

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
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
    authToken?: string;
    params?: Record<string, string>;
    baseUrl?: string;
  } = {},
): Promise<T> {
  const {method = 'GET', body, authToken, params, baseUrl} = options;

  // Build URL with query params — use tenant-specific baseUrl if provided
  const base = baseUrl || DEFAULT_API_BASE_URL;
  let url = `${base}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

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
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new ApiError(
        text || `HTTP ${response.status}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // AbortError (timeout) or network failure
    throw new NetworkError(
      err instanceof Error ? err.message : 'Network request failed',
    );
  } finally {
    clearTimeout(timeout);
  }
}
