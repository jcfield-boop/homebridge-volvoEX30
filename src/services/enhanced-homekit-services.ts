import { Logger, PlatformAccessory, Service } from 'homebridge';
import { VolvoEX30Platform } from '../platform';
import { ConnectedVehicleState } from '../types/connected-vehicle-api';

/**
 * Enhanced HomeKit Services
 * 
 * Provides advanced HomeKit services including Motion, Occupancy, Security,
 * and other enhanced vehicle monitoring capabilities.
 */
export class EnhancedHomeKitServices {
  private motionService?: Service;
  private occupancyService?: Service;
  private securityService?: Service;
  private leakService?: Service;
  private smokeService?: Service;

  constructor(
    private readonly platform: VolvoEX30Platform,
    private readonly accessory: PlatformAccessory,
    private readonly logger: Logger,
  ) {
    this.setupEnhancedServices();
  }

  /**
   * Setup all enhanced HomeKit services
   */
  private setupEnhancedServices(): void {
    this.setupMotionService();
    this.setupOccupancyService(); 
    this.setupSecurityService();
    this.setupLeakService();
    this.setupSmokeService();
  }

  /**
   * Motion Sensor Service
   * Detects vehicle movement, door activity, and engine status changes
   */
  private setupMotionService(): void {
    this.motionService = this.accessory.getService('Vehicle Motion') ||
      this.accessory.addService(this.platform.Service.MotionSensor, 'Vehicle Motion', 'motion');

    this.motionService.setCharacteristic(this.platform.Characteristic.Name, 'Vehicle Motion');
    
    // Initialize motion as not detected
    this.motionService.updateCharacteristic(
      this.platform.Characteristic.MotionDetected, 
      false,
    );

    this.logger.debug('Enhanced Motion Service initialized');
  }

  /**
   * Occupancy Sensor Service
   * Detects when the vehicle is in use or occupied based on engine status,
   * door activity, and climatization usage
   */
  private setupOccupancyService(): void {
    this.occupancyService = this.accessory.getService('Vehicle Occupancy') ||
      this.accessory.addService(this.platform.Service.OccupancySensor, 'Vehicle Occupancy', 'occupancy');

    this.occupancyService.setCharacteristic(this.platform.Characteristic.Name, 'Vehicle Occupancy');
    
    // Initialize occupancy as not detected
    this.occupancyService.updateCharacteristic(
      this.platform.Characteristic.OccupancyDetected, 
      this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
    );

    this.logger.debug('Enhanced Occupancy Service initialized');
  }

  /**
   * Security System Service
   * Monitors overall vehicle security status including locks, alarms, and warnings
   */
  private setupSecurityService(): void {
    this.securityService = this.accessory.getService('Vehicle Security') ||
      this.accessory.addService(this.platform.Service.SecuritySystem, 'Vehicle Security', 'security');

    this.securityService.setCharacteristic(this.platform.Characteristic.Name, 'Vehicle Security');

    // Initialize security system state
    this.securityService.updateCharacteristic(
      this.platform.Characteristic.SecuritySystemCurrentState,
      this.platform.Characteristic.SecuritySystemCurrentState.DISARMED,
    );
    
    this.securityService.updateCharacteristic(
      this.platform.Characteristic.SecuritySystemTargetState,
      this.platform.Characteristic.SecuritySystemTargetState.DISARM,
    );

    // Handle security system target state changes (user requests)
    this.securityService.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .onSet(async (value) => {
        try {
          await this.handleSecuritySystemChange(value as number);
        } catch (error) {
          this.logger.error('Failed to change security system state:', error);
          throw error;
        }
      });

    this.logger.debug('Enhanced Security Service initialized');
  }

  /**
   * Leak Sensor Service
   * Monitors fluid level warnings (washer fluid, coolant, oil, brake fluid)
   */
  private setupLeakService(): void {
    this.leakService = this.accessory.getService('Fluid Leak Monitor') ||
      this.accessory.addService(this.platform.Service.LeakSensor, 'Fluid Leak Monitor', 'leak');

    this.leakService.setCharacteristic(this.platform.Characteristic.Name, 'Fluid Leak Monitor');
    
    // Initialize as no leak detected
    this.leakService.updateCharacteristic(
      this.platform.Characteristic.LeakDetected,
      this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED,
    );

    this.logger.debug('Enhanced Leak Sensor Service initialized');
  }

  /**
   * Smoke Sensor Service  
   * Repurposed to monitor critical vehicle warnings and alerts
   */
  private setupSmokeService(): void {
    this.smokeService = this.accessory.getService('Critical Warnings') ||
      this.accessory.addService(this.platform.Service.SmokeSensor, 'Critical Warnings', 'smoke');

    this.smokeService.setCharacteristic(this.platform.Characteristic.Name, 'Critical Warnings');
    
    // Initialize as no smoke (warnings) detected
    this.smokeService.updateCharacteristic(
      this.platform.Characteristic.SmokeDetected,
      this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED,
    );

    this.logger.debug('Enhanced Smoke/Warning Service initialized');
  }

