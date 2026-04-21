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
    console.log('[VERIFY] ❌ No auth token');
    return {status: 'offline', message: 'Not authenticated'};
  }

  // Step 1: Try POST /api/qr/verify
  try {
    console.log('[VERIFY] ── POST /api/qr/verify ──');
    console.log('[VERIFY]    URL:', (backendUrl || 'default') + '/api/qr/verify');
    console.log('[VERIFY]    Payload preview:', rawPayload.substring(0, 60));

    const response = await apiRequest<QrVerifyResponse>('/api/qr/verify', {
      method: 'POST',
      body: {payload: rawPayload},
      authToken,
      baseUrl: backendUrl,
    });

    console.log('[VERIFY] ── Response ──');
    console.log('[VERIFY]    success:', response.success);
    console.log('[VERIFY]    message:', response.message);
    console.log('[VERIFY]    error_code:', response.error_code);
    console.log('[VERIFY]    has data:', !!response.data);

    if (response.success && response.data) {
      const {kind, qrData, details} = response.data;

      console.log('[VERIFY]    kind:', kind);
      console.log('[VERIFY]    has qrData:', !!qrData);
      console.log('[VERIFY]    has details.ticket:', !!details?.ticket);
      console.log('[VERIFY]    has details.truck:', !!details?.truck);
      console.log('[VERIFY]    has details.order:', !!details?.order);
      console.log('[VERIFY]    has details.summary:', !!details?.summary);

      if (kind === 'ticket' && details.ticket) {
        console.log('[VERIFY] ── Ticket Details from API ──');
        console.log('[VERIFY]    ticket_code:', details.ticket.ticket_code);
        console.log('[VERIFY]    truck_code:', details.ticket.truck?.truck_code);
        console.log('[VERIFY]    truck_desc:', details.ticket.truck?.truck_description);
        console.log('[VERIFY]    status:', details.ticket.status_display);
        console.log('[VERIFY]    product:', details.ticket.product);
        console.log('[VERIFY]    load_qty:', details.ticket.load_qty);
        console.log('[VERIFY]    driver:', details.ticket.driver_name);
        console.log('[VERIFY]    plant:', details.ticket.plant_name);
        console.log('[VERIFY]    customer:', details.order?.customer_name);
        console.log('[VERIFY]    delivery:', details.order?.delivery_address);
        console.log('[VERIFY]    timestamps:', JSON.stringify(details.ticket.timestamps));
        console.log('[VERIFY]    progress:', details.summary?.progress_display);

        const enrichedTicket: APITicketDetails = {
          ...details.ticket,
          order_code: details.order?.order_code,
          order_date: details.order?.order_date ?? undefined,
          customer_name: details.order?.customer_name,
          project_name: details.order?.project_name,
          delivery_address: details.order?.delivery_address,
          progress_display: details.summary?.progress_display,
        };
        console.log('[VERIFY] ✅ Returning enriched ticket with apiData');
        return {status: 'verified', qrData, apiData: enrichedTicket};
      }

      if (kind === 'truck' && details.truck) {
        console.log('[VERIFY] ✅ Truck verified via /api/qr/verify');
        console.log('[VERIFY]    truck:', JSON.stringify(details.truck).substring(0, 200));
        return {status: 'verified', qrData, apiData: details.truck};
      }
    }

    console.log('[VERIFY] ❌ No usable data in response');
    return {status: 'not_found', message: response.message || 'QR verification failed'};
  } catch (err) {
    const is404 = err instanceof ApiError && err.status === 404;
    const isServerError = err instanceof ApiError && err.status >= 500;
    const isNetwork = err instanceof NetworkError;

    console.log('[VERIFY] ── Error ──');
    console.log('[VERIFY]    type:', err instanceof ApiError ? 'ApiError' : err instanceof NetworkError ? 'NetworkError' : 'Unknown');
    console.log('[VERIFY]    status:', err instanceof ApiError ? err.status : 'N/A');
    console.log('[VERIFY]    message:', err instanceof Error ? err.message.substring(0, 200) : err);

    if (isNetwork) {
      return {status: 'offline', message: 'No network connection'};
    }

    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return {status: 'offline', message: 'Session expired'};
    }

    if (err instanceof ApiError && err.status === 400) {
      return {status: 'error', message: 'Invalid QR code format'};
    }

    // Step 2: Fallback
    if (is404 || isServerError) {
      console.log('[VERIFY] ⚠️ Server error/404, trying client-side fallback...');
      return fallbackVerify(rawPayload, authToken, backendUrl);
    }

    return {status: 'error', message: 'Verification failed'};
  }
}

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
  // Pipe format
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
      return fetchTicketByOrder(qrData, authToken, backendUrl);
    }
  }

  // Encrypted format
  if (rawPayload.startsWith('[TK/E]')) {
    try {
      const qrData = await decryptTKQR(rawPayload);
      console.log('[VERIFY] ✅ Client decrypt OK');

      if (qrData.kind === 'ticket') {
        return fetchTicketByOrder(qrData as TKTicketData, authToken, backendUrl);
      }
      return {status: 'verified', qrData};
    } catch (e) {
      console.log('[VERIFY] ❌ Client decrypt failed:', e instanceof Error ? e.message : e);
      return {status: 'error', message: 'Could not decrypt QR code'};
    }
  }

  console.log('[VERIFY] ❌ Unrecognized format');
  return {status: 'error', message: 'Unrecognized QR format'};
}

async function fetchTicketByOrder(
  qrData: TKTicketData,
  authToken: string,
  backendUrl?: string,
): Promise<{
  status: VerificationStatus;
  qrData: TKQRData;
  apiData?: APIDetails;
  message?: string;
}> {
  const orderId = parseInt(qrData.orderId, 10);

  // If orderId is valid, use by-order endpoint
  if (!isNaN(orderId) && orderId > 0) {
    try {
      const response = await apiRequest<TicketByOrderResponse>(
        `/api/tickets/by-order/${orderId}`,
        {authToken, baseUrl: backendUrl},
      );

      if (response.success && response.data) {
        const ticket = response.data.tickets.find(
          (t: APITicketDetails) => t.ticket_code === qrData.ticketCode,
        );

        if (ticket) {
          console.log('[VERIFY] ✅ Ticket found via by-order:', ticket.ticket_code);
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
      }
    } catch (e) {
      console.log('[VERIFY] ❌ by-order failed:', e instanceof Error ? e.message : e);
    }
  }

  // Fallback: search by ticket code using GET /api/tickets?search=<ticketCode>
  if (qrData.ticketCode) {
    try {
      console.log('[VERIFY] Trying GET /api/tickets?search=' + qrData.ticketCode);
      const response = await apiRequest<{
        success: boolean;
        data: {tickets: APITicketDetails[]; pagination: unknown};
      }>(
        '/api/tickets',
        {
          authToken,
          baseUrl: backendUrl,
          params: {search: qrData.ticketCode, limit: '1'},
        },
      );

      if (response.success && response.data?.tickets?.length > 0) {
        const ticket = response.data.tickets[0];
        console.log('[VERIFY] ✅ Ticket found via search:', ticket.ticket_code);
        return {status: 'verified', qrData, apiData: ticket};
      }

      console.log('[VERIFY] ❌ Ticket not found via search');
    } catch (e) {
      console.log('[VERIFY] ❌ Search failed:', e instanceof Error ? e.message : e);
    }
  }

  // Still return QR data even if API lookup failed
  return {status: 'verified', qrData, message: 'Decrypted (ticket details unavailable)'};
}
