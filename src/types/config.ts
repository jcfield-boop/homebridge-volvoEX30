export interface VolvoEX30Config {
  name: string;
  vin: string;
  clientId: string;
  clientSecret: string;
  vccApiKey: string;
  initialRefreshToken?: string;
  region?: 'eu' | 'na';
  pollingInterval?: number;
  enableBattery?: boolean;
  enableClimate?: boolean;
  enableLocks?: boolean;
  enableDoors?: boolean;
  enableDiagnostics?: boolean;
  apiPreference?: 'connected-first' | 'energy-first' | 'connected-only' | 'energy-only';
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface VolvoApiConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  region: 'eu' | 'na';
  refreshToken?: string;
  apiPreference?: 'connected-first' | 'energy-first' | 'connected-only' | 'energy-only';
}