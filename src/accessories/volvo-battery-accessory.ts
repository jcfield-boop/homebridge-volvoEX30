import { Logger, PlatformAccessory, Service } from 'homebridge';
import { VolvoEX30Platform } from '../platform';
import { BaseVolvoAccessory } from './base-volvo-accessory';
import { ConnectedVehicleState } from '../types/connected-vehicle-api';

/**
 * Volvo Battery Accessory
 * 
 * Implements HomeKit Window Covering for battery monitoring:
 * - Battery charge level (as window position %)
 * - Charging status (as window movement)
 * - Range information
 * - Battery health indicators
 * 
 * The Window Covering service provides an intuitive way to visualize
 * battery charge level as a percentage, with "opening" representing charging.
 */
export class VolvoBatteryAccessory extends BaseVolvoAccessory {
  private windowCoveringService!: Service;
  private batteryService!: Service;

  // Battery state tracking
  private currentChargeLevel = 50; // Default 50%
  private isCharging = false;
  private lastChargeLevel = 50;

  constructor(
    platform: VolvoEX30Platform,
    accessory: PlatformAccessory,
    logger: Logger,
  ) {
    super(platform, accessory, logger, 'Volvo Battery');
  }

  /**
   * Setup Window Covering and Battery services
   */
  protected setupServices(): void {
    // Primary service: Window Covering for intuitive battery visualization
    this.setupWindowCoveringService();
    
    // Secondary service: Battery for detailed battery information
    this.setupBatteryService();

    this.logger.debug('Volvo Battery services initialized');
  }

  /**
   * Setup Window Covering service for battery visualization
   */
  private setupWindowCoveringService(): void {
    this.windowCoveringService = this.accessory.getService(this.platform.Service.WindowCovering) ||
      this.accessory.addService(this.platform.Service.WindowCovering, 'Battery Level', 'battery-level');

    this.windowCoveringService.setCharacteristic(this.platform.Characteristic.Name, 'Battery Level');

    // Initialize window covering characteristics
    this.windowCoveringService
      .setCharacteristic(this.platform.Characteristic.CurrentPosition, this.currentChargeLevel)
      .setCharacteristic(this.platform.Characteristic.TargetPosition, this.currentChargeLevel)
      .setCharacteristic(this.platform.Characteristic.PositionState, 
        this.platform.Characteristic.PositionState.STOPPED);

    // Handle target position changes (user can't really control battery level, but we'll log it)
    this.windowCoveringService
      .getCharacteristic(this.platform.Characteristic.TargetPosition)
      .onSet(async (value) => {
        const targetLevel = value as number;
        this.logger.info(`Battery target level set to ${targetLevel}% (informational only)`);
        
        // Immediately set current position back to actual battery level
        setTimeout(() => {
          this.windowCoveringService.updateCharacteristic(
            this.platform.Characteristic.TargetPosition,
            this.currentChargeLevel,
          );
        }, 1000);
      });

    this.services.push(this.windowCoveringService);
  }

  /**
   * Setup Battery service for detailed battery information
   */
  private setupBatteryService(): void {
    this.batteryService = this.accessory.getService(this.platform.Service.Battery) ||
      this.accessory.addService(this.platform.Service.Battery, 'Battery Info', 'battery-info');

    this.batteryService.setCharacteristic(this.platform.Characteristic.Name, 'Battery Info');

    // Initialize battery characteristics
    this.batteryService
      .setCharacteristic(this.platform.Characteristic.BatteryLevel, this.currentChargeLevel)
      .setCharacteristic(this.platform.Characteristic.ChargingState, 
        this.platform.Characteristic.ChargingState.NOT_CHARGING)
      .setCharacteristic(this.platform.Characteristic.StatusLowBattery,
        this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);

    this.services.push(this.batteryService);
  }


  /**
   * Update battery state based on vehicle data
   */
  private updateBatteryState(vehicleData: ConnectedVehicleState): void {
    try {
      let newChargeLevel = this.currentChargeLevel;
      let chargingStatus = false;

      // Get battery charge level from fuel data (EV uses fuel API for battery)
      if (vehicleData.fuel?.batteryChargeLevel) {
        newChargeLevel = vehicleData.fuel.batteryChargeLevel.value;
        
        // Detect if charging (level increased since last reading)
        if (newChargeLevel > this.lastChargeLevel) {
          chargingStatus = true;
          this.logger.debug(`Battery charging detected: ${this.lastChargeLevel}% → ${newChargeLevel}%`);
        } else if (newChargeLevel < this.lastChargeLevel) {
          chargingStatus = false;
          this.logger.debug(`Battery discharging: ${this.lastChargeLevel}% → ${newChargeLevel}%`);
        }

        this.lastChargeLevel = this.currentChargeLevel;
        this.currentChargeLevel = newChargeLevel;
        this.isCharging = chargingStatus;
      }

      // Update Window Covering service (battery visualization)
      this.updateWindowCoveringForBattery(newChargeLevel, chargingStatus);
      
      // Update Battery service (detailed info)
      this.updateBatteryServiceInfo(newChargeLevel, chargingStatus);

      this.logger.debug(`Battery updated: ${newChargeLevel}%, Charging: ${chargingStatus}`);

    } catch (error) {
      this.logger.error('Failed to update battery state:', error);
    }
  }