  /**
   * Update all enhanced services with new vehicle data
   */
  updateServices(vehicleData: ConnectedVehicleState): void {
    this.updateMotionService(vehicleData);
    this.updateOccupancyService(vehicleData);
    this.updateSecurityService(vehicleData);
    this.updateLeakService(vehicleData);
    this.updateSmokeService(vehicleData);
  }

  /**
   * Update motion sensor based on vehicle activity
   */
  private updateMotionService(vehicleData: ConnectedVehicleState): void {
    if (!this.motionService) return;

    let motionDetected = false;

    try {
      // Check for door activity (any door not closed indicates motion)
      if (vehicleData.doors) {
        const doors = vehicleData.doors;
        const doorActivity = 
          doors.frontLeftDoor?.value !== 'CLOSED' ||
          doors.frontRightDoor?.value !== 'CLOSED' ||
          doors.rearLeftDoor?.value !== 'CLOSED' ||
          doors.rearRightDoor?.value !== 'CLOSED' ||
          doors.tailgate?.value !== 'CLOSED';
        
        if (doorActivity) {
          motionDetected = true;
          this.logger.debug('Motion detected: Door activity');
        }
      }

      // Check engine status for motion indication
      if (vehicleData.engineStatus && !motionDetected) {
        const engineRunning = vehicleData.engineStatus.engineStatus?.value === 'ON';
        if (engineRunning) {
          motionDetected = true;
          this.logger.debug('Motion detected: Engine running');
        }
      }

      // Check for recent odometer changes (would need historical data)
      // For now, we'll use charging status as a proxy for activity
      if (vehicleData.fuel && !motionDetected) {
        // If vehicle is plugged in for charging, consider it as having recent activity
        const chargingActivity = vehicleData.fuel.batteryChargeLevel !== undefined;
        if (chargingActivity) {
          // This is a simplified check - in practice you'd compare with previous readings
          // motionDetected = true;
        }
      }

      this.motionService.updateCharacteristic(
        this.platform.Characteristic.MotionDetected,
        motionDetected,
      );

    } catch (error) {
      this.logger.error('Failed to update motion service:', error);
    }
  }

  /**
   * Update occupancy sensor based on vehicle usage indicators
   */
  private updateOccupancyService(vehicleData: ConnectedVehicleState): void {
    if (!this.occupancyService) return;

    let occupancyDetected = false;

    try {
      // Check if engine is running (strong indicator of occupancy)
      if (vehicleData.engineStatus) {
        const engineRunning = vehicleData.engineStatus.engineStatus?.value === 'ON';
        if (engineRunning) {
          occupancyDetected = true;
          this.logger.debug('Occupancy detected: Engine running');
        }
      }

      // Check if climatization is active (indicates recent/current use)
      // Note: This would need additional climatization status data from the API
      
      // Check if doors are open (may indicate someone getting in/out)
      if (vehicleData.doors && !occupancyDetected) {
        const doors = vehicleData.doors;
        const anyDoorOpen = 
          doors.frontLeftDoor?.value === 'OPEN' ||
          doors.frontRightDoor?.value === 'OPEN' ||
          doors.rearLeftDoor?.value === 'OPEN' ||
          doors.rearRightDoor?.value === 'OPEN';
        
        if (anyDoorOpen) {
          occupancyDetected = true;
          this.logger.debug('Occupancy detected: Door open');
        }
      }

      const occupancyState = occupancyDetected 
        ? this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
        : this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;

      this.occupancyService.updateCharacteristic(
        this.platform.Characteristic.OccupancyDetected,
        occupancyState,
      );

    } catch (error) {
      this.logger.error('Failed to update occupancy service:', error);
    }
  }

  /**
   * Update security service based on lock status and warnings
   */
  private updateSecurityService(vehicleData: ConnectedVehicleState): void {
    if (!this.securityService) return;

    try {
      let securityState = this.platform.Characteristic.SecuritySystemCurrentState.DISARMED;

      // Determine security state based on lock status
      if (vehicleData.doors) {
        const centralLockStatus = vehicleData.doors.centralLock?.value;
        
        switch (centralLockStatus) {
          case 'LOCKED':
            securityState = this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
            break;
          case 'UNLOCKED':
            securityState = this.platform.Characteristic.SecuritySystemCurrentState.DISARMED;
            break;
          case 'PARTIALLY_LOCKED':
            securityState = this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
            break;
          default:
            securityState = this.platform.Characteristic.SecuritySystemCurrentState.DISARMED;
        }
      }

      // Check for security-related warnings
      if (vehicleData.warnings) {
        // Count active warnings by checking for 'WARNING' values
        const warningCount = Object.values(vehicleData.warnings)
          .filter(warning => warning.value === 'WARNING').length;
        
        if (warningCount > 0) {
          // If there are warnings, set to alarm triggered
          securityState = this.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
          this.logger.debug(`Security alarm triggered: ${warningCount} warnings active`);
        }
      }

      this.securityService.updateCharacteristic(
        this.platform.Characteristic.SecuritySystemCurrentState,
        securityState,
      );

    } catch (error) {
      this.logger.error('Failed to update security service:', error);
    }
  }

