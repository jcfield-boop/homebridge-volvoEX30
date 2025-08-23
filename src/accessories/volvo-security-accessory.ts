import { Logger, PlatformAccessory, Service } from 'homebridge';
import { VolvoEX30Platform } from '../platform';
import { BaseVolvoAccessory } from './base-volvo-accessory';
import { ConnectedVehicleState } from '../types/connected-vehicle-api';
import { CommandStatusPollingService } from '../services/command-status-polling';

/**
 * Volvo Security Accessory
 * 
 * Implements HomeKit Security System for:
 * - Vehicle lock/unlock control
 * - Lock status monitoring
 * - Security alarm status
 * - Door and window intrusion alerts
 */
export class VolvoSecurityAccessory extends BaseVolvoAccessory {
  private securityService!: Service;
  private commandPollingService?: CommandStatusPollingService;

  constructor(
    platform: VolvoEX30Platform,
    accessory: PlatformAccessory,
    logger: Logger,
  ) {
    super(platform, accessory, logger, 'Volvo Security');
  }

  /**
   * Setup Security System service
   */
  protected setupServices(): void {
    this.securityService = this.accessory.getService(this.platform.Service.SecuritySystem) ||
      this.accessory.addService(this.platform.Service.SecuritySystem, 'Security System', 'security');

    this.securityService.setCharacteristic(this.platform.Characteristic.Name, 'Volvo Security');

    // Initialize security system state
    this.securityService
      .setCharacteristic(
        this.platform.Characteristic.SecuritySystemCurrentState,
        this.platform.Characteristic.SecuritySystemCurrentState.DISARMED,
      )
      .setCharacteristic(
        this.platform.Characteristic.SecuritySystemTargetState,
        this.platform.Characteristic.SecuritySystemTargetState.DISARM,
      );

    // Handle target state changes (user requests)
    this.securityService
      .getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .onSet(async (value) => {
        try {
          await this.handleSecuritySystemChange(value as number);
        } catch (error) {
          this.logger.error('Failed to change security system state:', error);
          throw error;
        }
      });

    // Setup command polling service for enhanced feedback
    try {
      this.commandPollingService = new CommandStatusPollingService(
        this.getApiClient(),
        this.logger,
      );
    } catch (error) {
      this.logger.warn('Failed to setup command polling service:', error);
    }

    this.services.push(this.securityService);
    this.logger.debug('Volvo Security services initialized');
  }

  /**
   * Update services with new vehicle data
   */
  protected updateServices(vehicleData: ConnectedVehicleState): void {
    this.updateSecuritySystemState(vehicleData);
  }

  /**
   * Update security system state based on vehicle lock status
   */
  private updateSecuritySystemState(vehicleData: ConnectedVehicleState): void {
    try {
      let currentState = this.platform.Characteristic.SecuritySystemCurrentState.DISARMED;
      let hasIntrusion = false;

      // Determine security state based on lock status
      if (vehicleData.doors) {
        const centralLockStatus = vehicleData.doors.centralLock?.value;
        
        switch (centralLockStatus) {
          case 'LOCKED':
            currentState = this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
            break;
          case 'UNLOCKED':
            currentState = this.platform.Characteristic.SecuritySystemCurrentState.DISARMED;
            break;
          case 'PARTIALLY_LOCKED':
            currentState = this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
            break;
          default:
            currentState = this.platform.Characteristic.SecuritySystemCurrentState.DISARMED;
        }

        // Check for intrusion (any door/window open when locked)
        if (centralLockStatus === 'LOCKED') {
          const doors = vehicleData.doors;
          const doorIntrusion = 
            doors.frontLeftDoor?.value === 'OPEN' ||
            doors.frontRightDoor?.value === 'OPEN' ||
            doors.rearLeftDoor?.value === 'OPEN' ||
            doors.rearRightDoor?.value === 'OPEN' ||
            doors.hood?.value === 'OPEN' ||
            doors.tailgate?.value === 'OPEN';

          if (doorIntrusion) {
            hasIntrusion = true;
            this.logger.warn('Security intrusion detected: Door open while vehicle is locked');
          }
        }

        // Check for window intrusion
        if (vehicleData.windows && centralLockStatus === 'LOCKED') {
          const windows = vehicleData.windows;
          const windowIntrusion =
            windows.frontLeftWindow?.value === 'OPEN' ||
            windows.frontRightWindow?.value === 'OPEN' ||
            windows.rearLeftWindow?.value === 'OPEN' ||
            windows.rearRightWindow?.value === 'OPEN' ||
            windows.sunroof?.value === 'OPEN';

          if (windowIntrusion) {
            hasIntrusion = true;
            this.logger.warn('Security intrusion detected: Window open while vehicle is locked');
          }
        }
      }

      // Check for security-related warnings
      if (vehicleData.warnings) {
        const warningCount = Object.values(vehicleData.warnings)
          .filter(warning => warning.value === 'WARNING').length;
        
        if (warningCount > 0) {
          hasIntrusion = true;
          this.logger.debug(`Security warnings active: ${warningCount} warnings`);
        }
      }

      // Set alarm triggered state if intrusion detected
      if (hasIntrusion) {
        currentState = this.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
      }

      // Update the characteristic
      this.securityService.updateCharacteristic(
        this.platform.Characteristic.SecuritySystemCurrentState,
        currentState,
      );

      this.logger.debug(`Security state updated: ${this.getStateDescription(currentState)}`);

    } catch (error) {
      this.logger.error('Failed to update security system state:', error);
    }
  }

