import { Logger, PlatformAccessory, Service } from 'homebridge';
import { VolvoEX30Platform } from '../platform';
import { BaseVolvoAccessory } from './base-volvo-accessory';
import { ConnectedVehicleState } from '../types/connected-vehicle-api';
import { CommandStatusPollingService } from '../services/command-status-polling';

/**
 * Volvo Climate Accessory
 * 
 * Implements HomeKit Thermostat for:
 * - Climate control (pre-conditioning)
 * - Temperature monitoring
 * - Heating/cooling status
 * - Remote climatization start/stop
 */
export class VolvoClimateAccessory extends BaseVolvoAccessory {
  private thermostatService!: Service;
  private commandPollingService?: CommandStatusPollingService;

  // Climate control state
  private targetTemperature = 21; // Default to 21°C (comfortable room temp)
  private currentTemperature = 20; // Start with reasonable default
  private isClimatizationActive = false;

  constructor(
    platform: VolvoEX30Platform,
    accessory: PlatformAccessory,
    logger: Logger,
  ) {
    super(platform, accessory, logger, 'Volvo Climate');
  }

  /**
   * Setup Thermostat service
   */
  protected setupServices(): void {
    this.thermostatService = this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat, 'Climate Control', 'thermostat');

    this.thermostatService.setCharacteristic(this.platform.Characteristic.Name, 'Volvo Climate');