  /**
   * Update leak sensor based on fluid level warnings
   */
  private updateLeakService(vehicleData: ConnectedVehicleState): void {
    if (!this.leakService) return;

    try {
      let leakDetected = false;

      // Check diagnostics for fluid level warnings
      if (vehicleData.diagnostics) {
        const washerFluidWarning = vehicleData.diagnostics.washerFluidLevelWarning?.value === 'WARNING';
        if (washerFluidWarning) {
          leakDetected = true;
          this.logger.debug('Leak detected: Washer fluid level warning');
        }
      }

      // Check engine diagnostics for fluid warnings
      if (vehicleData.engineDiagnostics) {
        const coolantWarning = vehicleData.engineDiagnostics.engineCoolantLevelWarning?.value === 'WARNING';
        const oilWarning = vehicleData.engineDiagnostics.oilLevelWarning?.value === 'WARNING';
        
        if (coolantWarning || oilWarning) {
          leakDetected = true;
          this.logger.debug('Leak detected: Engine fluid warnings');
        }
      }

      // Check brake fluid warnings
      if (vehicleData.brakeStatus) {
        const brakeFluidWarning = vehicleData.brakeStatus.brakeFluidLevelWarning?.value === 'WARNING';
        if (brakeFluidWarning) {
          leakDetected = true;
          this.logger.debug('Leak detected: Brake fluid warning');
        }
      }

      const leakState = leakDetected 
        ? this.platform.Characteristic.LeakDetected.LEAK_DETECTED
        : this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;

      this.leakService.updateCharacteristic(
        this.platform.Characteristic.LeakDetected,
        leakState,
      );

    } catch (error) {
      this.logger.error('Failed to update leak service:', error);
    }
  }

  /**
   * Update smoke sensor (critical warnings) based on service warnings
   */
  private updateSmokeService(vehicleData: ConnectedVehicleState): void {
    if (!this.smokeService) return;

    try {
      let criticalWarningDetected = false;

      // Check for service warnings
      if (vehicleData.diagnostics) {
        const serviceWarning = vehicleData.diagnostics.serviceWarning?.value === 'WARNING';
        if (serviceWarning) {
          criticalWarningDetected = true;
          this.logger.debug('Critical warning detected: Service warning active');
        }
      }

      // Check for multiple warnings (indicates critical situation)
      if (vehicleData.warnings) {
        const warningCount = Object.values(vehicleData.warnings)
          .filter(warning => warning.value === 'WARNING').length;
        
        if (warningCount > 2) {
          criticalWarningDetected = true;
          this.logger.debug(`Critical warning detected: ${warningCount} active warnings`);
        }
      }

      const smokeState = criticalWarningDetected 
        ? this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED
        : this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;

      this.smokeService.updateCharacteristic(
        this.platform.Characteristic.SmokeDetected,
        smokeState,
      );

    } catch (error) {
      this.logger.error('Failed to update smoke/warning service:', error);
    }
  }

  /**
   * Handle security system state changes requested by user
   */
  private async handleSecuritySystemChange(targetState: number): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vin = (this.platform as any).config.vin;
    if (!vin) {
      throw new Error('No VIN configured');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiClient = (this.platform as any).apiClient;
      
      switch (targetState) {
        case this.platform.Characteristic.SecuritySystemTargetState.DISARM:
          this.logger.info('User requested to disarm security (unlock vehicle)');
          await apiClient.unlockVehicle(vin);
          break;
          
        case this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM:
        case this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM:
          this.logger.info('User requested to arm security (lock vehicle)');
          await apiClient.lockVehicle(vin);
          break;
          
        default:
          this.logger.warn(`Unsupported security system state: ${targetState}`);
      }

      // Update the current state to match target (will be corrected by next poll if needed)
      this.securityService?.updateCharacteristic(
        this.platform.Characteristic.SecuritySystemCurrentState,
        targetState,
      );

    } catch (error) {
      this.logger.error('Failed to change vehicle security state:', error);
      throw error;
    }
  }

  /**
   * Get service references for external access
   */
  getServices() {
    return {
      motion: this.motionService,
      occupancy: this.occupancyService,
      security: this.securityService,
      leak: this.leakService,
      smoke: this.smokeService,
    };
  }

  /**
   * Clean up all enhanced services
   */
  dispose(): void {
    // Services will be automatically cleaned up when accessory is disposed
    this.logger.debug('Enhanced HomeKit Services disposed');
  }
}