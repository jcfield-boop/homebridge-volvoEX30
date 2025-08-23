import { Logger, PlatformAccessory, Service } from 'homebridge';
import { VolvoEX30Platform } from '../platform';
import { BaseVolvoAccessory } from './base-volvo-accessory';
import { ConnectedVehicleState } from '../types/connected-vehicle-api';
import { CommandStatusPollingService } from '../services/command-status-polling';

/**
 * Volvo Locate Accessory
 * 
 * Implements HomeKit Switch for vehicle location features:
 * - Honk & Flash to locate vehicle
 * - One-touch activation from Home app
 * - Real-time command feedback
 * - Auto-reset after activation
 */
export class VolvoLocateAccessory extends BaseVolvoAccessory {
  private locateService!: Service;
  private commandPollingService?: CommandStatusPollingService;

  // Auto-reset timer
  private resetTimer?: ReturnType<typeof setTimeout>;
  private readonly AUTO_RESET_DELAY = 3000; // Reset switch after 3 seconds

  constructor(
    platform: VolvoEX30Platform,
    accessory: PlatformAccessory,
    logger: Logger,
  ) {
    super(platform, accessory, logger, 'Volvo Locate');
  }

  /**
   * Setup Switch service for locate functionality
   */
  protected setupServices(): void {
    this.locateService = this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch, 'Locate Vehicle', 'locate');

    this.locateService.setCharacteristic(this.platform.Characteristic.Name, 'Locate Vehicle');

    // Initialize switch as off
    this.locateService.setCharacteristic(this.platform.Characteristic.On, false);

    // Handle switch activation
    this.locateService
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(async (value) => {
        const isOn = value as boolean;
        
        if (isOn) {
          try {
            await this.activateLocateVehicle();
          } catch (error) {
            this.logger.error('Failed to locate vehicle:', error);
            
            // Reset switch to off state on error
            setTimeout(() => {
              this.locateService.updateCharacteristic(this.platform.Characteristic.On, false);
            }, 100);
            
            throw error;
          }
        }
        // We don't need to handle "off" since the switch auto-resets
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

    this.services.push(this.locateService);
    this.logger.debug('Volvo Locate services initialized');
  }

  /**
   * Update services with new vehicle data
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected updateServices(_vehicleData: ConnectedVehicleState): void {
    // The locate switch doesn't need regular updates from vehicle data
    // It's purely a command-based interface
    this.logger.debug('Locate accessory data update (no action needed)');
  }

  /**
   * Activate vehicle locate (honk & flash)
   */
  private async activateLocateVehicle(): Promise<void> {
    const vin = this.getVin();
    if (!vin) {
      throw new Error('No VIN configured for locate operations');
    }

    this.logger.info('🔍 Activating vehicle locate (honk & flash)...');

    // Clear any existing reset timer
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    try {
      if (this.commandPollingService) {
        // Use enhanced command execution with polling for detailed feedback
        const result = await this.commandPollingService.executeCommandWithPolling('honk-flash', vin, {
          timeoutMs: 15000, // Honk & flash is usually quick
          pollingInterval: 1500,
        });
        
        if (result.success) {
          this.logger.info('✅ Vehicle locate activated successfully - honk & flash completed');
          this.showSuccessNotification();
        } else {
          this.logger.error(`❌ Vehicle locate failed: ${result.message}`);
          this.showFailureNotification(result.message);
          throw new Error(`Locate command failed: ${result.message}`);
        }
      } else {
        // Fallback to direct API call
        const apiClient = this.getApiClient();
        await apiClient.honkFlash(vin);
        this.logger.info('🔍 Vehicle locate command sent - honk & flash should activate');
        this.showSuccessNotification();
      }

      // Auto-reset the switch after successful activation
      this.scheduleAutoReset();

    } catch (error) {
      this.logger.error('Failed to activate vehicle locate:', error);
      this.showFailureNotification(error instanceof Error ? error.message : 'Unknown error');
      
      // Reset immediately on failure
      this.resetSwitch();
      throw error;
    }
  }

  /**
   * Schedule automatic reset of the switch
   */
  private scheduleAutoReset(): void {
    this.resetTimer = setTimeout(() => {
      this.resetSwitch();
      this.logger.debug('Locate switch auto-reset completed');
    }, this.AUTO_RESET_DELAY);
  }

  /**
   * Reset switch to off state
   */
  private resetSwitch(): void {
    this.locateService.updateCharacteristic(this.platform.Characteristic.On, false);
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
  }

  /**
   * Show success notification in logs
   */
  private showSuccessNotification(): void {
    this.logger.info('🎵 Vehicle should now be honking and flashing lights');
    this.logger.info('💡 Check for your vehicle\'s horn and hazard lights');
    this.logger.info('📍 Use this to locate your vehicle in parking areas');
  }

  /**
   * Show failure notification with helpful guidance
   */
  private showFailureNotification(reason: string): void {
    this.logger.error('❌ Vehicle locate failed');
    this.logger.error(`   Reason: ${reason}`);
    this.logger.error('');
    this.logger.error('🔧 Troubleshooting tips:');
    this.logger.error('   • Ensure vehicle is within cellular coverage');
    this.logger.error('   • Check if vehicle is awake (not in deep sleep)');
    this.logger.error('   • Try using the Volvo Cars app to wake the vehicle');
    this.logger.error('   • Wait a few minutes and try again');
  }

  /**
   * Get usage statistics for the locate function
   */
  private getUsageInfo(): string {
    // This could be enhanced to track usage statistics
    return 'Locate function ready - tap to honk & flash';
  }

  /**
   * Handle switch state for external queries
   */
  getSwitchState(): boolean {
    return this.locateService.getCharacteristic(this.platform.Characteristic.On).value as boolean;
  }

  /**
   * Manually trigger locate (for programmatic access)
   */
  async triggerLocate(): Promise<void> {
    this.logger.info('Locate triggered programmatically');
    await this.activateLocateVehicle();
  }

  /**
   * Check if locate command is available for this vehicle
   */
  private async isLocateAvailable(): Promise<boolean> {
    try {
      const vin = this.getVin();
      if (!vin) return false;

      const apiClient = this.getApiClient();
      const availableCommands = await this.safeApiCall(
        () => apiClient.getAvailableCommands(vin),
        { data: [] },
        'check available commands',
      );

      const supportsHonkFlash = availableCommands.data?.some((cmd: {command: string}) => 
        cmd.command === 'HONK_AND_FLASH' || cmd.command === 'HONK' || cmd.command === 'FLASH',
      );

      return supportsHonkFlash;
    } catch (error) {
      this.logger.debug('Failed to check locate availability:', error);
      return true; // Assume available if we can't check
    }
  }

  /**
   * Initialize availability check
   */
  async initialize(): Promise<void> {
    const isAvailable = await this.isLocateAvailable();
    
    if (!isAvailable) {
      this.logger.warn('⚠️  Locate function (honk & flash) may not be available for this vehicle');
      this.logger.warn('    The switch will remain active but commands may fail');
    } else {
      this.logger.info('✅ Locate function (honk & flash) is available for this vehicle');
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
    
    this.commandPollingService?.stopAllPolling();
    super.dispose();
  }
}