  /**
   * Handle security system state changes requested by user
   */
  private async handleSecuritySystemChange(targetState: number): Promise<void> {
    const vin = this.getVin();
    if (!vin) {
      throw new Error('No VIN configured for security operations');
    }

    this.logger.info(`Security system target state change requested: ${this.getStateDescription(targetState)}`);

    try {
      switch (targetState) {
        case this.platform.Characteristic.SecuritySystemTargetState.DISARM:
          await this.unlockVehicle(vin);
          break;
          
        case this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM:
        case this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM:
          await this.lockVehicle(vin);
          break;
          
        default:
          this.logger.warn(`Unsupported security system target state: ${targetState}`);
          throw new Error(`Unsupported security system state: ${targetState}`);
      }

      // Immediately update current state to match target (will be corrected by next poll if needed)
      this.securityService.updateCharacteristic(
        this.platform.Characteristic.SecuritySystemCurrentState,
        targetState,
      );

    } catch (error) {
      this.logger.error('Failed to change vehicle security state:', error);
      
      // Reset target state to current state on failure
      const currentState = this.securityService.getCharacteristic(
        this.platform.Characteristic.SecuritySystemCurrentState,
      ).value as number;
      
      this.securityService.updateCharacteristic(
        this.platform.Characteristic.SecuritySystemTargetState,
        currentState,
      );
      
      throw error;
    }
  }

  /**
   * Lock the vehicle with enhanced feedback
   */
  private async lockVehicle(vin: string): Promise<void> {
    if (this.commandPollingService) {
      // Use enhanced command execution with polling
      try {
        const result = await this.commandPollingService.executeCommandWithPolling('lock', vin, {
          timeoutMs: 20000,
          pollingInterval: 2000,
        });
        
        if (result.success) {
          this.logger.info('✅ Vehicle locked successfully');
        } else {
          this.logger.error(`❌ Vehicle lock failed: ${result.message}`);
          throw new Error(`Lock command failed: ${result.message}`);
        }
      } catch (error) {
        this.logger.error('Lock command with polling failed:', error);
        throw error;
      }
    } else {
      // Fallback to direct API call
      const apiClient = this.getApiClient();
      await apiClient.lockVehicle(vin);
      this.logger.info('Lock command sent to vehicle');
    }
  }

  /**
   * Unlock the vehicle with enhanced feedback
   */
  private async unlockVehicle(vin: string): Promise<void> {
    if (this.commandPollingService) {
      // Use enhanced command execution with polling
      try {
        const result = await this.commandPollingService.executeCommandWithPolling('unlock', vin, {
          timeoutMs: 20000,
          pollingInterval: 2000,
        });
        
        if (result.success) {
          this.logger.info('✅ Vehicle unlocked successfully');
        } else {
          this.logger.error(`❌ Vehicle unlock failed: ${result.message}`);
          throw new Error(`Unlock command failed: ${result.message}`);
        }
      } catch (error) {
        this.logger.error('Unlock command with polling failed:', error);
        throw error;
      }
    } else {
      // Fallback to direct API call
      const apiClient = this.getApiClient();
      await apiClient.unlockVehicle(vin);
      this.logger.info('Unlock command sent to vehicle');
    }
  }

  /**
   * Get human-readable description for security system states
   */
  private getStateDescription(state: number): string {
    switch (state) {
      case this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM:
        return 'Stay Armed';
      case this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM:
        return 'Away Armed (Locked)';
      case this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM:
        return 'Night Armed (Partially Locked)';
      case this.platform.Characteristic.SecuritySystemCurrentState.DISARMED:
        return 'Disarmed (Unlocked)';
      case this.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED:
        return 'Alarm Triggered';
      default:
        return `Unknown (${state})`;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.commandPollingService?.stopAllPolling();
    super.dispose();
  }
}