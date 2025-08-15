import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { VolvoEX30Platform } from './platform';
import { EnergyState } from './types/energy-api';
import { UnifiedVehicleData } from './api/volvo-api-client';

export class VolvoEX30Accessory {
  private batteryService?: Service;
  private informationService: Service;
  
  // Door and window sensors
  private frontLeftDoorSensor?: Service;
  private frontRightDoorSensor?: Service;
  private rearLeftDoorSensor?: Service;
  private rearRightDoorSensor?: Service;
  private hoodSensor?: Service;
  private tailgateSensor?: Service;
  private frontLeftWindowSensor?: Service;
  private frontRightWindowSensor?: Service;
  private rearLeftWindowSensor?: Service;
  private rearRightWindowSensor?: Service;
  private sunroofSensor?: Service;
  
  // Vehicle control services
  private lockService?: Service;
  private climateService?: Service;
  
  // Diagnostic and maintenance services
  private serviceWarningSensor?: Service;
  private odometerSensor?: Service;
  private tyrePressureSensor?: Service;
  
  private currentEnergyState: EnergyState | null = null;
  private currentUnifiedData: UnifiedVehicleData | null = null;
  private updateInterval?: NodeJS.Timeout;

  constructor(
    private readonly platform: VolvoEX30Platform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.informationService = this.accessory.getService(this.platform.Service.AccessoryInformation)!;
    
    this.setupInformationService();
    this.setupBatteryService();
    this.setupDoorAndWindowSensors();
    this.setupVehicleControlServices();
    this.setupDiagnosticServices();
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

    // Battery service is the primary service
    this.batteryService.setPrimaryService(true);
    
    // Force initial values to help HomeKit recognize this as a battery (without triggering handlers)
    this.batteryService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, 50);
    this.batteryService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, 
      this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
    this.batteryService.updateCharacteristic(this.platform.Characteristic.ChargingState, 
      this.platform.Characteristic.ChargingState.NOT_CHARGING);
    
