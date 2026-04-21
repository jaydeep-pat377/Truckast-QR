import Config from 'react-native-config';

export const ENV = {
  API_BASE_URL: Config.API_BASE_URL || 'https://api.truckast.ai',
  AUTH_BASE_URL: Config.AUTH_BASE_URL || 'https://api.truckast.ai',
  QR_ENCRYPTION_KEY: Config.QR_ENCRYPTION_KEY || '',
  ENV_NAME: Config.ENV || 'production',
  IS_LOCAL: (Config.ENV || 'production') === 'local',
};