    // Setup thermostat characteristics
    this.thermostatService
      .setCharacteristic(this.platform.Characteristic.CurrentTemperature, this.currentTemperature)
      .setCharacteristic(this.platform.Characteristic.TargetTemperature, this.targetTemperature)
      .setCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, 
        this.platform.Characteristic.CurrentHeatingCoolingState.OFF)
      .setCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState,
        this.platform.Characteristic.TargetHeatingCoolingState.OFF);

    // Set temperature ranges (reasonable for EV climatization)
    this.thermostatService
      .getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({
        minValue: 16,     // 16°C minimum
        maxValue: 28,     // 28°C maximum  
        minStep: 0.5,     // 0.5°C steps
      });

    // Handle target temperature changes
    this.thermostatService
      .getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onSet(async (value) => {
        this.targetTemperature = value as number;
        this.logger.info(`Climate target temperature set to ${this.targetTemperature}°C`);
      });

    // Handle heating/cooling mode changes
    this.thermostatService
      .getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onSet(async (value) => {
        try {
          await this.handleClimateStateChange(value as number);
        } catch (error) {
          this.logger.error('Failed to change climate state:', error);
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

    this.services.push(this.thermostatService);
    this.logger.debug('Volvo Climate services initialized');
  }

  /**
   * Update services with new vehicle data
   */
  protected updateServices(vehicleData: ConnectedVehicleState): void {
    this.updateClimateState(vehicleData);
  }

  /**
   * Update climate state based on vehicle data
   */
  private updateClimateState(vehicleData: ConnectedVehicleState): void {
    try {
      // Update current temperature if available from vehicle
      // Note: Most vehicles don't provide ambient temperature directly
      // We'll use engine temperature or other indicators if available
      if (vehicleData.engineStatus) {
        // For now, maintain the current temperature logic
        // In a real implementation, you'd extract temperature from vehicle data
        const estimatedTemp = this.estimateCurrentTemperature(vehicleData);
        if (estimatedTemp !== null) {
          this.currentTemperature = estimatedTemp;
          this.thermostatService.updateCharacteristic(
            this.platform.Characteristic.CurrentTemperature,
            this.currentTemperature,
          );
        }
      }

      // Determine climatization status
      // Note: The Connected Vehicle API doesn't directly provide climatization status
      // We'll infer it from engine status and command history
      const climateState = this.determineClimateState(vehicleData);
      
      this.thermostatService.updateCharacteristic(
        this.platform.Characteristic.CurrentHeatingCoolingState,
        climateState,
      );

      this.logger.debug(`Climate state updated: Current=${this.currentTemperature}°C, State=${climateState}`);

    } catch (error) {
      this.logger.error('Failed to update climate state:', error);
    }
  }

  /**
   * Estimate current temperature based on available vehicle data
   */
  private estimateCurrentTemperature(vehicleData: ConnectedVehicleState): number | null {
    // Since the EX30 API doesn't provide ambient temperature directly,
    // we'll use reasonable estimates based on other indicators
    
    // If engine is running, assume moderate temperature
    if (vehicleData.engineStatus?.engineStatus?.value === 'ON') {
      return 22; // Assume comfortable temp if engine is running
    }

    // If it's winter and vehicle is cold, estimate lower temp
    // This is a simplified approach - in practice you might use weather APIs
    const currentHour = new Date().getHours();
    const isNight = currentHour < 6 || currentHour > 20;
    
    return isNight ? 18 : 20; // Cooler at night, warmer during day
  }

  /**
   * Determine current heating/cooling state
   */
  private determineClimateState(vehicleData: ConnectedVehicleState): number {
    // If we know climatization is active from recent commands
    if (this.isClimatizationActive) {
      // Determine if heating or cooling based on target vs current temp
      if (this.targetTemperature > this.currentTemperature) {
        return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
      } else if (this.targetTemperature < this.currentTemperature) {
        return this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
      } else {
        return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT; // Default to heat for EV
      }
    }

    // Check if engine is running (could indicate climate system active)
    if (vehicleData.engineStatus?.engineStatus?.value === 'ON') {
      return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
    }

    return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
  }

  /**
   * Handle climate state changes requested by user
   */
  private async handleClimateStateChange(targetState: number): Promise<void> {
    const vin = this.getVin();
    if (!vin) {
      throw new Error('No VIN configured for climate operations');
    }

    this.logger.info(`Climate system target state change requested: ${this.getClimateStateDescription(targetState)}`);

    try {
      switch (targetState) {
        case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
          await this.stopClimatization(vin);
          break;
          
        case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
        case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
        case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
          await this.startClimatization(vin);
          break;
          
        default:
          this.logger.warn(`Unsupported climate target state: ${targetState}`);
          throw new Error(`Unsupported climate state: ${targetState}`);
      }

      // Update current state immediately (will be corrected by next poll if needed)
      const currentState = targetState === this.platform.Characteristic.TargetHeatingCoolingState.OFF
        ? this.platform.Characteristic.CurrentHeatingCoolingState.OFF
        : this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;

      this.thermostatService.updateCharacteristic(
        this.platform.Characteristic.CurrentHeatingCoolingState,
        currentState,
      );

    } catch (error) {
      this.logger.error('Failed to change vehicle climate state:', error);
      
      // Reset target state on failure
      const currentState = this.thermostatService.getCharacteristic(
        this.platform.Characteristic.CurrentHeatingCoolingState,
      ).value as number;
      
      const targetState = currentState === this.platform.Characteristic.CurrentHeatingCoolingState.OFF
        ? this.platform.Characteristic.TargetHeatingCoolingState.OFF
        : this.platform.Characteristic.TargetHeatingCoolingState.HEAT;

      this.thermostatService.updateCharacteristic(
        this.platform.Characteristic.TargetHeatingCoolingState,
        targetState,
      );
      
      throw error;
    }
  }

  /**
   * Start climatization with enhanced feedback
   */
  private async startClimatization(vin: string): Promise<void> {
    if (this.commandPollingService) {
      try {
        const result = await this.commandPollingService.executeCommandWithPolling('climatization-start', vin, {
          timeoutMs: 30000, // Climate commands can take longer
          pollingInterval: 3000,
        });
        
        if (result.success) {
          this.isClimatizationActive = true;
          this.logger.info(`✅ Climatization started successfully (Target: ${this.targetTemperature}°C)`);
        } else {
          this.logger.error(`❌ Climatization start failed: ${result.message}`);
          throw new Error(`Climatization start failed: ${result.message}`);
        }
      } catch (error) {
        this.logger.error('Climatization start with polling failed:', error);
        throw error;
      }
    } else {
      // Fallback to direct API call
      const apiClient = this.getApiClient();
      await apiClient.startClimatization(vin);
      this.isClimatizationActive = true;
      this.logger.info('Climatization start command sent to vehicle');
    }
  }

  /**
   * Stop climatization with enhanced feedback
   */
  private async stopClimatization(vin: string): Promise<void> {
    if (this.commandPollingService) {
      try {
        const result = await this.commandPollingService.executeCommandWithPolling('climatization-stop', vin, {
          timeoutMs: 20000,
          pollingInterval: 2000,
        });
        
        if (result.success) {
          this.isClimatizationActive = false;
          this.logger.info('✅ Climatization stopped successfully');
        } else {
          this.logger.error(`❌ Climatization stop failed: ${result.message}`);
          throw new Error(`Climatization stop failed: ${result.message}`);
        }
      } catch (error) {
        this.logger.error('Climatization stop with polling failed:', error);
        throw error;
      }
    } else {
      // Fallback to direct API call
      const apiClient = this.getApiClient();
      await apiClient.stopClimatization(vin);
      this.isClimatizationActive = false;
      this.logger.info('Climatization stop command sent to vehicle');
    }
  }

  /**
   * Get human-readable description for climate states
   */
  private getClimateStateDescription(state: number): string {
    switch (state) {
      case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
        return 'Off';
      case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
        return 'Heat';
      case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
        return 'Cool';
      case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
        return 'Auto';
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