import {apiRequest} from './api';
import type {ScanRecord} from '../types';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface ScanHistoryResponse {
  success: boolean;
  data: ScanRecord[];
  pagination: Pagination;
}

interface SaveScanResponse {
  success: boolean;
  data: ScanRecord;
}

interface DeleteResponse {
  success: boolean;
  message?: string;
}

/** GET /api/scan-history?page=&limit= — fetch paginated scan records */
export async function fetchScanHistory(
  authToken: string,
  backendUrl?: string,
  page: number = 1,
  limit: number = 20,
): Promise<{records: ScanRecord[]; pagination: Pagination}> {
  try {
    const response = await apiRequest<ScanHistoryResponse>('/api/scan-history', {
      authToken,
      baseUrl: backendUrl,
      params: {page: String(page), limit: String(limit)},
    });
    console.log('[SCAN-HISTORY] GET /api/scan-history → success:', response.success, '| count:', response.data?.length, '| page:', response.pagination?.page, '| total:', response.pagination?.total);
    return {records: response.data, pagination: response.pagination};
  } catch (error) {
    console.log('[SCAN-HISTORY] GET /api/scan-history → error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/** POST /api/scan-history — save a new scan record */
export async function saveScanRemote(
  record: ScanRecord,
  authToken: string,
  backendUrl?: string,
): Promise<ScanRecord> {
  try {
    const response = await apiRequest<SaveScanResponse>('/api/scan-history', {
      method: 'POST',
      body: record as unknown as Record<string, unknown>,
      authToken,
      baseUrl: backendUrl,
    });
    console.log('[SCAN-HISTORY] POST /api/scan-history → success:', response.success, '| id:', response.data?.id);
    return response.data;
  } catch (error) {
    console.log('[SCAN-HISTORY] POST /api/scan-history → error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/** DELETE /api/scan-history/:id — delete one scan record */
export async function deleteScanRemote(
  id: string,
  authToken: string,
  backendUrl?: string,
): Promise<void> {
  try {
    const response = await apiRequest<DeleteResponse>(`/api/scan-history/${id}`, {
      method: 'DELETE',
      authToken,
      baseUrl: backendUrl,
    });
    console.log('[SCAN-HISTORY] DELETE /api/scan-history/' + id, '→ success:', response.success, '| message:', response.message);
  } catch (error) {
    console.log('[SCAN-HISTORY] DELETE /api/scan-history/' + id, '→ error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/** DELETE /api/scan-history — clear all scan history for the user */
export async function clearScanHistoryRemote(
  authToken: string,
  backendUrl?: string,
): Promise<void> {
  try {
    const response = await apiRequest<DeleteResponse>('/api/scan-history', {
      method: 'DELETE',
      authToken,
      baseUrl: backendUrl,
    });
    console.log('[SCAN-HISTORY] DELETE /api/scan-history (clear all) → success:', response.success, '| message:', response.message);
  } catch (error) {
    console.log('[SCAN-HISTORY] DELETE /api/scan-history (clear all) → error:', error instanceof Error ? error.message : error);
    throw error;
  }
}