  /**
   * Update window covering characteristics to represent battery state
   */
  private updateWindowCoveringForBattery(chargeLevel: number, isCharging: boolean): void {
    // Current position represents charge level (0-100%)
    this.windowCoveringService.updateCharacteristic(
      this.platform.Characteristic.CurrentPosition,
      chargeLevel,
    );

    // Target position also represents charge level
    this.windowCoveringService.updateCharacteristic(
      this.platform.Characteristic.TargetPosition,
      chargeLevel,
    );

    // Position state represents charging status
    let positionState;
    if (isCharging) {
      positionState = this.platform.Characteristic.PositionState.INCREASING; // "Opening" = Charging
    } else if (chargeLevel < this.lastChargeLevel) {
      positionState = this.platform.Characteristic.PositionState.DECREASING; // "Closing" = Discharging
    } else {
      positionState = this.platform.Characteristic.PositionState.STOPPED; // Stable
    }

    this.windowCoveringService.updateCharacteristic(
      this.platform.Characteristic.PositionState,
      positionState,
    );
  }

  /**
   * Update battery service with detailed information
   */
  private updateBatteryServiceInfo(chargeLevel: number, isCharging: boolean): void {
    // Battery level
    this.batteryService.updateCharacteristic(
      this.platform.Characteristic.BatteryLevel,
      chargeLevel,
    );

    // Charging state
    const chargingState = isCharging 
      ? this.platform.Characteristic.ChargingState.CHARGING
      : this.platform.Characteristic.ChargingState.NOT_CHARGING;
    
    this.batteryService.updateCharacteristic(
      this.platform.Characteristic.ChargingState,
      chargingState,
    );

    // Low battery warning (below 20%)
    const lowBatteryStatus = chargeLevel <= 20
      ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
      : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

    this.batteryService.updateCharacteristic(
      this.platform.Characteristic.StatusLowBattery,
      lowBatteryStatus,
    );
  }

  /**
   * Get estimated range based on charge level
   * This is a simplified calculation - real implementation would use vehicle-specific data
   */
  private getEstimatedRange(chargeLevel: number): number {
    // EX30 has approximately 272 km range at 100% charge (WLTP)
    const maxRange = 272;
    return Math.round((chargeLevel / 100) * maxRange);
  }

  /**
   * Get charging time estimate
   */
  private getChargingTimeEstimate(currentLevel: number, targetLevel = 100): string {
    if (!this.isCharging) {
      return 'Not charging';
    }

    // Simplified charging time calculation
    // Assuming average 7kW charging speed for AC charging
    const batteryCapacity = 51; // kWh for EX30
    const chargingPower = 7; // kW typical AC charging
    
    const remainingCapacity = ((targetLevel - currentLevel) / 100) * batteryCapacity;
    const hoursRemaining = remainingCapacity / chargingPower;
    
    const hours = Math.floor(hoursRemaining);
    const minutes = Math.round((hoursRemaining - hours) * 60);
    
    if (hours === 0) {
      return `${minutes} minutes`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Log detailed battery information
   */
  private logBatteryInfo(): void {
    const range = this.getEstimatedRange(this.currentChargeLevel);
    const chargingTime = this.getChargingTimeEstimate(this.currentChargeLevel);
    
    this.logger.info('🔋 Battery Status:');
    this.logger.info(`   Charge Level: ${this.currentChargeLevel}%`);
    this.logger.info(`   Estimated Range: ${range} km`);
    this.logger.info(`   Charging: ${this.isCharging ? 'Yes' : 'No'}`);
    if (this.isCharging) {
      this.logger.info(`   Time to Full: ${chargingTime}`);
    }
  }

  /**
   * Update services and log detailed info periodically
   */
  protected updateServices(vehicleData: ConnectedVehicleState): void {
    const previousChargeLevel = this.currentChargeLevel;
    this.updateBatteryState(vehicleData);
    
    // Log detailed info if charge level changed significantly
    if (Math.abs(this.currentChargeLevel - previousChargeLevel) >= 1) {
      this.logBatteryInfo();
    }
  }
}