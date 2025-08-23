/**
 * Volvo EX30 Multi-Accessory HomeKit Integration
 * 
 * Exports all specialized vehicle accessories for clean HomeKit organization:
 * - Security: Lock/unlock, alarm status, intrusion alerts
 * - Climate: Temperature control, pre-conditioning
 * - Battery: Charge level, charging status, range info
 * - Locate: Honk & flash for vehicle location
 */

export { BaseVolvoAccessory } from './base-volvo-accessory';
export { VolvoSecurityAccessory } from './volvo-security-accessory';
export { VolvoClimateAccessory } from './volvo-climate-accessory';
export { VolvoBatteryAccessory } from './volvo-battery-accessory';
export { VolvoLocateAccessory } from './volvo-locate-accessory';

/**
 * Accessory type definitions for platform registration
 */
export enum VolvoAccessoryType {
  SECURITY = 'security',
  CLIMATE = 'climate', 
  BATTERY = 'battery',
  LOCATE = 'locate'
}

/**
 * Accessory configuration interface
 */
export interface VolvoAccessoryConfig {
  type: VolvoAccessoryType;
  displayName: string;
  identifier: string;
  enabled: boolean;
}

/**
 * Default accessory configurations
 */
export const DEFAULT_ACCESSORY_CONFIGS: VolvoAccessoryConfig[] = [
  {
    type: VolvoAccessoryType.SECURITY,
    displayName: 'Volvo Security',
    identifier: 'security',
    enabled: true,
  },
  {
    type: VolvoAccessoryType.CLIMATE,
    displayName: 'Volvo Climate',
    identifier: 'climate',
    enabled: true,
  },
  {
    type: VolvoAccessoryType.BATTERY,
    displayName: 'Volvo Battery',
    identifier: 'battery',
    enabled: true,
  },
  {
    type: VolvoAccessoryType.LOCATE,
    displayName: 'Locate Vehicle',
    identifier: 'locate',
    enabled: true,
  },
];