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
    return {records: response.data, pagination: response.pagination};
  } catch (error) {
    throw error;
  }
}

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
    return response.data;
  } catch (error) {
    throw error;
  }
}

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
  } catch (error) {
    throw error;
  }
}

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
  } catch (error) {
    throw error;
  }
}
