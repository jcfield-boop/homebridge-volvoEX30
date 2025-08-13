import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { VolvoEX30Platform } from './platform';
import { EnergyState } from './types/energy-api';

export class VolvoEX30Accessory {
  private batteryService?: Service;
  private informationService: Service;
  
  private currentEnergyState: EnergyState | null = null;
  private updateInterval?: NodeJS.Timeout;

  constructor(
    private readonly platform: VolvoEX30Platform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.informationService = this.accessory.getService(this.platform.Service.AccessoryInformation)!;
    
    this.setupInformationService();
    this.setupBatteryService();
    this.startPolling();
  }

  private setupInformationService(): void {
    this.informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volvo')
      .setCharacteristic(this.platform.Characteristic.Model, 'EX30')
      .setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.vin)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, '1.2.36')
      .setCharacteristic(this.platform.Characteristic.HardwareRevision, '2025')
      .setCharacteristic(this.platform.Characteristic.SoftwareRevision, '1.2.36');
    
    this.platform.log.debug('✅ Accessory information service configured');
  }

  private setupBatteryService(): void {
    if (!this.platform.config.enableBattery) {
      return;
    }

    // Get or create battery service
    this.batteryService = this.accessory.getService(this.platform.Service.Battery) ||
      this.accessory.addService(this.platform.Service.Battery, 'EX30 Battery', 'battery');

    // Set display name and configure for car battery display
    this.batteryService.setCharacteristic(this.platform.Characteristic.Name, 'EX30 Battery');

    // Configure battery level characteristic
    this.batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .onGet(this.getBatteryLevel.bind(this))
      .setProps({
        minValue: 0,
        maxValue: 100,
        minStep: 1,
      });

    // Configure low battery status
    this.batteryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .onGet(this.getStatusLowBattery.bind(this));

    // Configure charging state
    this.batteryService.getCharacteristic(this.platform.Characteristic.ChargingState)
      .onGet(this.getChargingState.bind(this));

    // Set this service as the primary service for proper HomeKit display
    this.batteryService.setPrimaryService(true);
    
    this.platform.log.debug('✅ Battery service configured as primary service');
  }

  private async getBatteryLevel(): Promise<CharacteristicValue> {
    try {
      const energyState = await this.getEnergyState();
      
      if (energyState.batteryChargeLevel.status === 'OK') {
        const batteryLevel = Math.round(energyState.batteryChargeLevel.value);
        this.platform.log.debug('Battery level:', batteryLevel + '%');
        return batteryLevel;
      } else {
        this.platform.log.warn('Battery level not available:', energyState.batteryChargeLevel.message);
        return 0;
      }
    } catch (error) {
      this.platform.log.error('Failed to get battery level:', error);
      return 0;
    }
  }

  private async getStatusLowBattery(): Promise<CharacteristicValue> {
    try {
      const energyState = await this.getEnergyState();
      
      if (energyState.batteryChargeLevel.status === 'OK') {
        const batteryLevel = energyState.batteryChargeLevel.value;
        const isLowBattery = batteryLevel <= 20;
        this.platform.log.debug('Low battery status:', isLowBattery);
        return isLowBattery ? 
          this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : 
          this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
      } else {
        return this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
      }
    } catch (error) {
      this.platform.log.error('Failed to get low battery status:', error);
      return this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }
  }

  private async getChargingState(): Promise<CharacteristicValue> {
    try {
      const energyState = await this.getEnergyState();
      
      if (energyState.chargingStatus.status === 'OK') {
        const chargingStatus = energyState.chargingStatus.value;
        const isCharging = chargingStatus === 'CHARGING';
        
        this.platform.log.debug('Charging state:', chargingStatus, '-> HomeKit:', isCharging ? 'CHARGING' : 'NOT_CHARGING');
        
        return isCharging ? 
          this.platform.Characteristic.ChargingState.CHARGING : 
          this.platform.Characteristic.ChargingState.NOT_CHARGING;
      } else {
        return this.platform.Characteristic.ChargingState.NOT_CHARGING;
      }
    } catch (error) {
      this.platform.log.error('Failed to get charging state:', error);
      return this.platform.Characteristic.ChargingState.NOT_CHARGING;
    }
  }

  private async getEnergyState(): Promise<EnergyState> {
    if (this.currentEnergyState) {
      return this.currentEnergyState;
    }

    const apiClient = this.platform.getApiClient();
    const energyState = await apiClient.getEnergyState(this.platform.config.vin);
    this.currentEnergyState = energyState;
    
    return energyState;
  }

  private startPolling(): void {
    const pollingInterval = (this.platform.config.pollingInterval || 5) * 60 * 1000;
    
    this.platform.log.debug(`Starting polling every ${pollingInterval / 1000 / 60} minutes`);
    
    this.updateInterval = setInterval(async () => {
      try {
        this.platform.log.debug('Polling for energy state updates');
        
        const apiClient = this.platform.getApiClient();
        apiClient.clearCache();
        
        const energyState = await apiClient.getEnergyState(this.platform.config.vin);
        this.currentEnergyState = energyState;
        
        if (this.batteryService) {
          this.batteryService.updateCharacteristic(
            this.platform.Characteristic.BatteryLevel, 
            await this.getBatteryLevel(),
          );
          this.batteryService.updateCharacteristic(
            this.platform.Characteristic.StatusLowBattery, 
            await this.getStatusLowBattery(),
          );
          this.batteryService.updateCharacteristic(
            this.platform.Characteristic.ChargingState, 
            await this.getChargingState(),
          );
        }
        
        this.platform.log.debug('Updated energy state from polling');
      } catch (error) {
        this.platform.log.error('Error during polling:', error);
      }
    }, pollingInterval);
    
    this.updateEnergyStateImmediately();
  }

  private async updateEnergyStateImmediately(): Promise<void> {
    try {
      this.platform.log.debug('Getting initial energy state');
      const apiClient = this.platform.getApiClient();
      const energyState = await apiClient.getEnergyState(this.platform.config.vin);
      this.currentEnergyState = energyState;
      this.platform.log.debug('Got initial energy state');
    } catch (error) {
      this.platform.log.error('Failed to get initial energy state:', error);
    }
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}