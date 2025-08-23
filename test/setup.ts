/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

// Mock console methods to reduce noise in tests unless specifically testing logging
global.console = {
  ...console,
  // Uncomment these to silence console output during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock process.env for consistent testing
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(10000);

// Mock Homebridge Logger
export const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
};

// Mock Homebridge API
export const mockApi = {
  hap: {
    Service: {
      Battery: 'Battery',
      LockManagement: 'LockManagement',
      ContactSensor: 'ContactSensor',
      Switch: 'Switch',
      MotionSensor: 'MotionSensor',
      AccessoryInformation: 'AccessoryInformation',
    },
    Characteristic: {
      BatteryLevel: 'BatteryLevel',
      StatusLowBattery: 'StatusLowBattery',
      ChargingState: 'ChargingState',
      LockCurrentState: 'LockCurrentState',
      LockTargetState: 'LockTargetState',
      ContactSensorState: 'ContactSensorState',
      On: 'On',
      Manufacturer: 'Manufacturer',
      Model: 'Model',
    },
  },
};

// Mock Homebridge Platform Accessory
export const mockPlatformAccessory = {
  displayName: 'Test EX30',
  UUID: 'test-uuid',
  getService: jest.fn(),
  addService: jest.fn(),
  removeService: jest.fn(),
  context: {},
};

// Mock axios for HTTP requests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    defaults: {
      baseURL: 'https://api.volvocars.com',
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
}));

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
export const testUtils = {
  mockVehicleData: {
    doors: {
      data: {
        centralLock: { value: 'LOCKED', timestamp: '2024-01-01T12:00:00Z' },
        frontLeftDoor: { value: 'CLOSED', timestamp: '2024-01-01T12:00:00Z' },
        frontRightDoor: { value: 'CLOSED', timestamp: '2024-01-01T12:00:00Z' },
        rearLeftDoor: { value: 'CLOSED', timestamp: '2024-01-01T12:00:00Z' },
        rearRightDoor: { value: 'CLOSED', timestamp: '2024-01-01T12:00:00Z' },
        hood: { value: 'CLOSED', timestamp: '2024-01-01T12:00:00Z' },
        tailgate: { value: 'CLOSED', timestamp: '2024-01-01T12:00:00Z' },
      },
    },
    fuel: {
      data: {
        batteryChargeLevel: { value: 85, timestamp: '2024-01-01T12:00:00Z' },
      },
    },
  },
  
  mockConfig: {
    vin: 'YV4EK3ZL4SS150793',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret', 
    vccApiKey: 'test-api-key',
    initialRefreshToken: 'test-refresh-token',
    region: 'eu' as const,
    pollingInterval: 5,
    enableBattery: true,
    enableClimate: true,
    enableLocks: true,
  },
  
  mockTokens: {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
  },
};

// Export common test helpers
export function createMockService(serviceName: string) {
  return {
    setCharacteristic: jest.fn().mockReturnThis(),
    getCharacteristic: jest.fn().mockReturnValue({
      onGet: jest.fn().mockReturnThis(),
      onSet: jest.fn().mockReturnThis(),
      setProps: jest.fn().mockReturnThis(),
    }),
    updateCharacteristic: jest.fn(),
    setPrimaryService: jest.fn(),
  };
}

export function createMockAxiosResponse<T>(data: T, status = 200) {
  return Promise.resolve({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {},
  });
}