import {apiRequest, ApiError, NetworkError} from './api';
import {decryptTKQR} from '../utils/qrDecryption';
import type {
  TKQRData,
  TKTicketData,
  APITicketDetails,
  APITruckDetails,
  APIDetails,
  VerificationStatus,
} from '../types';

// ── Server-side QR verify response (new endpoint) ──

interface QrVerifyResponse {
  success: boolean;
  data?: {
    kind: string;
    qrData: TKQRData;
    details: {
      ticket?: APITicketDetails;
      truck?: APITruckDetails;
      order?: {
        order_id: number;
        order_code: string;
        order_date: string | null;
        customer_name: string;
        project_name?: string;
        delivery_address?: string;
      };
      summary?: {
        total_tickets: number;
        total_delivered_qty: number;
        ordered_qty: number;
        progress_display: string;
      };
    };
  };
  error_code?: string;
  message?: string;
}

// ── Existing ticket by-order response (already deployed) ──

interface TicketByOrderResponse {
  success: boolean;
  data: {
    order: {
      order_id: number;
      order_code: string;
      order_date: string | null;
      customer_name: string;
      project_name?: string;
      delivery_address?: string;
    };
    tickets: APITicketDetails[];
    summary: {
      total_tickets: number;
      total_delivered_qty: number;
      ordered_qty: number;
      progress_display: string;
    };
  };
}

interface TruckListResponse {
  success: boolean;
  data: APITruckDetails[];
  total: number;
}

/**
 * Verify a scanned QR code.
 *
 * Strategy:
 *   1. Try POST /api/qr/verify (server-side decrypt + lookup — if deployed)
 *   2. If that fails with 404, fall back to existing endpoints:
 *      - For pipe-format: parse locally → GET /api/tickets/by-order/:orderId
 *      - For encrypted: can't decrypt locally, show error
 */
export async function verifyQRPayload(
  rawPayload: string,
  authToken?: string | null,
  backendUrl?: string,
): Promise<{
  status: VerificationStatus;
  qrData?: TKQRData;
  apiData?: APIDetails;
  message?: string;
}> {
  if (!authToken) {
    return {status: 'offline', message: 'Not authenticated'};
  }

  // ── Try new endpoint first ──
  try {
    console.log('[VERIFY] Trying POST /api/qr/verify ...');
    const response = await apiRequest<QrVerifyResponse>('/api/qr/verify', {
      method: 'POST',
      body: {payload: rawPayload},
      authToken,
      baseUrl: backendUrl,
    });

    console.log('[VERIFY] Server response:', response.success);

    if (response.success && response.data) {
      const {kind, qrData, details} = response.data;

      if (kind === 'ticket' && details.ticket) {
        const enrichedTicket: APITicketDetails = {
          ...details.ticket,
          order_code: details.order?.order_code,
          order_date: details.order?.order_date ?? undefined,
          customer_name: details.order?.customer_name,
          project_name: details.order?.project_name,
          delivery_address: details.order?.delivery_address,
          progress_display: details.summary?.progress_display,
        };
        return {status: 'verified', qrData, apiData: enrichedTicket};
      }

      if (kind === 'truck' && details.truck) {
        return {status: 'verified', qrData, apiData: details.truck};
      }
    }

    return {
      status: 'not_found',
      message: response.message || 'QR verification failed',
    };
  } catch (err) {
    // If new endpoint doesn't exist (404) or server error, try fallback
    const is404 = err instanceof ApiError && err.status === 404;
    const isServerError = err instanceof ApiError && err.status >= 500;
    const isNetwork = err instanceof NetworkError;

    if (isNetwork) {
      return {status: 'offline', message: 'No network connection'};
    }

    console.log(
      '[VERIFY] /api/qr/verify failed:',
      err instanceof Error ? err.message : err,
      '— trying fallback...',
    );

    // ── Fallback: use existing endpoints ──
    // This works when the new QR endpoint isn't deployed yet
    if (is404 || isServerError) {
      return fallbackVerify(rawPayload, authToken, backendUrl);
    }

    // Auth errors
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return {status: 'offline', message: 'Session expired'};
    }

    // 400 = bad payload (not a fallback-able error)
    if (err instanceof ApiError && err.status === 400) {
      return {status: 'error', message: 'Invalid QR code format'};
    }

    return {status: 'error', message: 'Verification failed'};
  }
}

/**
 * Fallback: parse pipe-format locally, then use existing ticket/truck endpoints.
 * For encrypted QR, we can't decrypt without the server endpoint.
 */
