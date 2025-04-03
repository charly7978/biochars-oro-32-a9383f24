
export interface DiagnosticsData {
  timestamp: number;
  type: string;
  value: number;
  description: string;
  severity: 'info' | 'warning' | 'error';
}

export interface DiagnosticsConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warning' | 'error';
  maxEntries: number;
}
