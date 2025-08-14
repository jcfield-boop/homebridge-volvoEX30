import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { VolvoEX30Platform } from './platform';
import { EnergyState } from './types/energy-api';

export class VolvoEX30Accessory {
  private batteryService?: Service;
  private batteryTemperatureService?: Service; // Temperature sensor to display battery % (always visible)
  private chargingContactService?: Service; // Contact sensor to show charging state visually
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
    this.setupBatteryTemperatureService(); // Add temperature sensor for always-visible battery level
    this.setupChargingContactService(); // Add contact sensor for charging state display
    this.startPolling();
  }

  private setupInformationService(): void {
    this.informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volvo')
      .setCharacteristic(this.platform.Characteristic.Model, 'EX30')
      .setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.vin)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, '1.2.40')
      .setCharacteristic(this.platform.Characteristic.HardwareRevision, '2025')
      .setCharacteristic(this.platform.Characteristic.SoftwareRevision, '1.2.40');
    
    this.platform.log.debug('✅ Accessory information service configured');
  }

  private setupBatteryService(): void {
    if (!this.platform.config.enableBattery) {
      return;
    }

    // Get or create battery service - force HomeKit to recognize as battery device
    this.batteryService = this.accessory.getService(this.platform.Service.Battery) ||
      this.accessory.addService(this.platform.Service.Battery, 'EX30 Battery', 'battery');

    // Force service name and ensure visibility
    this.batteryService.setCharacteristic(this.platform.Characteristic.Name, 'EX30 Battery');
    this.batteryService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'EX30 Battery');

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

    // Battery service is secondary - humidity sensor will be primary
    this.batteryService.setPrimaryService(false);
    
    // Force initial values to help HomeKit recognize this as a battery
    this.batteryService.setCharacteristic(this.platform.Characteristic.BatteryLevel, 50);
    this.batteryService.setCharacteristic(this.platform.Characteristic.StatusLowBattery, 
      this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
    this.batteryService.setCharacteristic(this.platform.Characteristic.ChargingState, 
      this.platform.Characteristic.ChargingState.NOT_CHARGING);
    
    this.platform.log.info('🔋 Battery service configured as primary service with initial values');
  }

  private setupBatteryTemperatureService(): void {
    if (!this.platform.config.enableBattery) {
      return;
    }

    // Add temperature sensor to display battery percentage (always visible regardless of charging state)
    this.batteryTemperatureService = this.accessory.getService('EX30 Battery Level') ||
      this.accessory.addService(this.platform.Service.TemperatureSensor, 'EX30 Battery Level', 'battery-temperature');

    this.batteryTemperatureService.setCharacteristic(this.platform.Characteristic.Name, 'EX30 Battery Level');
    this.batteryTemperatureService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'EX30 Battery Level');

    // Configure temperature as battery level (0-100° = 0-100%)
    this.batteryTemperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getBatteryLevel.bind(this))
      .setProps({
        minValue: 0,
        maxValue: 100,
        minStep: 1,
      });

    // Set initial value and make this the primary service
    this.batteryTemperatureService.setCharacteristic(this.platform.Characteristic.CurrentTemperature, 50);
    this.batteryTemperatureService.setPrimaryService(true);

    this.platform.log.info('🌡️ Battery temperature sensor configured as PRIMARY service (73° = 73% battery, always visible)');
  }

  private setupChargingContactService(): void {
    if (!this.platform.config.enableBattery) {
      return;
    }

    // Add contact sensor to show charging state (Open = Charging, Closed = Not Charging)
    this.chargingContactService = this.accessory.getService('EX30 Charging') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'EX30 Charging', 'charging-contact');

    this.chargingContactService.setCharacteristic(this.platform.Characteristic.Name, 'EX30 Charging');
    this.chargingContactService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'EX30 Charging');

    // Configure contact state as charging indicator
    this.chargingContactService.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getChargingContactState.bind(this));

    // Set initial value (Closed = Not Charging)
    this.chargingContactService.setCharacteristic(this.platform.Characteristic.ContactSensorState, 
      this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);

    this.platform.log.info('🔌 Charging contact sensor configured (Open=Charging, Closed=Not Charging)');
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

  private async getChargingContactState(): Promise<CharacteristicValue> {
    try {
      const energyState = await this.getEnergyState();
      
      if (energyState.chargingStatus.status === 'OK') {
        const chargingStatus = energyState.chargingStatus.value;
        const isCharging = chargingStatus === 'CHARGING';
        
        this.platform.log.debug('Charging contact state:', chargingStatus, '-> Contact:', isCharging ? 'DETECTED (charging)' : 'NOT_DETECTED (not charging)');
        
        // Contact DETECTED = Charging, Contact NOT_DETECTED = Not Charging
        return isCharging ? 
          this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED : 
          this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
      } else {
        return this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
      }
    } catch (error) {
      this.platform.log.error('Failed to get charging contact state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
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
        
        const batteryLevel = await this.getBatteryLevel();

        if (this.batteryService) {
          this.batteryService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, batteryLevel);
          this.batteryService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, await this.getStatusLowBattery());
          this.batteryService.updateCharacteristic(this.platform.Characteristic.ChargingState, await this.getChargingState());
        }

        // Update temperature sensor with battery percentage (always visible)
        if (this.batteryTemperatureService) {
          this.batteryTemperatureService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, batteryLevel);
        }

        // Update charging contact sensor
        if (this.chargingContactService) {
          this.chargingContactService.updateCharacteristic(this.platform.Characteristic.ContactSensorState, await this.getChargingContactState());
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