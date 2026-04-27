import { ENV } from '../config/env';
import {checkNetwork} from '../utils/network';

const SIGNUP_BASE_URL = ENV.AUTH_BASE_URL;   
const REQUEST_TIMEOUT_MS = 15_000;

export class SignupError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'SignupError';
    this.status = status;
  }
}

async function signupRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
  } = {},
): Promise<T> {
  const {method = 'POST', body} = options;

  const isOnline = await checkNetwork();
  if (!isOnline) {
    throw new SignupError('No internet connection', 0);
  }

  const url = `${SIGNUP_BASE_URL}${path}`;

  console.log(`[Signup] ${method} ${url}`, body ? JSON.stringify(body) : '');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

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
      console.log(
        `[Signup] FAIL ${method} ${path} ${response.status} (${elapsed}ms)`,
        text,
      );
      let message = `HTTP ${response.status}`;
      try {
        const json = JSON.parse(text);
        message = json.message || json.error || message;
      } catch {
        if (text) {
          message = text;
        }
      }
      throw new SignupError(message, response.status);
    }

    const data = (await response.json()) as T;
    console.log(
      `[Signup] OK ${method} ${path} ${response.status} (${elapsed}ms)`,
      JSON.stringify(data).substring(0, 500),
    );
    return data;
  } catch (err) {
    if (err instanceof SignupError) {
      console.log(
        `[Signup] ERROR ${method} ${path}:`,
        err.message,
        `status=${err.status}`,
      );
      throw err;
    }
    console.log(
      `[Signup] NETWORK ERROR ${method} ${path}:`,
      err instanceof Error ? err.message : err,
    );
    throw new SignupError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}

// --- Types ---

export interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
}

export interface SignupResponse {
  success: boolean;
  message: string;
}

export interface VerifyEmailOTPResponse {
  success: boolean;
  message: string;
}

export interface SendPhoneOTPResponse {
  success: boolean;
  message: string;
}

export interface VerifyPhoneOTPResponse {
  success: boolean;
  message: string;
  data?: {
    user: Record<string, unknown>;
    accessToken: string;
    refreshToken: string;
  };
}

// --- API functions ---

/**
 * Step 1: POST /api/auth/signup
 * Backend expects: { email, firstName, lastName } (or full_name)
 */
export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  return signupRequest<SignupResponse>('/api/auth/signup', {
    body: {
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
    },
  });
}

/**
 * Step 2: POST /api/auth/verify-email-otp
 * Backend expects: { email, otp }
 */
export async function verifyEmailOTP(
  email: string,
  otp: string,
): Promise<VerifyEmailOTPResponse> {
  return signupRequest<VerifyEmailOTPResponse>('/api/auth/verify-email-otp', {
    body: {email, otp},
  });
}

/**
 * Step 3: POST /api/auth/send-phone-otp
 * Backend expects: { email, phone_country_code, phone_number }
 */
export async function sendPhoneOTP(
  email: string,
  phoneCountryCode: string,
  phoneNumber: string,
): Promise<SendPhoneOTPResponse> {
  return signupRequest<SendPhoneOTPResponse>('/api/auth/send-phone-otp', {
    body: {
      email,
      phone_country_code: phoneCountryCode,
      phone_number: phoneNumber,
    },
  });
}

/**
 * Step 4: POST /api/auth/verify-phone-otp
 * Backend expects: { email, otp } (NOT phone!)
 */
export async function verifyPhoneOTP(
  email: string,
  otp: string,
): Promise<VerifyPhoneOTPResponse> {
  return signupRequest<VerifyPhoneOTPResponse>('/api/auth/verify-phone-otp', {
    body: {email, otp},
  });
}

/**
 * Step 5: POST /api/auth/set-password
 * Backend expects: { email, password, confirmPassword }
 */
export async function setPassword(
  email: string,
  password: string,
  confirmPassword: string,
): Promise<{success: boolean; message: string}> {
  return signupRequest('/api/auth/set-password', {
    body: {email, password, confirmPassword},
  });
}

/**
 * Resend email OTP
 * Backend expects: { email }
 */
export async function resendEmailOTP(
  email: string,
): Promise<{success: boolean; message: string}> {
  return signupRequest('/api/auth/resend-email-otp', {
    body: {email},
  });
}

/**
 * Resend phone OTP
 * Backend expects: { email } (looks up phone from pending record)
 */
export async function resendPhoneOTP(
  email: string,
): Promise<{success: boolean; message: string}> {
  return signupRequest('/api/auth/resend-phone-otp', {
    body: {email},
  });
}