async function fallbackVerify(
  rawPayload: string,
  authToken: string,
  backendUrl?: string,
): Promise<{
  status: VerificationStatus;
  qrData?: TKQRData;
  apiData?: APIDetails;
  message?: string;
}> {
  // Check if it's pipe format (we can parse locally)
  if (rawPayload.includes('|') && !rawPayload.startsWith('[')) {
    const parts = rawPayload.split('|');
    if (parts.length === 6) {
      const qrData: TKTicketData = {
        kind: 'ticket',
        orderCode: parts[0],
        orderId: parts[1],
        ticketCode: parts[2],
        ticketId: parts[3],
        truckCode: parts[4],
        truckId: parts[5],
        tenantId: '',
        tenantUuid: '',
        tenantSubdomain: '',
        tenantStatus: 'active',
        tenantName: '',
        sig: '',
        iat: Date.now(),
      };

      console.log('[VERIFY] Fallback: pipe format, orderId:', qrData.orderId, 'ticketCode:', qrData.ticketCode);

      // Use existing GET /api/tickets/by-order/:orderId
      try {
        const orderId = parseInt(qrData.orderId, 10);
        if (isNaN(orderId)) {
          return {status: 'error', qrData, message: 'Invalid order ID'};
        }

        const response = await apiRequest<TicketByOrderResponse>(
          `/api/tickets/by-order/${orderId}`,
          {authToken, baseUrl: backendUrl},
        );

        if (response.success && response.data) {
          const ticket = response.data.tickets.find(
            (t: APITicketDetails) => t.ticket_code === qrData.ticketCode,
          );

          if (ticket) {
            const enrichedTicket: APITicketDetails = {
              ...ticket,
              order_code: response.data.order.order_code,
              order_date: response.data.order.order_date ?? undefined,
              customer_name: response.data.order.customer_name,
              project_name: response.data.order.project_name,
              delivery_address: response.data.order.delivery_address,
              progress_display: response.data.summary.progress_display,
            };
            return {status: 'verified', qrData, apiData: enrichedTicket};
          }

          return {status: 'not_found', qrData, message: 'Ticket not found in order'};
        }

        return {status: 'not_found', qrData, message: 'Order not found'};
      } catch (e) {
        console.error('[VERIFY] Fallback API error:', e);
        return {status: 'offline', qrData, message: 'Could not fetch ticket details'};
      }
    }
  }

  // Encrypted format — decrypt locally and use existing ticket endpoint
  if (rawPayload.startsWith('[TK/E]')) {
    console.log('[VERIFY] Fallback: client-side decrypt for encrypted QR...');
    try {
      const qrData = await decryptTKQR(rawPayload);
      console.log('[VERIFY] Client decrypt OK:', qrData.kind, 'orderId:', qrData.kind === 'ticket' ? (qrData as TKTicketData).orderId : 'N/A');

      if (qrData.kind === 'ticket') {
        const ticketData = qrData as TKTicketData;
        const orderId = parseInt(ticketData.orderId, 10);
        if (isNaN(orderId)) {
          return {status: 'verified', qrData, message: 'Decrypted (offline)'};
        }

        try {
          const response = await apiRequest<TicketByOrderResponse>(
            `/api/tickets/by-order/${orderId}`,
            {authToken, baseUrl: backendUrl},
          );

          if (response.success && response.data) {
            const ticket = response.data.tickets.find(
              (t: APITicketDetails) => t.ticket_code === ticketData.ticketCode,
            );

            if (ticket) {
              const enrichedTicket: APITicketDetails = {
                ...ticket,
                order_code: response.data.order.order_code,
                order_date: response.data.order.order_date ?? undefined,
                customer_name: response.data.order.customer_name,
                project_name: response.data.order.project_name,
                delivery_address: response.data.order.delivery_address,
                progress_display: response.data.summary.progress_display,
              };
              return {status: 'verified', qrData, apiData: enrichedTicket};
            }
            return {status: 'not_found', qrData, message: 'Ticket not found in order'};
          }
          return {status: 'not_found', qrData, message: 'Order not found'};
        } catch {
          // API failed but we still have decrypted QR data
          return {status: 'verified', qrData, message: 'Decrypted (offline)'};
        }
      }

      // Truck or other kind — return decrypted data
      return {status: 'verified', qrData};
    } catch (decryptErr) {
      console.error('[VERIFY] Client decrypt failed:', decryptErr);
      return {
        status: 'error',
        message: 'Could not decrypt QR code',
      };
    }
  }

  return {status: 'error', message: 'Unrecognized QR format'};
}
