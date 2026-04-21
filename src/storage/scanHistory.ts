import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchScanHistory,
  saveScanRemote,
  deleteScanRemote,
  clearScanHistoryRemote,
  Pagination,
} from '../services/scanHistoryService';
import {ScanRecord} from '../types';

const HISTORY_KEY = '@qr_scan_history';

// ── Local cache helpers ──

async function getLocalHistory(): Promise<ScanRecord[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function setLocalHistory(records: ScanRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(records));
  } catch (error) {
    console.log('[HISTORY] Local save error:', error);
  }
}

// ── Public API (API-first, local fallback) ──

export interface PaginatedHistory {
  records: ScanRecord[];
  pagination: Pagination;
}

export const getScanHistory = async (
  authToken?: string | null,
  backendUrl?: string,
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedHistory> => {
  if (authToken) {
    try {
      const result = await fetchScanHistory(authToken, backendUrl, page, limit);
      // Cache first page locally for offline fallback
      if (page === 1) {
        await setLocalHistory(result.records);
      }
      return result;
    } catch (error) {
      console.log('[HISTORY] API fetch failed, using local cache:', error);
    }
  }
  // Fallback: return all local records as single page
  const localRecords = await getLocalHistory();
  return {
    records: localRecords,
    pagination: {
      page: 1,
      limit: localRecords.length,
      total: localRecords.length,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    },
  };
};

export const saveScanRecord = async (
  record: ScanRecord,
  authToken?: string | null,
  backendUrl?: string,
): Promise<void> => {
  if (authToken) {
    try {
      await saveScanRemote(record, authToken, backendUrl);
      return;
    } catch (error) {
      console.log('[HISTORY] API save failed, saving locally:', error);
    }
  }
  // Fallback: save to local only
  const history = await getLocalHistory();
  await setLocalHistory([record, ...history]);
};

export const deleteScanRecord = async (
  id: string,
  authToken?: string | null,
  backendUrl?: string,
): Promise<void> => {
  if (authToken) {
    try {
      await deleteScanRemote(id, authToken, backendUrl);
      return;
    } catch (error) {
      console.log('[HISTORY] API delete failed, deleting locally:', error);
    }
  }
  // Fallback: delete locally
  const history = await getLocalHistory();
  await setLocalHistory(history.filter(item => item.id !== id));
};

export const clearScanHistory = async (
  authToken?: string | null,
  backendUrl?: string,
): Promise<void> => {
  if (authToken) {
    try {
      await clearScanHistoryRemote(authToken, backendUrl);
    } catch (error) {
      console.log('[HISTORY] API clear failed:', error);
    }
  }
  // Always clear local cache
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.log('[HISTORY] Local clear error:', error);
  }
};
