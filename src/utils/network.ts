import NetInfo from '@react-native-community/netinfo';
import {showGlobalAlert} from '../contexts/AlertContext';

/**
 * Check if the device has an active internet connection.
 * Shows a themed alert popup and returns false if offline.
 * Returns true if connected.
 */
export async function checkNetwork(): Promise<boolean> {
  const state = await NetInfo.fetch();
  const isConnected = state.isConnected && state.isInternetReachable !== false;

  if (!isConnected) {
    showGlobalAlert({
      type: 'error',
      icon: 'wifi-outline',
      title: 'No Internet Connection',
      message: 'Please check your internet connection and try again.',
    });
    return false;
  }

  return true;
}
