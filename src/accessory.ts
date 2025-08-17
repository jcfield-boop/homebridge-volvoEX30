import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { VolvoEX30Platform } from './platform';
import { UnifiedVehicleData } from './api/volvo-api-client';
import { OAuthHandler } from './auth/oauth-handler';

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
  private locateService?: Service; // Honk & Flash service
  
  // Diagnostic and maintenance services
  private serviceWarningSensor?: Service;
  private odometerSensor?: Service;
  private tyrePressureSensor?: Service;
  
  private currentUnifiedData: UnifiedVehicleData | null = null;
  private updateInterval?: NodeJS.Timeout;
  
  // Global authentication failure tracking (uses OAuthHandler.globalAuthFailure)
  private authFailureTime: number = 0;
  private authErrorLogged: boolean = false;

  constructor(
    private readonly platform: VolvoEX30Platform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.informationService = this.accessory.getService(this.platform.Service.AccessoryInformation)!;
    
    this.initializeAccessory();
  }

  /**
   * Initialize accessory with proper startup sequence
   */
  private async initializeAccessory(): Promise<void> {
    this.setupInformationService();
    
    // Attempt initial data fetch - this will set auth failure state if needed
    await this.performInitialDataFetch();
    
    // Setup services based on presentation mode
    const presentationMode = this.platform.config.presentationMode || 'simple';
    
    if (presentationMode === 'simple') {
      this.setupSimplePresentationServices();
    } else {
      this.setupAdvancedPresentationServices();
    }
    
    this.startPolling();
  }

  /**
   * Perform initial data fetch with fail-fast error handling
   */
  private async performInitialDataFetch(): Promise<void> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return;
    }
    
    try {
      const apiClient = this.platform.getApiClient();
      const unifiedData = await apiClient.getUnifiedVehicleData(this.platform.config.vin);
      this.currentUnifiedData = unifiedData;
      this.platform.log.debug('✅ Initial vehicle data loaded');
    } catch (error) {
      this.handleAuthFailure(error);
    }
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
    
    this.platform.log.debug('🔋 Battery service configured as primary service');
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
    
    this.platform.log.debug('🚗 Door and window sensors configured');
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
        
      this.platform.log.debug('🔒 Vehicle lock service configured');
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
      
      this.platform.log.debug('🌡️ Climate control service configured');
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
    
    this.platform.log.debug('🔍 Diagnostic and maintenance services configured');
  }

  /**
   * Setup simple presentation with 4 core tiles
   */
  private setupSimplePresentationServices(): void {
    this.platform.log.info('🎯 Setting up Simple Presentation Mode - 4 Core Tiles');
    
    // 1. Volvo Battery (always enabled)
    this.setupVolvoBattery();
    
    // 2. Volvo Lock (always enabled)
    this.setupVolvoLock();
    
    // 3. Volvo Climate (always enabled)
    this.setupVolvoClimate();
    
    // 4. Volvo Locate (Honk & Flash) - conditionally enabled
    if (this.platform.config.enableHonkFlash !== false) {
      this.setupVolvoLocate();
    }
    
    this.platform.log.info('✅ Simple presentation configured - 4 core tiles');
  }

  /**
   * Setup advanced presentation with all sensors
   */
  private setupAdvancedPresentationServices(): void {
    this.platform.log.info('🔧 Setting up Advanced Presentation Mode - All Sensors');
    
    // Core services (always enabled in advanced mode)
    this.setupVolvoBattery();
    this.setupVolvoLock();
    this.setupVolvoClimate();
    
    if (this.platform.config.enableHonkFlash !== false) {
      this.setupVolvoLocate();
    }
    
    // Advanced sensors (conditionally enabled)
    if (this.platform.config.enableAdvancedSensors !== false) {
      this.setupDoorAndWindowSensors();
      this.setupDiagnosticServices();
    }
    
    this.platform.log.info('✅ Advanced presentation configured - all sensors');
  }

  /**
   * Setup Volvo Battery with plain naming
   */
  private setupVolvoBattery(): void {
    this.batteryService = this.accessory.getService(this.platform.Service.Battery) ||
      this.accessory.addService(this.platform.Service.Battery, 'Volvo Battery', 'volvo-battery');

    this.batteryService.setCharacteristic(this.platform.Characteristic.Name, 'Volvo Battery');
    this.batteryService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Volvo Battery');

    this.batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .onGet(this.getBatteryLevel.bind(this))
      .setProps({
        minValue: 0,
        maxValue: 100,
        minStep: 1,
      });

    this.batteryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .onGet(this.getStatusLowBattery.bind(this));

    this.batteryService.getCharacteristic(this.platform.Characteristic.ChargingState)
      .onGet(this.getChargingState.bind(this));

    this.batteryService.setPrimaryService(true);
    
    // Set initial values
    this.batteryService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, 50);
    this.batteryService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, 
      this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
    this.batteryService.updateCharacteristic(this.platform.Characteristic.ChargingState, 
      this.platform.Characteristic.ChargingState.NOT_CHARGING);
    
    this.platform.log.debug('🔋 Volvo Battery service configured');
  }

  /**
   * Setup Volvo Lock with plain naming
   */
  private setupVolvoLock(): void {
    this.lockService = this.accessory.getService('Vehicle Lock') ||
      this.accessory.addService(this.platform.Service.LockManagement, 'Volvo Lock', 'volvo-lock');
    
    this.lockService.setCharacteristic(this.platform.Characteristic.Name, 'Volvo Lock');
    this.lockService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Volvo Lock');
    
    this.lockService.getCharacteristic(this.platform.Characteristic.LockCurrentState)
      .onGet(this.getCurrentLockState.bind(this));
    
    this.lockService.getCharacteristic(this.platform.Characteristic.LockTargetState)
      .onGet(this.getTargetLockState.bind(this))
      .onSet(this.setTargetLockState.bind(this));
    
    // Set initial lock state
    this.lockService.updateCharacteristic(this.platform.Characteristic.LockCurrentState, 
      this.platform.Characteristic.LockCurrentState.SECURED);
    this.lockService.updateCharacteristic(this.platform.Characteristic.LockTargetState,
      this.platform.Characteristic.LockTargetState.SECURED);
      
    this.platform.log.debug('🔒 Volvo Lock service configured');
  }

  /**
   * Setup Volvo Climate with plain naming
   */
  private setupVolvoClimate(): void {
    this.climateService = this.accessory.getService('Climate Control') ||
      this.accessory.addService(this.platform.Service.Switch, 'Volvo Climate', 'volvo-climate');
    
    this.climateService.setCharacteristic(this.platform.Characteristic.Name, 'Volvo Climate');
    this.climateService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Volvo Climate');
    
    this.climateService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.getClimatizationState.bind(this))
      .onSet(this.setClimatizationState.bind(this));
    
    // Set initial climate state
    this.climateService.updateCharacteristic(this.platform.Characteristic.On, false);
    
    this.platform.log.debug('🌡️ Volvo Climate service configured');
  }

  /**
   * Setup Volvo Locate (Honk & Flash) with plain naming
   */
  private setupVolvoLocate(): void {
    // Remove any existing locate service to prevent UUID conflicts
    const existingService = this.accessory.getServiceById(this.platform.Service.Switch, 'volvo-locate');
    if (existingService) {
      this.accessory.removeService(existingService);
    }
    
    this.locateService = this.accessory.addService(this.platform.Service.Switch, 'Volvo Locate', 'volvo-locate');
    
    this.locateService.setCharacteristic(this.platform.Characteristic.Name, 'Volvo Locate');
    this.locateService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Volvo Locate');
    
    this.locateService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.getLocateState.bind(this))
      .onSet(this.setLocateState.bind(this));
    
    // Set initial locate state (always off)
    this.locateService.updateCharacteristic(this.platform.Characteristic.On, false);
    
    this.platform.log.debug('📍 Volvo Locate service configured');
  }

  private async getBatteryLevel(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return 50; // Safe default
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      
      if (unifiedData?.batteryLevel !== undefined && unifiedData.batteryStatus === 'OK') {
        return Math.round(unifiedData.batteryLevel);
      }
      return 0;
    } catch (error) {
      this.handleAuthFailure(error);
      return 0;
    }
  }

  private async getStatusLowBattery(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      
      if (unifiedData.batteryLevel !== undefined && unifiedData.batteryStatus === 'OK') {
        const isLowBattery = unifiedData.batteryLevel <= 20;
        return isLowBattery ? 
          this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : 
          this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
      }
      return this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }
  }

  private async getChargingState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ChargingState.NOT_CHARGING;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      
      if (unifiedData.chargingState !== undefined) {
        const isCharging = unifiedData.chargingState === 'CHARGING';
        return isCharging ? 
          this.platform.Characteristic.ChargingState.CHARGING : 
          this.platform.Characteristic.ChargingState.NOT_CHARGING;
      }
      return this.platform.Characteristic.ChargingState.NOT_CHARGING;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ChargingState.NOT_CHARGING;
    }
  }


  private async getUnifiedVehicleData(): Promise<UnifiedVehicleData> {
    // EMERGENCY FAIL-FAST: Block ALL API calls if authentication has failed
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.getDefaultVehicleData();
    }
    
    if (this.currentUnifiedData) {
      return this.currentUnifiedData;
    }

    try {
      const apiClient = this.platform.getApiClient();
      const unifiedData = await apiClient.getUnifiedVehicleData(this.platform.config.vin);
      this.currentUnifiedData = unifiedData;
      return unifiedData;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.getDefaultVehicleData();
    }
  }

  /**
   * Return safe default vehicle data when authentication has failed
   * This prevents HomeKit services from erroring out during auth failures
   */
  private getDefaultVehicleData(): UnifiedVehicleData {
    return {
      batteryLevel: 50, // Safe default
      batteryStatus: 'OK',
      chargingState: 'NOT_CHARGING',
      centralLockStatus: 'UNKNOWN',
      frontLeftDoor: 'UNKNOWN',
      frontRightDoor: 'UNKNOWN',
      rearLeftDoor: 'UNKNOWN',
      rearRightDoor: 'UNKNOWN',
      hood: 'UNKNOWN',
      tailgate: 'UNKNOWN',
      frontLeftWindow: 'UNKNOWN',
      frontRightWindow: 'UNKNOWN',
      rearLeftWindow: 'UNKNOWN',
      rearRightWindow: 'UNKNOWN',
      sunroof: 'UNKNOWN',
      serviceWarning: 'UNKNOWN',
      odometer: 0,
      canLock: false,
      canUnlock: false,
      canStartClimatization: false,
      canStopClimatization: false,
      lastUpdated: new Date().toISOString(),
      dataSource: 'connected-vehicle-api',
    };
  }

  private startPolling(): void {
    const pollingInterval = (this.platform.config.pollingInterval || 5) * 60 * 1000;
    
    this.platform.log.debug('📡 Starting periodic polling');
    
    this.updateInterval = setInterval(async () => {
      // EMERGENCY FAIL-FAST: Skip all polling if authentication has failed
      if (OAuthHandler.isGlobalAuthFailure) {
        return;
      }
      
      try {
        const apiClient = this.platform.getApiClient();
        apiClient.clearCache();
        this.currentUnifiedData = null;
        
        const unifiedData = await this.getUnifiedVehicleData();
        const batteryLevel = await this.getBatteryLevel();

        if (this.batteryService) {
          this.batteryService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, batteryLevel);
          this.batteryService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, await this.getStatusLowBattery());
          this.batteryService.updateCharacteristic(this.platform.Characteristic.ChargingState, await this.getChargingState());
        }

        if (this.platform.config.enableDoors) {
          await this.updateDoorAndWindowSensors();
        }
        
        if (this.platform.config.enableLocks) {
          await this.updateLockService();
        }
        
        await this.updateDiagnosticServices();

        this.platform.log.debug('📊 Vehicle data updated');
      } catch (error) {
        this.handleAuthFailure(error);
      }
    }, pollingInterval);
    
    this.updateEnergyStateImmediately();
  }

  private async updateEnergyStateImmediately(): Promise<void> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      this.platform.log.debug('📊 Initial vehicle data loaded');
    } catch (error) {
      this.handleAuthFailure(error);
    }
  }
  
  // Door sensor getters
  private async getFrontLeftDoorState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const doorState = unifiedData.frontLeftDoor;
      
      if (doorState === 'OPEN') {
        return this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
      } else if (doorState === 'CLOSED') {
        return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
      }
      
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getFrontRightDoorState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const doorState = unifiedData.frontRightDoor;
      
      return doorState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getRearLeftDoorState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const doorState = unifiedData.rearLeftDoor;
      
      return doorState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getRearRightDoorState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const doorState = unifiedData.rearRightDoor;
      
      return doorState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getHoodState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const hoodState = unifiedData.hood;
      
      return hoodState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getTailgateState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const tailgateState = unifiedData.tailgate;
      
      return tailgateState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  // Window sensor getters
  private async getFrontLeftWindowState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const windowState = unifiedData.frontLeftWindow;
      
      return windowState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getFrontRightWindowState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const windowState = unifiedData.frontRightWindow;
      
      return windowState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getRearLeftWindowState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const windowState = unifiedData.rearLeftWindow;
      
      return windowState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getRearRightWindowState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const windowState = unifiedData.rearRightWindow;
      
      return windowState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getSunroofState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const sunroofState = unifiedData.sunroof;
      
      return sunroofState === 'OPEN' ? 
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async updateDoorAndWindowSensors(): Promise<void> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return;
    }
    
    try {
      if (this.frontLeftDoorSensor) {
        this.frontLeftDoorSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getFrontLeftDoorState(),
        );
      }
      
      if (this.frontRightDoorSensor) {
        this.frontRightDoorSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getFrontRightDoorState(),
        );
      }
      
      if (this.rearLeftDoorSensor) {
        this.rearLeftDoorSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getRearLeftDoorState(),
        );
      }
      
      if (this.rearRightDoorSensor) {
        this.rearRightDoorSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getRearRightDoorState(),
        );
      }
      
      if (this.hoodSensor) {
        this.hoodSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getHoodState(),
        );
      }
      
      if (this.tailgateSensor) {
        this.tailgateSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getTailgateState(),
        );
      }
      
      if (this.frontLeftWindowSensor) {
        this.frontLeftWindowSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getFrontLeftWindowState(),
        );
      }
      
      if (this.frontRightWindowSensor) {
        this.frontRightWindowSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getFrontRightWindowState(),
        );
      }
      
      if (this.rearLeftWindowSensor) {
        this.rearLeftWindowSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getRearLeftWindowState(),
        );
      }
      
      if (this.rearRightWindowSensor) {
        this.rearRightWindowSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getRearRightWindowState(),
        );
      }
      
      if (this.sunroofSensor) {
        this.sunroofSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getSunroofState(),
        );
      }
      
    } catch (error) {
      this.handleAuthFailure(error);
    }
  }
  
  // Lock service methods
  private async getCurrentLockState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.LockCurrentState.SECURED;
    }
    
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
      this.handleAuthFailure(error);
      return this.platform.Characteristic.LockCurrentState.UNKNOWN;
    }
  }
  
  private async getTargetLockState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.LockTargetState.SECURED;
    }
    
    const currentState = await this.getCurrentLockState();
    if (currentState === this.platform.Characteristic.LockCurrentState.SECURED) {
      return this.platform.Characteristic.LockTargetState.SECURED;
    } else if (currentState === this.platform.Characteristic.LockCurrentState.UNSECURED) {
      return this.platform.Characteristic.LockTargetState.UNSECURED;
    }
    
    return this.platform.Characteristic.LockTargetState.SECURED;
  }
  
  private async setTargetLockState(value: CharacteristicValue): Promise<void> {
    if (OAuthHandler.isGlobalAuthFailure) {
      throw new Error('Plugin suspended due to authentication failure');
    }
    
    try {
      const apiClient = this.platform.getApiClient();
      const vin = this.platform.config.vin;
      
      if (value === this.platform.Characteristic.LockTargetState.SECURED) {
        const result = await apiClient.lockVehicle(vin);
        
        if (result.invokeStatus === 'COMPLETED' || result.invokeStatus === 'SUCCESS') {
          this.lockService?.setCharacteristic(
            this.platform.Characteristic.LockCurrentState,
            this.platform.Characteristic.LockCurrentState.SECURED,
          );
        }
        
      } else if (value === this.platform.Characteristic.LockTargetState.UNSECURED) {
        const result = await apiClient.unlockVehicle(vin);
        
        if (result.invokeStatus === 'COMPLETED' || result.invokeStatus === 'SUCCESS') {
          this.lockService?.setCharacteristic(
            this.platform.Characteristic.LockCurrentState,
            this.platform.Characteristic.LockCurrentState.UNSECURED,
          );
        }
      }
      
      apiClient.clearCache();
      this.currentUnifiedData = null;
      
    } catch (error) {
      this.handleAuthFailure(error);
      
      const currentState = await this.getCurrentLockState();
      if (currentState === this.platform.Characteristic.LockCurrentState.SECURED) {
        this.lockService?.updateCharacteristic(
          this.platform.Characteristic.LockTargetState,
          this.platform.Characteristic.LockTargetState.SECURED,
        );
      } else {
        this.lockService?.updateCharacteristic(
          this.platform.Characteristic.LockTargetState,
          this.platform.Characteristic.LockTargetState.UNSECURED,
        );
      }
      
      throw error;
    }
  }
  
  // Climate control methods
  private async getClimatizationState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return false;
    }
    
    return false;
  }
  
  private async setClimatizationState(value: CharacteristicValue): Promise<void> {
    if (OAuthHandler.isGlobalAuthFailure) {
      throw new Error('Plugin suspended due to authentication failure');
    }
    
    try {
      const apiClient = this.platform.getApiClient();
      const vin = this.platform.config.vin;
      
      if (value as boolean) {
        await apiClient.startClimatization(vin);
      } else {
        await apiClient.stopClimatization(vin);
      }
      
      apiClient.clearCache();
      this.currentUnifiedData = null;
      
    } catch (error) {
      this.handleAuthFailure(error);
      this.climateService?.updateCharacteristic(this.platform.Characteristic.On, !value);
      throw error;
    }
  }

  // Locate service methods (Honk & Flash)
  private async getLocateState(): Promise<CharacteristicValue> {
    // Locate switch is always off (momentary action)
    return false;
  }
  
  private async setLocateState(value: CharacteristicValue): Promise<void> {
    if (OAuthHandler.isGlobalAuthFailure) {
      throw new Error('Plugin suspended due to authentication failure');
    }
    
    if (value as boolean) {
      try {
        const apiClient = this.platform.getApiClient();
        const vin = this.platform.config.vin;
        
        this.platform.log.info('📍 Locating vehicle - honk and flash...');
        const result = await apiClient.honkFlash(vin);
        this.platform.log.info(`Locate command result: ${result.invokeStatus}`);
        
        // Always turn the switch back off after triggering
        setTimeout(() => {
          this.locateService?.updateCharacteristic(this.platform.Characteristic.On, false);
        }, 1000);
        
      } catch (error) {
        this.handleAuthFailure(error);
        this.locateService?.updateCharacteristic(this.platform.Characteristic.On, false);
        throw error;
      }
    }
  }
  
  private async updateLockService(): Promise<void> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return;
    }
    
    try {
      if (this.lockService) {
        const currentState = await this.getCurrentLockState();
        this.lockService.updateCharacteristic(
          this.platform.Characteristic.LockCurrentState,
          currentState,
        );
        
        const targetState = currentState === this.platform.Characteristic.LockCurrentState.SECURED ?
          this.platform.Characteristic.LockTargetState.SECURED :
          this.platform.Characteristic.LockTargetState.UNSECURED;
        
        this.lockService.updateCharacteristic(
          this.platform.Characteristic.LockTargetState,
          targetState,
        );
      }
    } catch (error) {
      this.handleAuthFailure(error);
    }
  }
  
  // Diagnostic service methods
  private async getServiceWarningState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      const serviceWarning = unifiedData.serviceWarning;
      
      if (serviceWarning === 'WARNING') {
        return this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
      } else if (serviceWarning === 'NO_WARNING') {
        return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
      }
      
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async getOdometerState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return false;
    }
    
    try {
      const unifiedData = await this.getUnifiedVehicleData();
      
      if (unifiedData.odometer !== undefined) {
        return true;
      }
      
      return false;
    } catch (error) {
      this.handleAuthFailure(error);
      return false;
    }
  }
  
  private async getTyrePressureState(): Promise<CharacteristicValue> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    
    try {
      const connectedVehicleState = await this.platform.getApiClient().getConnectedVehicleState(this.platform.config.vin);
    
      if (connectedVehicleState.tyrePressure) {
        const tyres = connectedVehicleState.tyrePressure;
        const hasWarning = 
          tyres.frontLeft?.value === 'WARNING' ||
          tyres.frontRight?.value === 'WARNING' ||
          tyres.rearLeft?.value === 'WARNING' ||
          tyres.rearRight?.value === 'WARNING';
        
        if (hasWarning) {
          return this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
        }
        
        return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
      }
      
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } catch (error) {
      this.handleAuthFailure(error);
      return this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
  }
  
  private async updateDiagnosticServices(): Promise<void> {
    if (OAuthHandler.isGlobalAuthFailure) {
      return;
    }
    
    try {
      if (this.serviceWarningSensor) {
        this.serviceWarningSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getServiceWarningState(),
        );
      }
      
      if (this.odometerSensor) {
        this.odometerSensor.updateCharacteristic(
          this.platform.Characteristic.MotionDetected,
          await this.getOdometerState(),
        );
      }
      
      if (this.tyrePressureSensor) {
        this.tyrePressureSensor.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          await this.getTyrePressureState(),
        );
      }
      
    } catch (error) {
      this.handleAuthFailure(error);
    }
  }

  /**
   * Handle authentication failures - OAuth handler manages the global failure state
   */
  private handleAuthFailure(error: any): void {
    // OAuth handler already manages global authentication failure state
    // Just record the time for local tracking
    if (this.isAuthenticationError(error)) {
      this.authFailureTime = Date.now();
    }
  }
  
  /**
   * Detect authentication/OAuth errors
   */
  private isAuthenticationError(error: any): boolean {
    const errorMessage = error?.message || error?.toString() || '';
    
    return errorMessage.includes('refresh token has expired') ||
           errorMessage.includes('Authentication failed') ||
           errorMessage.includes('invalid_grant') ||
           errorMessage.includes('7-day limit') ||
           errorMessage.includes('401') ||
           errorMessage.includes('403') ||
           (error?.response?.status === 401) ||
           (error?.response?.status === 403) ||
           (error?.code === 'invalid_grant');
  }
  

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Clear cached data
    this.currentUnifiedData = null;
  }
}