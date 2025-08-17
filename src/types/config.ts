export interface VolvoEX30Config {
  name: string;
  vin: string;
  clientId: string;
  clientSecret: string;
  vccApiKey: string;
  initialRefreshToken?: string;
  region?: 'eu' | 'na';
  pollingInterval?: number;
  presentationMode?: 'simple' | 'advanced';
  enableHonkFlash?: boolean;
  enableAdvancedSensors?: boolean;
  // Legacy flags for backward compatibility
  enableBattery?: boolean;
  enableClimate?: boolean;
  enableLocks?: boolean;
  enableDoors?: boolean;
  enableDiagnostics?: boolean;
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
}