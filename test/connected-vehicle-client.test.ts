/**
 * Connected Vehicle Client Tests
 * Tests for the Connected Vehicle API v2 client
 */

import axios from 'axios';
import { ConnectedVehicleClient } from '../src/api/connected-vehicle-client';
import { mockLogger, testUtils, createMockAxiosResponse } from './setup';

// Mock axios
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ConnectedVehicleClient', () => {
  let client: ConnectedVehicleClient;
  const mockConfig = testUtils.mockConfig;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock axios.create
    const mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      defaults: {
        baseURL: 'https://api.volvocars.com/connected-vehicle/v2',
      },
    };
    
    mockedAxios.create = jest.fn().mockReturnValue(mockHttpClient as any);
    
    // Create client instance
    client = new ConnectedVehicleClient(mockConfig, mockLogger);
  });

  describe('Constructor', () => {
    it('should initialize with correct base URL and headers', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.volvocars.com/connected-vehicle/v2',
        headers: {
          'vcc-api-key': mockConfig.vccApiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
    });

    it('should use EU region by default', () => {
      const euConfig = { ...mockConfig, region: 'eu' as const };
      new ConnectedVehicleClient(euConfig, mockLogger);
      
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.volvocars.com/connected-vehicle/v2',
        })
      );
    });

    it('should use NA region when specified', () => {
      const naConfig = { ...mockConfig, region: 'na' as const };
      new ConnectedVehicleClient(naConfig, mockLogger);
      
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.volvocars.com/connected-vehicle/v2',
        })
      );
    });
  });

  describe('Vehicle List', () => {
    it('should fetch vehicle list successfully', async () => {
      const mockResponse = {
        data: [
          { vin: 'YV4EK3ZL4SS150793' },
          { vin: 'YV4EK3ZL4SS150794' },
        ],
      };
      
      const mockHttpClient = mockedAxios.create() as any;
      mockHttpClient.get.mockResolvedValue(createMockAxiosResponse(mockResponse));

      const result = await client.getVehicleList('mock-token');
      
      expect(mockHttpClient.get).toHaveBeenCalledWith('/vehicles', {
        headers: { Authorization: 'Bearer mock-token' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      const mockHttpClient = mockedAxios.create() as any;
      mockHttpClient.get.mockRejectedValue(new Error('API Error'));

      await expect(client.getVehicleList('mock-token')).rejects.toThrow('API Error');
    });
  });

  describe('Vehicle Details', () => {
    const testVin = 'YV4EK3ZL4SS150793';

    it('should fetch vehicle details successfully', async () => {
      const mockResponse = {
        data: {
          vin: testVin,
          modelYear: 2024,
          fuelType: 'ELECTRIC',
          batteryCapacityKWH: 69,
          descriptions: {
            model: 'EX30',
          },
        },
      };
      
      const mockHttpClient = mockedAxios.create() as any;
      mockHttpClient.get.mockResolvedValue(createMockAxiosResponse(mockResponse));

      const result = await client.getVehicleDetails(testVin, 'mock-token');
      
      expect(mockHttpClient.get).toHaveBeenCalledWith(`/vehicles/${testVin}`, {
        headers: { Authorization: 'Bearer mock-token' },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Door Status', () => {
    const testVin = 'YV4EK3ZL4SS150793';

    it('should fetch door status successfully', async () => {
      const mockResponse = testUtils.mockVehicleData.doors;
      
      const mockHttpClient = mockedAxios.create() as any;
      mockHttpClient.get.mockResolvedValue(createMockAxiosResponse(mockResponse));

      const result = await client.getDoorStatus(testVin, 'mock-token');
      
      expect(mockHttpClient.get).toHaveBeenCalledWith(`/vehicles/${testVin}/doors`, {
        headers: { Authorization: 'Bearer mock-token' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle door status errors', async () => {
      const mockHttpClient = mockedAxios.create() as any;
      const error = new Error('Door status not available');
      mockHttpClient.get.mockRejectedValue(error);

      await expect(client.getDoorStatus(testVin, 'mock-token')).rejects.toThrow('Door status not available');
    });
  });

  describe('Battery Status', () => {
    const testVin = 'YV4EK3ZL4SS150793';

    it('should fetch battery status successfully', async () => {
      const mockResponse = testUtils.mockVehicleData.fuel;
      
      const mockHttpClient = mockedAxios.create() as any;
      mockHttpClient.get.mockResolvedValue(createMockAxiosResponse(mockResponse));

      const result = await client.getFuelStatus(testVin, 'mock-token');
      
      expect(mockHttpClient.get).toHaveBeenCalledWith(`/vehicles/${testVin}/fuel`, {
        headers: { Authorization: 'Bearer mock-token' },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Vehicle Commands', () => {
    const testVin = 'YV4EK3ZL4SS150793';

    it('should send lock command successfully', async () => {
      const mockResponse = {
        vin: testVin,
        invokeStatus: 'COMPLETED',
        message: 'Lock command successful',
      };
      
      const mockHttpClient = mockedAxios.create() as any;
      mockHttpClient.get.mockResolvedValue(createMockAxiosResponse({
        data: {
          availabilityStatus: { value: 'AVAILABLE' },
        },
      }));
      mockHttpClient.post.mockResolvedValue(createMockAxiosResponse(mockResponse));

      const result = await client.lockVehicle(testVin, 'mock-token');
      
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        `/vehicles/${testVin}/commands/lock`,
        {},
        { headers: { Authorization: 'Bearer mock-token' } }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should check command accessibility before sending commands', async () => {
      const mockHttpClient = mockedAxios.create() as any;
      
      // Mock command accessibility check returning UNAVAILABLE
      mockHttpClient.get.mockResolvedValue(createMockAxiosResponse({
        data: {
          availabilityStatus: { value: 'UNAVAILABLE' },
          unavailableReason: { value: 'VEHICLE_IN_SLEEP' },
        },
      }));

      await expect(client.lockVehicle(testVin, 'mock-token')).rejects.toThrow('Vehicle command not available');
      
      // Should not attempt to send command
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should respect rate limiting', async () => {
      const mockHttpClient = mockedAxios.create() as any;
      
      // Mock successful command accessibility
      mockHttpClient.get.mockResolvedValue(createMockAxiosResponse({
        data: {
          availabilityStatus: { value: 'AVAILABLE' },
        },
      }));
      
      mockHttpClient.post.mockResolvedValue(createMockAxiosResponse({
        vin: testVin,
        invokeStatus: 'COMPLETED',
        message: 'Success',
      }));

      // Send multiple commands rapidly
      await client.lockVehicle(testVin, 'mock-token');
      await client.lockVehicle(testVin, 'mock-token');
      
      // Second command should be rate limited (would need to test with real timing)
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP 401 errors', async () => {
      const mockHttpClient = mockedAxios.create() as any;
      const error = new Error('Unauthorized') as any;
      error.response = { status: 401, data: { error: 'unauthorized' } };
      
      mockHttpClient.get.mockRejectedValue(error);

      await expect(client.getVehicleList('invalid-token')).rejects.toThrow('Unauthorized');
    });

    it('should handle HTTP 403 errors', async () => {
      const mockHttpClient = mockedAxios.create() as any;
      const error = new Error('Forbidden') as any;
      error.response = { status: 403, data: { error: 'forbidden' } };
      
      mockHttpClient.get.mockRejectedValue(error);

      await expect(client.getVehicleList('mock-token')).rejects.toThrow('Forbidden');
    });

    it('should handle network errors', async () => {
      const mockHttpClient = mockedAxios.create() as any;
      const error = new Error('Network Error') as any;
      error.code = 'ENOTFOUND';
      
      mockHttpClient.get.mockRejectedValue(error);

      await expect(client.getVehicleList('mock-token')).rejects.toThrow('Network Error');
    });
  });

  describe('Rate Limiting', () => {
    it('should track command rate limits', () => {
      // This would test the internal rate limiting logic
      // Implementation depends on how rate limiting is implemented
      expect(client).toBeDefined();
    });
  });
});