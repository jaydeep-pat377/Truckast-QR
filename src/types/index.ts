// ── TK QR decrypted payloads ──

export interface TKTicketData {
  kind: 'ticket';
  orderCode: string;
  orderId: string;
  ticketCode: string;
  ticketId: string;
  truckCode: string;
  truckId: string;
  tenantId: string;
  tenantUuid: string;
  tenantSubdomain: string;
  tenantStatus: string;
  tenantName: string;
  sig: string;
  iat: number;
}

export interface TKTruckData {
  kind: 'truck';
  truckCode: string;
  tenantId: string;
  tenantUuid: string;
  tenantSubdomain: string;
  tenantStatus: string;
  tenantName: string;
  sig: string;
  iat: number;
}

export type TKQRData = TKTicketData | TKTruckData;

// ── API response types ──

export type VerificationStatus = 'verified' | 'not_found' | 'offline' | 'error';

/** Ticket shape from GET /api/tickets/by-order/:order_id */
export interface APITicketDetails {
  load: string;
  ticket_code: string;
  truck: {
    truck_code: string;
    truck_description: string;
    latitude: string | null;
    longitude: string | null;
  } | null;
  plant_location: {
    latitude: string | null;
    longitude: string | null;
  };
  order_location: {
    latitude: string | null;
    longitude: string | null;
  };
  load_qty: string | null;
  run_qty_ord_qty: string | null;
  running_qty: number;
  ordered_qty: number;
  status: string;
  status_display: string;
  remove_reason_code: string | null;
  product: string | null;
  timestamps: {
    eta_at_job: string | null;
    ticketed: string | null;
    loading: string | null;
    loaded: string | null;
    to_job: string | null;
    at_job: string | null;
    pouring: string | null;
    washing: string | null;
    to_plant: string | null;
    at_plant: string | null;
  };
  // Order-level info (merged from parent response)
  order_code?: string;
  order_date?: string;
  customer_name?: string;
  project_name?: string;
  delivery_address?: string;
  driver_name?: string;
  plant_name?: string;
  progress_display?: string;
  [key: string]: unknown;
}

/** Truck shape from GET /api/trucks */
export interface APITruckDetails {
  truck_id: number;
  code: string;
  description: string;
  latitude: string | null;
  longitude: string | null;
  current_driver_name: string | null;
  driver_code: string | null;
  driver_phone: string | null;
  ticket_code: string | null;
  ticket_id: number | null;
  order_code: string | null;
  order_id: number | null;
  delivery_address: string | null;
  customer_name: string | null;
  plant_code: string | null;
  plant_name: string | null;
  plant_phone: string | null;
  product_code: string | null;
  truck_qty: number | null;
  ticket_status: string | null;
  is_active_delivery: boolean;
  [key: string]: unknown;
}

export type APIDetails = APITicketDetails | APITruckDetails;

// ── Core types ──

export interface ScanRecord {
  id: string;
  data: string;
  type: string;
  timestamp: number;
  label?: string;
  tkData?: TKQRData;
  apiData?: APIDetails;
  verified?: VerificationStatus;
}

export type RootTabParamList = {
  Scanner: undefined;
  History: undefined;
};

// ── Auth types ──

export interface LoginResponse {
  code: string;
  client_secret: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  role: string;
  metadata?: {
    full_name?: string;
    user_role?: string;
    tenant?: {
      tenant_id: number;
      tenant_name: string;
      tenant_subdomain: string;
      tenant_backend_url: string;
      qr_enabled: boolean;
      qr_mode: string;
      qr_user_active: boolean;
    };
    [key: string]: unknown;
  };
}

// ── Navigation ──

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  ScanDetails: {scan: ScanRecord};
  History: undefined;
  Settings: undefined;
};