    this.platform.log.info('🔋 Battery service configured as primary service');
  }
  
  private setupDoorAndWindowSensors(): void {
    if (!this.platform.config.enableDoors) {
      return;
    }
    
    // Door sensors
    this.frontLeftDoorSensor = this.accessory.getService('Front Left Door') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Front Left Door', 'front-left-door');
    this.frontLeftDoorSensor.setCharacteristic(this.platform.Characteristic.Name, 'Front Left Door');
    this.frontLeftDoorSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getFrontLeftDoorState.bind(this));
    
    this.frontRightDoorSensor = this.accessory.getService('Front Right Door') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Front Right Door', 'front-right-door');
    this.frontRightDoorSensor.setCharacteristic(this.platform.Characteristic.Name, 'Front Right Door');
    this.frontRightDoorSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getFrontRightDoorState.bind(this));
    
    this.rearLeftDoorSensor = this.accessory.getService('Rear Left Door') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Rear Left Door', 'rear-left-door');
    this.rearLeftDoorSensor.setCharacteristic(this.platform.Characteristic.Name, 'Rear Left Door');
    this.rearLeftDoorSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getRearLeftDoorState.bind(this));
    
    this.rearRightDoorSensor = this.accessory.getService('Rear Right Door') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Rear Right Door', 'rear-right-door');
    this.rearRightDoorSensor.setCharacteristic(this.platform.Characteristic.Name, 'Rear Right Door');
    this.rearRightDoorSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getRearRightDoorState.bind(this));
    
    this.hoodSensor = this.accessory.getService('Hood') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Hood', 'hood');
    this.hoodSensor.setCharacteristic(this.platform.Characteristic.Name, 'Hood');
    this.hoodSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getHoodState.bind(this));
    
    this.tailgateSensor = this.accessory.getService('Tailgate') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Tailgate', 'tailgate');
    this.tailgateSensor.setCharacteristic(this.platform.Characteristic.Name, 'Tailgate');
    this.tailgateSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getTailgateState.bind(this));
    
    // Window sensors
    this.frontLeftWindowSensor = this.accessory.getService('Front Left Window') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Front Left Window', 'front-left-window');
    this.frontLeftWindowSensor.setCharacteristic(this.platform.Characteristic.Name, 'Front Left Window');
    this.frontLeftWindowSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getFrontLeftWindowState.bind(this));
    
    this.frontRightWindowSensor = this.accessory.getService('Front Right Window') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Front Right Window', 'front-right-window');
    this.frontRightWindowSensor.setCharacteristic(this.platform.Characteristic.Name, 'Front Right Window');
    this.frontRightWindowSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getFrontRightWindowState.bind(this));
    
    this.rearLeftWindowSensor = this.accessory.getService('Rear Left Window') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Rear Left Window', 'rear-left-window');
    this.rearLeftWindowSensor.setCharacteristic(this.platform.Characteristic.Name, 'Rear Left Window');
    this.rearLeftWindowSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getRearLeftWindowState.bind(this));
    
    this.rearRightWindowSensor = this.accessory.getService('Rear Right Window') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Rear Right Window', 'rear-right-window');
    this.rearRightWindowSensor.setCharacteristic(this.platform.Characteristic.Name, 'Rear Right Window');
    this.rearRightWindowSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getRearRightWindowState.bind(this));
    
    this.sunroofSensor = this.accessory.getService('Sunroof') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Sunroof', 'sunroof');
    this.sunroofSensor.setCharacteristic(this.platform.Characteristic.Name, 'Sunroof');
    this.sunroofSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getSunroofState.bind(this));
    
    this.platform.log.info('🚗 Door and window sensors configured');
  }
  
  private setupVehicleControlServices(): void {
    // Lock/Unlock service
    if (this.platform.config.enableLocks) {
      this.lockService = this.accessory.getService('Vehicle Lock') ||
        this.accessory.addService(this.platform.Service.LockManagement, 'Vehicle Lock', 'vehicle-lock');
      
      this.lockService.setCharacteristic(this.platform.Characteristic.Name, 'Vehicle Lock');
      
      this.lockService.getCharacteristic(this.platform.Characteristic.LockCurrentState)
        .onGet(this.getCurrentLockState.bind(this));
      
      this.lockService.getCharacteristic(this.platform.Characteristic.LockTargetState)
        .onGet(this.getTargetLockState.bind(this))
        .onSet(this.setTargetLockState.bind(this));
      
      // Set initial lock state without triggering commands
      this.lockService.updateCharacteristic(this.platform.Characteristic.LockCurrentState, 
        this.platform.Characteristic.LockCurrentState.SECURED);
      this.lockService.updateCharacteristic(this.platform.Characteristic.LockTargetState,
        this.platform.Characteristic.LockTargetState.SECURED);
        
      this.platform.log.info('🔒 Vehicle lock service configured');
    }
    
    // Climate control service
    if (this.platform.config.enableClimate) {
      this.climateService = this.accessory.getService('Climate Control') ||
        this.accessory.addService(this.platform.Service.Switch, 'Climate Control', 'climate-control');
      
      this.climateService.setCharacteristic(this.platform.Characteristic.Name, 'Climate Control');
      
      this.climateService.getCharacteristic(this.platform.Characteristic.On)
        .onGet(this.getClimatizationState.bind(this))
        .onSet(this.setClimatizationState.bind(this));
      
      // Set initial climate state without triggering commands
      this.climateService.updateCharacteristic(this.platform.Characteristic.On, false);
      
      this.platform.log.info('🌡️ Climate control service configured');
    }
  }
  
  private setupDiagnosticServices(): void {
    // Service warning sensor
    this.serviceWarningSensor = this.accessory.getService('Service Warning') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Service Warning', 'service-warning');
    
    this.serviceWarningSensor.setCharacteristic(this.platform.Characteristic.Name, 'Service Warning');
    this.serviceWarningSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getServiceWarningState.bind(this));
    
    // Odometer sensor (using motion sensor to show current reading)
    this.odometerSensor = this.accessory.getService('Odometer') ||
      this.accessory.addService(this.platform.Service.MotionSensor, 'Odometer', 'odometer');
    
    this.odometerSensor.setCharacteristic(this.platform.Characteristic.Name, 'Odometer');
    this.odometerSensor.getCharacteristic(this.platform.Characteristic.MotionDetected)
      .onGet(this.getOdometerState.bind(this));
    
    // Tyre pressure warning sensor  
    this.tyrePressureSensor = this.accessory.getService('Tyre Pressure') ||
      this.accessory.addService(this.platform.Service.ContactSensor, 'Tyre Pressure', 'tyre-pressure');
    
    this.tyrePressureSensor.setCharacteristic(this.platform.Characteristic.Name, 'Tyre Pressure');
    this.tyrePressureSensor.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getTyrePressureState.bind(this));
    
    this.platform.log.info('🔍 Diagnostic and maintenance services configured');
  }


  private async getBatteryLevel(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      
      if (unifiedData.batteryLevel !== undefined && unifiedData.batteryStatus === 'OK') {
        const batteryLevel = Math.round(unifiedData.batteryLevel);
        this.platform.log.debug(`Battery level: ${batteryLevel}% (source: ${unifiedData.dataSource})`);
        return batteryLevel;
      } else {
        this.platform.log.warn('Battery level not available from unified data');
        
        // Fallback to Energy API if unified data fails
        const energyState = await this.getEnergyState();
        if (energyState.batteryChargeLevel.status === 'OK') {
          const batteryLevel = Math.round(energyState.batteryChargeLevel.value);
          this.platform.log.debug('Battery level (Energy API fallback):', batteryLevel + '%');
          return batteryLevel;
        }
        
        return 0;
      }
    } catch (error) {
      this.platform.log.error('Failed to get battery level:', error);
      return 0;
    }
  }

  private async getStatusLowBattery(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      
      if (unifiedData.batteryLevel !== undefined && unifiedData.batteryStatus === 'OK') {
        const batteryLevel = unifiedData.batteryLevel;
        const isLowBattery = batteryLevel <= 20;
        this.platform.log.debug(`Low battery status: ${isLowBattery} (${batteryLevel}%)`);
        return isLowBattery ? 
          this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : 
          this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
      } else {
        // Fallback to Energy API
        const energyState = await this.getEnergyState();
        if (energyState.batteryChargeLevel.status === 'OK') {
          const batteryLevel = energyState.batteryChargeLevel.value;
          const isLowBattery = batteryLevel <= 20;
          return isLowBattery ? 
            this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : 
            this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        }
        
        return this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
      }
    } catch (error) {
      this.platform.log.error('Failed to get low battery status:', error);
      return this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }
  }

  private async getChargingState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      
      if (unifiedData.chargingState !== undefined) {
        const isCharging = unifiedData.chargingState === 'CHARGING';
        
        this.platform.log.debug(`Charging state: ${unifiedData.chargingState} -> HomeKit: ${isCharging ? 'CHARGING' : 'NOT_CHARGING'}`);
        
        return isCharging ? 
          this.platform.Characteristic.ChargingState.CHARGING : 
          this.platform.Characteristic.ChargingState.NOT_CHARGING;
      } else {
        // Fallback to Energy API
        const energyState = await this.getEnergyState();
        if (energyState.chargingStatus.status === 'OK') {
          const chargingStatus = energyState.chargingStatus.value;
          const isCharging = chargingStatus === 'CHARGING';
          return isCharging ? 
            this.platform.Characteristic.ChargingState.CHARGING : 
            this.platform.Characteristic.ChargingState.NOT_CHARGING;
        }
        
        return this.platform.Characteristic.ChargingState.NOT_CHARGING;
      }
    } catch (error) {
      this.platform.log.error('Failed to get charging state:', error);
      return this.platform.Characteristic.ChargingState.NOT_CHARGING;
    }
  }


  private async getUnifiedVehicleData(): Promise<UnifiedVehicleData> {
    if (this.currentUnifiedData) {
      return this.currentUnifiedData;
    }

    const apiClient = this.platform.getApiClient();
    const unifiedData = await apiClient.getUnifiedVehicleData(this.platform.config.vin);
    this.currentUnifiedData = unifiedData;
    
    return unifiedData;
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
        this.platform.log.debug('Polling for vehicle data updates');
        
        const apiClient = this.platform.getApiClient();
        apiClient.clearCache();
        
        // Clear cached data to force fresh fetch
        this.currentUnifiedData = null;
        this.currentEnergyState = null;
        
        const unifiedData = await apiClient.getUnifiedVehicleData(this.platform.config.vin);
        this.currentUnifiedData = unifiedData;
        
        const batteryLevel = await this.getBatteryLevel();

        if (this.batteryService) {
          this.batteryService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, batteryLevel);
          this.batteryService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, await this.getStatusLowBattery());
          this.batteryService.updateCharacteristic(this.platform.Characteristic.ChargingState, await this.getChargingState());
        }

        // Update door and window sensors if enabled
        if (this.platform.config.enableDoors) {
          await this.updateDoorAndWindowSensors();
        }
        
        // Update lock service if enabled
        if (this.platform.config.enableLocks) {
          await this.updateLockService();
        }
        
        // Update diagnostic services
        await this.updateDiagnosticServices();

        this.platform.log.debug(`Updated vehicle data from polling (source: ${unifiedData.dataSource})`);
      } catch (error) {
        this.platform.log.error('Error during polling:', error);
      }
    }, pollingInterval);
    
    this.updateEnergyStateImmediately();
  }

  private async updateEnergyStateImmediately(): Promise<void> {
    try {
      this.platform.log.debug('Getting initial vehicle data');
      const apiClient = this.platform.getApiClient();
      const unifiedData = await apiClient.getUnifiedVehicleData(this.platform.config.vin);
      this.currentUnifiedData = unifiedData;
      this.platform.log.debug(`Got initial vehicle data (source: ${unifiedData.dataSource})`);
    } catch (error) {
      this.platform.log.error('Failed to get initial vehicle data:', error);
      // Fallback to Energy API
      try {
        const apiClient = this.platform.getApiClient();
        const energyState = await apiClient.getEnergyState(this.platform.config.vin);
        this.currentEnergyState = energyState;
        this.platform.log.debug('Got initial energy state as fallback');
      } catch (fallbackError) {
        this.platform.log.error('Fallback to Energy API also failed:', fallbackError);
      }
    }
  }
  
  // Door sensor getters
  private async getFrontLeftDoorState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const doorState = unifiedData.frontLeftDoor;
      
      if (doorState === 'OPEN') {
        return this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED; // Open
      } else if (doorState === 'CLOSED') {
        return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED; // Closed
      }
      
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED; // Default to closed
    } catch (error) {
      this.platform.log.error('Failed to get front left door state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getFrontRightDoorState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const doorState = unifiedData.frontRightDoor;
      
      return doorState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.platform.log.error('Failed to get front right door state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getRearLeftDoorState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const doorState = unifiedData.rearLeftDoor;
      
      return doorState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.platform.log.error('Failed to get rear left door state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getRearRightDoorState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const doorState = unifiedData.rearRightDoor;
      
      return doorState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.platform.log.error('Failed to get rear right door state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getHoodState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const hoodState = unifiedData.hood;
      
      return hoodState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.platform.log.error('Failed to get hood state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getTailgateState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const tailgateState = unifiedData.tailgate;
      
      return tailgateState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.platform.log.error('Failed to get tailgate state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  // Window sensor getters
  private async getFrontLeftWindowState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const windowState = unifiedData.frontLeftWindow;
      
      return windowState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.platform.log.error('Failed to get front left window state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getFrontRightWindowState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const windowState = unifiedData.frontRightWindow;
      
      return windowState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.platform.log.error('Failed to get front right window state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getRearLeftWindowState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const windowState = unifiedData.rearLeftWindow;
      
      return windowState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.platform.log.error('Failed to get rear left window state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getRearRightWindowState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const windowState = unifiedData.rearRightWindow;
      
      return windowState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.platform.log.error('Failed to get rear right window state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getSunroofState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const sunroofState = unifiedData.sunroof;
      
      return sunroofState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.platform.log.error('Failed to get sunroof state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async updateDoorAndWindowSensors(): Promise<void> {
    try {
      // Update all door sensors
      if (this.frontLeftDoorSensor) {
        this.frontLeftDoorSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getFrontLeftDoorState()
        );
      }
      
      if (this.frontRightDoorSensor) {
        this.frontRightDoorSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getFrontRightDoorState()
        );
      }
      
      if (this.rearLeftDoorSensor) {
        this.rearLeftDoorSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getRearLeftDoorState()
        );
      }
      
      if (this.rearRightDoorSensor) {
        this.rearRightDoorSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getRearRightDoorState()
        );
      }
      
      if (this.hoodSensor) {
        this.hoodSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getHoodState()
        );
      }
      
      if (this.tailgateSensor) {
        this.tailgateSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getTailgateState()
        );
      }
      
      // Update all window sensors
      if (this.frontLeftWindowSensor) {
        this.frontLeftWindowSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getFrontLeftWindowState()
        );
      }
      
      if (this.frontRightWindowSensor) {
        this.frontRightWindowSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getFrontRightWindowState()
        );
      }
      
      if (this.rearLeftWindowSensor) {
        this.rearLeftWindowSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getRearLeftWindowState()
        );
      }
      
      if (this.rearRightWindowSensor) {
        this.rearRightWindowSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getRearRightWindowState()
        );
      }
      
      if (this.sunroofSensor) {
        this.sunroofSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getSunroofState()
        );
      }
      
    } catch (error) {
      this.platform.log.error('Failed to update door and window sensors:', error);
    }
  }
  
  // Lock service methods
  private async getCurrentLockState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const lockState = unifiedData.centralLockStatus;
      
      if (lockState === 'LOCKED') {
        return this.platform.Characteristic.LockCurrentState.SECURED;
      } else if (lockState === 'UNLOCKED') {
        return this.platform.Characteristic.LockCurrentState.UNSECURED;
      }
      
      return this.platform.Characteristic.LockCurrentState.UNKNOWN;
    } catch (error) {
      this.platform.log.error('Failed to get current lock state:', error);
      return this.platform.Characteristic.LockCurrentState.UNKNOWN;
    }
  }
  
  private async getTargetLockState(): Promise<CharacteristicValue> {
    // For simplicity, target state matches current state
    const currentState = await this.getCurrentLockState();
    if (currentState === this.platform.Characteristic.LockCurrentState.SECURED) {
      return this.platform.Characteristic.LockTargetState.SECURED;
    } else if (currentState === this.platform.Characteristic.LockCurrentState.UNSECURED) {
      return this.platform.Characteristic.LockTargetState.UNSECURED;
    }
    
    return this.platform.Characteristic.LockTargetState.SECURED;
  }
  
  private async setTargetLockState(value: CharacteristicValue): Promise<void> {
    try {
      const apiClient = this.platform.getApiClient();
      const vin = this.platform.config.vin;
      
      if (value === this.platform.Characteristic.LockTargetState.SECURED) {
        this.platform.log.info('🔒 Locking vehicle...');
        const result = await apiClient.lockVehicle(vin);
        this.platform.log.info(`Lock command result: ${result.invokeStatus}`);
        
        // Update current state after successful command
        if (result.invokeStatus === 'COMPLETED' || result.invokeStatus === 'SUCCESS') {
          this.lockService?.setCharacteristic(
            this.platform.Characteristic.LockCurrentState,
            this.platform.Characteristic.LockCurrentState.SECURED
          );
        }
        
      } else if (value === this.platform.Characteristic.LockTargetState.UNSECURED) {
        this.platform.log.info('🔓 Unlocking vehicle...');
        const result = await apiClient.unlockVehicle(vin);
        this.platform.log.info(`Unlock command result: ${result.invokeStatus}`);
        
        // Update current state after successful command
        if (result.invokeStatus === 'COMPLETED' || result.invokeStatus === 'SUCCESS') {
          this.lockService?.setCharacteristic(
            this.platform.Characteristic.LockCurrentState,
            this.platform.Characteristic.LockCurrentState.UNSECURED
          );
        }
      }
      
      // Clear cache to get fresh data on next poll
      apiClient.clearCache();
      this.currentUnifiedData = null;
      
    } catch (error) {
      // Handle rate limiting gracefully
      if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
        this.platform.log.warn('⏰ Vehicle lock command rate limited. Please wait before trying again.');
        this.platform.log.warn('💡 Tip: Volvo limits vehicle commands to 10 per minute for safety.');
      } else {
        this.platform.log.error('Failed to set lock state:', error);
      }
      
      // Revert target state on error (without triggering commands)
      const currentState = await this.getCurrentLockState();
      if (currentState === this.platform.Characteristic.LockCurrentState.SECURED) {
        this.lockService?.updateCharacteristic(
          this.platform.Characteristic.LockTargetState,
          this.platform.Characteristic.LockTargetState.SECURED
        );
      } else {
        this.lockService?.updateCharacteristic(
          this.platform.Characteristic.LockTargetState,
          this.platform.Characteristic.LockTargetState.UNSECURED
        );
      }
      
      throw error;
    }
  }
  
  // Climate control methods
  private async getClimatizationState(): Promise<CharacteristicValue> {
    // Climate state isn't directly available from APIs
    // For now, we'll default to false (off)
    // In a real implementation, this could be inferred from other data
    return false;
  }
  
  private async setClimatizationState(value: CharacteristicValue): Promise<void> {
    try {
      const apiClient = this.platform.getApiClient();
      const vin = this.platform.config.vin;
      
      if (value as boolean) {
        this.platform.log.info('🌡️ Starting climatization...');
        const result = await apiClient.startClimatization(vin);
        this.platform.log.info(`Start climatization result: ${result.invokeStatus}`);
        
      } else {
        this.platform.log.info('❄️ Stopping climatization...');
        const result = await apiClient.stopClimatization(vin);
        this.platform.log.info(`Stop climatization result: ${result.invokeStatus}`);
      }
      
      // Clear cache to get fresh data
      apiClient.clearCache();
      this.currentUnifiedData = null;
      
    } catch (error) {
      // Handle rate limiting gracefully
      if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
        this.platform.log.warn('⏰ Climate control rate limited. Please wait before trying again.');
        this.platform.log.warn('💡 Tip: Volvo limits vehicle commands to 10 per minute for safety.');
      } else {
        this.platform.log.error('Failed to set climatization state:', error);
      }
      
      // Revert the switch state on error (without triggering commands)
      this.climateService?.updateCharacteristic(this.platform.Characteristic.On, !value);
      throw error;
    }
  }
  
  private async updateLockService(): Promise<void> {
    try {
      if (this.lockService) {
        const currentState = await this.getCurrentLockState();
        this.lockService.updateCharacteristic(
          this.platform.Characteristic.LockCurrentState,
          currentState
        );
        
        // Update target state to match current state
        const targetState = currentState === this.platform.Characteristic.LockCurrentState.SECURED ?
          this.platform.Characteristic.LockTargetState.SECURED :
          this.platform.Characteristic.LockTargetState.UNSECURED;
        
        this.lockService.updateCharacteristic(
          this.platform.Characteristic.LockTargetState,
          targetState
        );
      }
    } catch (error) {
      this.platform.log.error('Failed to update lock service:', error);
    }
  }
  
  // Diagnostic service methods
  private async getServiceWarningState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const serviceWarning = unifiedData.serviceWarning;
      
      // If there's a warning, show as "contact not detected" (open/alert)
      if (serviceWarning === 'WARNING') {
        this.platform.log.warn('Service warning detected!');
        return this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
      } else if (serviceWarning === 'NO_WARNING') {
        return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
      }
      
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED; // Default to no warning
    } catch (error) {
      this.platform.log.error('Failed to get service warning state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getOdometerState(): Promise<CharacteristicValue> {
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      
      // Motion sensor is used to indicate if odometer data is available
      // In practice, this will always be true if we have vehicle data
      if (unifiedData.odometer !== undefined) {
        const odometer = unifiedData.odometer;
        this.platform.log.debug(`Current odometer reading: ${odometer} km`);
        return true; // Motion detected = data available
      }
      
      return false;
    } catch (error) {
      this.platform.log.error('Failed to get odometer state:', error);
      return false;
    }
  }
  
  private async getTyrePressureState(): Promise<CharacteristicValue> {
    try {
      const connectedVehicleState = await this.platform.getApiClient().getConnectedVehicleState(this.platform.config.vin);
      
      // Check all tyre pressures for warnings
      if (connectedVehicleState.tyrePressure) {
        const tyres = connectedVehicleState.tyrePressure;
        const hasWarning = 
          tyres.frontLeft?.value === 'WARNING' ||
          tyres.frontRight?.value === 'WARNING' ||
          tyres.rearLeft?.value === 'WARNING' ||
          tyres.rearRight?.value === 'WARNING';
        
        if (hasWarning) {
          this.platform.log.warn('Tyre pressure warning detected!');
          return this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED; // Warning state
        }
        
        return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED; // All OK
      }
      
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.platform.log.error('Failed to get tyre pressure state:', error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async updateDiagnosticServices(): Promise<void> {
    try {
      // Update service warning sensor
      if (this.serviceWarningSensor) {
        this.serviceWarningSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getServiceWarningState()
        );
      }
      
      // Update odometer sensor
      if (this.odometerSensor) {
        this.odometerSensor.updateCharacteristic(
          this.platform.Characteristic.MotionDetected,
          await this.getOdometerState()
        );
      }
      
      // Update tyre pressure sensor
      if (this.tyrePressureSensor) {
        this.tyrePressureSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getTyrePressureState()
        );
      }
      
    } catch (error) {
      this.platform.log.error('Failed to update diagnostic services:', error);
    }
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Clear cached data
    this.currentEnergyState = null;
    this.currentUnifiedData = null;
  }
}