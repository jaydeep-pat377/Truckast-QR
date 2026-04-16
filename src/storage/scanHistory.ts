import AsyncStorage from '@react-native-async-storage/async-storage';
import {ScanRecord} from '../types';

const HISTORY_KEY = '@qr_scan_history';

// ── Sample data for demo/testing (remove this block for production) ──
const createSampleHistory = (): ScanRecord[] => {
  const now = Date.now();
  const mins = 60 * 1000;
  const hrs = 60 * mins;
  const days = 24 * hrs;

  return [
    {
      id: 'sample_1',
      data: 'TRK-2024-00142-GATE-A',
      type: 'qr',
      timestamp: now - 2 * mins,
      label: 'Gate A Entry',
    },
    {
      id: 'sample_2',
      data: 'TICKET-QR-67890-WEST',
      type: 'qr',
      timestamp: now - 18 * mins,
    },
    {
      id: 'sample_3',
      data: 'TRK-2024-00139-DOCK-3',
      type: 'qr',
      timestamp: now - 45 * mins,
      label: 'Dock 3 Pickup',
    },
    {
      id: 'sample_4',
      data: '4901234567894',
      type: 'ean-13',
      timestamp: now - 2 * hrs,
    },
    {
      id: 'sample_5',
      data: 'MANIFEST-TRK-2024-AB78',
      type: 'code-128',
      timestamp: now - 5 * hrs,
      label: 'Shipping Manifest',
    },
    {
      id: 'sample_6',
      data: 'TRK-2024-00128-GATE-B',
      type: 'qr',
      timestamp: now - 1 * days,
    },
    {
      id: 'sample_7',
      data: 'DISPATCH-9921-NORTH',
      type: 'qr',
      timestamp: now - 2 * days,
      label: 'North Route Dispatch',
    },
    {
      id: 'sample_8',
      data: '5012345678900',
      type: 'ean-13',
      timestamp: now - 3 * days,
    },
  ];
};
// ── End sample data ──

export const getScanHistory = async (): Promise<ScanRecord[]> => {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Seed sample data when history is empty (for demo/testing)
    const sampleData = createSampleHistory();
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(sampleData));
    return sampleData;
  } catch (error) {
    console.log('Error reading scan history:', error);
    return [];
  }
};

export const saveScanRecord = async (record: ScanRecord): Promise<void> => {
  try {
    const history = await getScanHistory();
    const updated = [record, ...history];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.log('Error saving scan record:', error);
  }
};

export const deleteScanRecord = async (id: string): Promise<void> => {
  try {
    const history = await getScanHistory();
    const updated = history.filter(item => item.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.log('Error deleting scan record:', error);
  }
};

export const clearScanHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.log('Error clearing scan history:', error);
  }
};
