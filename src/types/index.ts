export interface ScanRecord {
  id: string;
  data: string;
  type: string;
  timestamp: number;
  label?: string;
}

export type RootTabParamList = {
  Scanner: undefined;
  History: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  ScanDetails: {scan: ScanRecord};
  History: undefined;
  Settings: undefined;
};
