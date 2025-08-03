export interface Timestamp {
  value: string;
  format: 'date-time';
}

export interface SuccessResult {
  status: 'OK';
}

export interface ErrorResult {
  status: 'ERROR';
  code: string;
  message: string;
}

export interface ResourceInstanceString {
  value: string;
  updatedAt: string;
}

export interface ResourceInstanceInteger {
  value: number;
  updatedAt: string;
}

export interface ResourceInstanceFloat {
  value: number;
  updatedAt: string;
}

export interface ResourceInstanceWithUnit<T> {
  value: T;
  updatedAt: string;
  unit: string;
}

export type ResultResourceInstanceString = 
  | (SuccessResult & ResourceInstanceString)
  | ErrorResult;

export type ResultResourceInstanceIntegerWithUnit = 
  | (SuccessResult & ResourceInstanceWithUnit<number>)
  | ErrorResult;

export type ResultResourceInstanceFloatWithUnit = 
  | (SuccessResult & ResourceInstanceWithUnit<number>)
  | ErrorResult;

export interface EnergyState {
  batteryChargeLevel: ResultResourceInstanceFloatWithUnit;
  electricRange: ResultResourceInstanceIntegerWithUnit;
  chargerConnectionStatus: ResultResourceInstanceString;
  chargingStatus: ResultResourceInstanceString;
  chargingType: ResultResourceInstanceString;
  chargerPowerStatus: ResultResourceInstanceString;
  estimatedChargingTimeToTargetBatteryChargeLevel: ResultResourceInstanceIntegerWithUnit;
  targetBatteryChargeLevel: ResultResourceInstanceIntegerWithUnit;
  chargingCurrentLimit: ResultResourceInstanceIntegerWithUnit;
  chargingPower: ResultResourceInstanceIntegerWithUnit;
}

export interface Capability {
  isSupported: boolean;
}

export interface GetEnergyStateCapability extends Capability {
  batteryChargeLevel: Capability;
  electricRange: Capability;
  chargerConnectionStatus: Capability;
  chargingSystemStatus: Capability;
  chargingType: Capability;
  chargerPowerStatus: Capability;
  estimatedChargingTimeToTargetBatteryChargeLevel: Capability;
  targetBatteryChargeLevel: Capability;
  chargingCurrentLimit: Capability;
  chargingPower: Capability;
}

export interface Capabilities {
  getEnergyState: GetEnergyStateCapability;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface DetailedErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      code: string;
      message: string;
    }>;
  };
}

export enum ChargerConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  UNKNOWN = 'UNKNOWN',
}

export enum ChargingStatus {
  CHARGING = 'CHARGING',
  IDLE = 'IDLE',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export enum ChargingType {
  AC = 'AC',
  DC = 'DC',
  NONE = 'NONE',
}

export enum ChargerPowerStatus {
  POWER_AVAILABLE = 'POWER_AVAILABLE',
  NO_POWER_AVAILABLE = 'NO_POWER_AVAILABLE',
  UNKNOWN = 'UNKNOWN',
}