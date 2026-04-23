import { apiRequest, ApiError, NetworkError } from './api';
import type {
  TKQRData,
  TKTicketData,
  TKTruckData,
  FullTicket,
  APITicketDetails,
  APIDetails,
  VerificationStatus,
} from '../types';

interface QrDecryptResponse {
  ok: boolean;
  kind?: string;
  ticket?: FullTicket;
  orderCode?: string;
  tenant?: {
    id: string | null;
    uuid: string | null;
    subdomain: string | null;
    status: string | null;
    name: string | null;
  };
  meta?: {
    orderId: string | number;
    truckCode: string;
    truckId: string | number;
    issuedAt: number;
  };
  truck?: { code: string };
  error?: string;
}

interface QrVerifyResponse {
  success: boolean;
  data?: {
    kind: string;
    qrData: TKQRData;
    security_mode?: {
      mode: string;
      scannable_statuses: string[];
    };
    details: {
      ticket?: APITicketDetails;
      truck?: {
        code: string;
        description: string;
        current_driver_name: string | null;
        ticket_status: string | null;
        order_code: string | null;
        customer_name: string | null;
        delivery_address: string | null;
        plant_name: string | null;
        [key: string]: unknown;
      };
      order?: {
        order_id: number;
        order_code: string;
        order_date: string | null;
        customer_name: string;
        project_name?: string;
        delivery_address?: string;
        ordered_by_name?: string | null;
        ordered_by_phone?: string | null;
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

type VerifyResult = {
  status: VerificationStatus;
  qrData?: TKQRData;
  apiData?: APIDetails;
  fullTicket?: FullTicket;
  orderCode?: string;
  message?: string;
};

export async function verifyQRPayload(
  rawPayload: string,
  authToken?: string | null,
  backendUrl?: string,
  userRole?: string,
): Promise<VerifyResult> {
  if (!authToken) {
    return { status: 'offline', message: 'Not authenticated' };
  }

  const isTKEncrypted = rawPayload.startsWith('[TK/E]');
  const isPipe = !isTKEncrypted && rawPayload.includes('|') && !rawPayload.startsWith('[') && rawPayload.split('|').length === 6;

  if (isTKEncrypted || isPipe) {
    const decryptResult = await tryDecryptEndpoint(rawPayload, backendUrl);
    if (decryptResult) return decryptResult;

    const verifyResult = await tryVerifyEndpoint(rawPayload, authToken, backendUrl, userRole);
    if (verifyResult) return verifyResult;

    if (isPipe) {
      return fallbackPipeVerify(rawPayload.split('|'), authToken, backendUrl);
    }

    return { status: 'error', message: 'Verification failed' };
  }

  return { status: 'error', message: 'Unrecognized QR format' };
}

async function tryDecryptEndpoint(
  rawPayload: string,
  backendUrl?: string,
): Promise<VerifyResult | null> {
  try {
    const response = await apiRequest<QrDecryptResponse>('/api/qr/decrypt', {
      method: 'POST',
      body: { payload: rawPayload },
      baseUrl: backendUrl,
    });

    if (!response.ok) {
      return null;
    }

    if (response.kind === 'ticket' && response.ticket) {
      const ticket = response.ticket;
      const qrData: TKTicketData = {
        kind: 'ticket',
        orderCode: response.orderCode || ticket.order_code || '',
        orderId: String(response.meta?.orderId || ''),
        ticketCode: ticket.ticket_code,
        ticketId: String(ticket.ticket_id),
        truckCode: ticket.truck_code || String(response.meta?.truckCode || ''),
        truckId: String(response.meta?.truckId || ''),
        tenantId: String(response.tenant?.id || ''),
        tenantUuid: response.tenant?.uuid || '',
        tenantSubdomain: response.tenant?.subdomain || '',
        tenantStatus: response.tenant?.status || 'active',
        tenantName: response.tenant?.name || '',
        sig: '',
        iat: response.meta?.issuedAt || Date.now(),
      };

      const mix = (ticket.ticket_products || []).find(x => x.is_mix) || (ticket.ticket_products || [])[0];
      const deliveryAddr = [ticket.delivery_addr1, ticket.delivery_addr2, ticket.delivery_addr3]
        .filter(p => p && p.trim())
        .join(', ');

      const apiData: APITicketDetails = {
        load: '',
        ticket_code: ticket.ticket_code,
        truck: ticket.truck_code ? {
          truck_code: ticket.truck_code,
          truck_description: '',
          latitude: null,
          longitude: null,
        } : null,
        plant_location: { latitude: null, longitude: null },
        order_location: { latitude: null, longitude: null },
        load_qty: mix?.load_qty != null ? String(mix.load_qty) : null,
        run_qty_ord_qty: null,
        running_qty: 0,
        ordered_qty: mix?.order_qty ?? 0,
        status: ticket.current_status || '',
        status_display: ticket.current_status || '',
        remove_reason_code: ticket.remove_reason_code,
        product: mix?.description ?? null,
        timestamps: {
          eta_at_job: null,
          ticketed: ticket.printed_time,
          loading: ticket.load_time,
          loaded: ticket.loaded_time,
          to_job: ticket.to_job_time,
          at_job: ticket.on_job_time,
          pouring: ticket.unload_time,
          washing: ticket.wash_time,
          to_plant: ticket.to_plant_time,
          at_plant: ticket.at_plant_time,
        },
        order_code: ticket.order_code,
        order_date: ticket.order_date ?? undefined,
        customer_name: ticket.customer_name,
        project_name: ticket.project_name ?? undefined,
        delivery_address: deliveryAddr || undefined,
        driver_name: ticket.driver_name ?? undefined,
        plant_name: ticket.plant_name ?? undefined,
        ordered_by_name: ticket.ordered_by_name ?? undefined,
        ordered_by_phone: ticket.ordered_by_phone ?? undefined,
        purchase_order: ticket.purchase_order ?? undefined,
        customer_job: ticket.customer_job ?? undefined,
        ticket_products: ticket.ticket_products ?? undefined,
        slump: ticket.slump ?? undefined,
        plant_address: ticket.plant_address ?? undefined,
      };

      return {
        status: 'verified',
        qrData,
        apiData,
        fullTicket: ticket,
        orderCode: response.orderCode,
      };
    }

    if (response.kind === 'truck' && response.truck) {
      const qrData: TKTruckData = {
        kind: 'truck',
        truckCode: response.truck.code,
        tenantId: String(response.tenant?.id || ''),
        tenantUuid: response.tenant?.uuid || '',
        tenantSubdomain: response.tenant?.subdomain || '',
        tenantStatus: response.tenant?.status || 'active',
        tenantName: response.tenant?.name || '',
        sig: '',
        iat: response.meta?.issuedAt || Date.now(),
      };
      return { status: 'verified', qrData };
    }

    return null;
  } catch (err) {
    if (err instanceof NetworkError) {
      return { status: 'offline', message: 'No network connection' };
    }
    if (err instanceof ApiError && err.status === 403) {
      return { status: 'unauthorized', message: err.message || 'Access denied' };
    }
    if (err instanceof ApiError && err.status === 401) {
      return { status: 'unauthorized', message: 'QR signature verification failed' };
    }
    return null;
  }
}

async function tryVerifyEndpoint(
  rawPayload: string,
  authToken: string,
  backendUrl?: string,
  userRole?: string,
): Promise<VerifyResult | null> {
  try {
    const response = await apiRequest<QrVerifyResponse>('/api/qr/verify', {
      method: 'POST',
      body: { payload: rawPayload },
      authToken,
      baseUrl: backendUrl,
    });

    if (response.success && response.data) {
      const { kind, qrData, details, security_mode } = response.data;

      if (security_mode?.mode === 'qr_login_required') {
        if (userRole !== 'QR Code User') {
          return { status: 'unauthorized', message: 'This is a secure QR code. Please login with a QR authenticated user to access this ticket.' };
        }
      }

      if (security_mode?.mode === 'time_bound') {
        const scannableStatuses = security_mode.scannable_statuses || [];
        const statusDisplay = details?.ticket?.status_display || '';
        if (!scannableStatuses.some(s => s.toLowerCase() === statusDisplay.toLowerCase())) {
          return { status: 'error', message: 'This ticket status does not allow viewing details.' };
        }
      }

      if (kind === 'ticket' && details.ticket) {
        const t = details.ticket;
        const o = details.order;
        const enrichedTicket: APITicketDetails = {
          ...t,
          order_code: o?.order_code ?? t.order_code,
          order_date: o?.order_date ?? t.order_date ?? undefined,
          customer_name: o?.customer_name ?? t.customer_name,
          project_name: o?.project_name ?? t.project_name,
          delivery_address: o?.delivery_address ?? t.delivery_address,
          ordered_by_name: t.ordered_by_name ?? o?.ordered_by_name ?? undefined,
          ordered_by_phone: t.ordered_by_phone ?? o?.ordered_by_phone ?? undefined,
          progress_display: details.summary?.progress_display,
        };
        return { status: 'verified', qrData, apiData: enrichedTicket };
      }

      if (kind === 'truck' && details.truck) {
        return { status: 'verified', qrData, apiData: details.truck as unknown as APIDetails };
      }
    }

    return { status: 'not_found', message: response.message || 'QR verification failed' };
  } catch (err) {
    if (err instanceof NetworkError) {
      return { status: 'offline', message: 'No network connection' };
    }
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return { status: 'offline', message: 'Session expired' };
    }
    return null;
  }
}

async function fallbackPipeVerify(
  parts: string[],
  authToken: string,
  backendUrl?: string,
): Promise<VerifyResult> {
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

  const orderId = parseInt(qrData.orderId, 10);

  if (!isNaN(orderId) && orderId > 0) {
    try {
      const response = await apiRequest<TicketByOrderResponse>(
        `/api/tickets/by-order/${orderId}`,
        { authToken, baseUrl: backendUrl },
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
          return { status: 'verified', qrData, apiData: enrichedTicket };
        }
      }
    } catch (e) {
      console.log('[VERIFY] by-order failed:', e instanceof Error ? e.message : e);
    }
  }

  if (qrData.ticketCode) {
    try {
      const response = await apiRequest<{
        success: boolean;
        data: { tickets: APITicketDetails[]; pagination: unknown };
      }>('/api/tickets', {
        authToken,
        baseUrl: backendUrl,
        params: { search: qrData.ticketCode, limit: '1' },
      });
      if (response.success && response.data?.tickets?.length > 0) {
        return { status: 'verified', qrData, apiData: response.data.tickets[0] };
      }
    } catch (e) {
      console.log('e:', e instanceof Error ? e.message : e);
    }
  }

  return { status: 'verified', qrData, message: 'Decrypted (ticket details unavailable)' };
}
