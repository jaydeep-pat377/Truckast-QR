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

export interface TicketProduct {
  id: number;
  ticket_id: number;
  product_id?: number | null;
  item_id?: number | null;
  item_code: string | null;
  description: string | null;
  short_description?: string | null;
  is_mix: boolean | null;
  is_assoc?: boolean | null;
  ticket_qty?: number | null;
  ticket_qty_unit?: string | null;
  delv_qty?: number | null;
  delv_qty_unit?: string | null;
  order_qty?: number | null;
  order_qty_unit?: string | null;
  load_qty?: number | null;
  acc_delv_qty?: number | null;
  slump?: number | null;
}

export interface FullTicket {
  ticket_id: number;
  ticket_code: string;
  created_date: string;
  order_date: string;
  order_code: string;
  customer_name: string;
  delivery_addr1: string | null;
  delivery_addr2: string | null;
  delivery_addr3: string | null;
  plant_code: string | null;
  plant_name: string | null;
  truck_code: string | null;
  driver_name?: string | null;
  project_name?: string | null;
  lot_block_number?: string | null;
  customer_job?: string | null;
  job_number?: string | null;
  purchase_order?: string | null;
  ordered_by_name?: string | null;
  ordered_by_phone?: string | null;
  special_instructions?: string | null;
  plant_address?: string | null;
  slump?: string | null;
  truck_ahead?: string | null;
  amount: number | null;
  scheduled_on_job_time: string | null;
  printed_time: string | null;
  load_time: string | null;
  loaded_time: string | null;
  to_job_time: string | null;
  on_job_time: string | null;
  unload_time: string | null;
  end_unload: string | null;
  wash_time: string | null;
  to_plant_time: string | null;
  at_plant_time: string | null;
  print_mix_weight: string | null;
  remove_reason_code: string | null;
  current_status: string;
  weather_data?: {
    temperature_fahrenheit: number;
    weather_description: string;
    [key: string]: unknown;
  } | null;
  ticket_products?: TicketProduct[];
  [key: string]: unknown;
}

export type VerificationStatus = 'verified' | 'not_found' | 'offline' | 'error' | 'unauthorized';

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
  order_code?: string;
  order_date?: string;
  customer_name?: string;
  project_name?: string;
  delivery_address?: string;
  driver_name?: string;
  plant_name?: string;
  progress_display?: string;
  ordered_by_name?: string;
  ordered_by_phone?: string;
  purchase_order?: string;
  customer_job?: string;
  ticket_products?: TicketProduct[];
  slump?: string | null;
  plant_address?: string | null;
  [key: string]: unknown;
}

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

export interface ScanRecord {
  id: string;
  data: string;
  type: string;
  timestamp: number;
  label?: string;
  tkData?: TKQRData;
  apiData?: APIDetails;
  fullTicket?: FullTicket;
  orderCode?: string;
  verified?: VerificationStatus;
}

export type RootTabParamList = {
  Scanner: undefined;
  History: undefined;
};

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
  userType?: string;
  userRole?: string;
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

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  RequestQRAccess: undefined;
  MainTabs: undefined;
  ChangePassword: undefined;
  ScanDetails: {scan: ScanRecord};
  PdfViewer: {filePath: string; title?: string};
  History: undefined;
  Settings: undefined;
};
