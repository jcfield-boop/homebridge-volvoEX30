// Connected Vehicle API v2 Type Definitions
// Based on successful test results with EX30 (YV4EK3ZL4SS150793)

export interface CVApiTimestamp {
  unit?: string;
  timestamp: string;
}

export interface CVApiResourceString extends CVApiTimestamp {
  value: string;
}

export interface CVApiResourceNumber extends CVApiTimestamp {
  value: number;
}

export interface CVApiResourceInteger extends CVApiTimestamp {
  value: number;
}

export interface CVApiResourceFloat extends CVApiTimestamp {
  value: number;
}

// Vehicle List Response
export interface VehicleListResponse {
  data: Array<{
    vin: string;
  }>;
}

// Vehicle Details Response
export interface VehicleDetails {
  data: {
    vin: string;
    modelYear: number;
    gearbox: string;
    fuelType: string;
    externalColour: string;
    batteryCapacityKWH?: number;
    images: {
      exteriorImageUrl: string;
      internalImageUrl: string;
    };
    descriptions: {
      model: string;
      upholstery: string;
      steering: string;
    };
  };
}

// Door and Lock Status
export interface DoorsResponse {
  data: {
    centralLock: CVApiResourceString;
    frontLeftDoor: CVApiResourceString;
    frontRightDoor: CVApiResourceString;
    rearLeftDoor: CVApiResourceString;
    rearRightDoor: CVApiResourceString;
    hood: CVApiResourceString;
    tailgate: CVApiResourceString;
    tankLid: CVApiResourceString;
  };
}

// Window Status
export interface WindowsResponse {
  data: {
    frontLeftWindow: CVApiResourceString;
    frontRightWindow: CVApiResourceString;
    rearLeftWindow: CVApiResourceString;
    rearRightWindow: CVApiResourceString;
    sunroof: CVApiResourceString;
  };
}

// Odometer
export interface OdometerResponse {
  data: {
    odometer: CVApiResourceInteger;
  };
}

// Diagnostics
export interface DiagnosticsResponse {
  data: {
    serviceWarning: CVApiResourceString;
    engineHoursToService?: CVApiResourceInteger;
    distanceToService: CVApiResourceInteger;
    washerFluidLevelWarning: CVApiResourceString;
    timeToService: CVApiResourceInteger;
  };
}

// Statistics
export interface StatisticsResponse {
  data: {
    averageEnergyConsumptionAutomatic?: CVApiResourceFloat;
    averageSpeedAutomatic: CVApiResourceFloat;
    tripMeterManual: CVApiResourceInteger;
    tripMeterAutomatic: CVApiResourceInteger;
    distanceToEmptyBattery: CVApiResourceInteger;
  };
}

// Tyre Pressure
export interface TyrePressureResponse {
  data: {
    frontLeft: CVApiResourceString;
    frontRight: CVApiResourceString;
    rearLeft: CVApiResourceString;
    rearRight: CVApiResourceString;
  };
}

// Warnings (Comprehensive light status)
export interface WarningsResponse {
  data: {
    brakeLightCenterWarning: CVApiResourceString;
    brakeLightLeftWarning: CVApiResourceString;
    brakeLightRightWarning: CVApiResourceString;
    fogLightFrontWarning: CVApiResourceString;
    fogLightRearWarning: CVApiResourceString;
    positionLightFrontLeftWarning: CVApiResourceString;
    positionLightFrontRightWarning: CVApiResourceString;
    positionLightRearLeftWarning: CVApiResourceString;
    positionLightRearRightWarning: CVApiResourceString;
    highBeamLeftWarning: CVApiResourceString;
    highBeamRightWarning: CVApiResourceString;
    lowBeamLeftWarning: CVApiResourceString;
    lowBeamRightWarning: CVApiResourceString;
    daytimeRunningLightLeftWarning: CVApiResourceString;
    daytimeRunningLightRightWarning: CVApiResourceString;
    turnIndicationFrontLeftWarning: CVApiResourceString;
    turnIndicationFrontRightWarning: CVApiResourceString;
    turnIndicationRearLeftWarning: CVApiResourceString;
    turnIndicationRearRightWarning: CVApiResourceString;
    registrationPlateLightWarning: CVApiResourceString;
    sideMarkLightsWarning: CVApiResourceString;
    hazardLightsWarning: CVApiResourceString;
    reverseLightsWarning: CVApiResourceString;
  };
}

// Engine Status
export interface EngineStatusResponse {
  data: {
    engineStatus: CVApiResourceString;
  };
}

// Engine Diagnostics
export interface EngineDiagnosticsResponse {
  data: {
    oilLevelWarning: CVApiResourceString;
    engineCoolantLevelWarning: CVApiResourceString;
  };
}

// Fuel/Energy (Battery for EV)
export interface FuelResponse {
  data: {
    batteryChargeLevel?: CVApiResourceInteger;
    fuelAmount?: CVApiResourceFloat;
  };
}

// Brake Status
export interface BrakeStatusResponse {
  data: {
    brakeFluidLevelWarning: CVApiResourceString;
  };
}

// Command Types
export interface CommandListResponse {
  data: Array<{
    command: CommandType;
    href: string;
  }>;
}

export interface CommandAccessibilityResponse {
  data: {
    availabilityStatus: CVApiResourceString;
    unavailableReason?: CVApiResourceString;
  };
}

export interface CommandInvokeResponse {
  vin: string;
  invokeStatus: InvokeStatus;
  message: string;
}

export interface UnlockCommandResponse extends CommandInvokeResponse {
  readyToUnlock?: boolean;
  readyToUnlockUntil?: number;
}

// Enums
export enum CommandType {
  LOCK = 'LOCK',
  UNLOCK = 'UNLOCK',
  LOCK_REDUCED_GUARD = 'LOCK_REDUCED_GUARD',
  CLIMATIZATION_START = 'CLIMATIZATION_START',
  CLIMATIZATION_STOP = 'CLIMATIZATION_STOP',
  ENGINE_START = 'ENGINE_START',
  ENGINE_STOP = 'ENGINE_STOP',
  HONK = 'HONK',
  FLASH = 'FLASH',
  HONK_FLASH = 'HONK_FLASH',
  HONK_AND_FLASH = 'HONK_AND_FLASH'
}

export enum InvokeStatus {
  WAITING = 'WAITING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  UNKNOWN = 'UNKNOWN',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_FAILURE = 'CONNECTION_FAILURE',
  VEHICLE_IN_SLEEP = 'VEHICLE_IN_SLEEP',
  UNLOCK_TIME_FRAME_PASSED = 'UNLOCK_TIME_FRAME_PASSED',
  UNABLE_TO_LOCK_DOOR_OPEN = 'UNABLE_TO_LOCK_DOOR_OPEN',
  EXPIRED = 'EXPIRED',
  SENT = 'SENT',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  CAR_IN_SLEEP_MODE = 'CAR_IN_SLEEP_MODE',
  DELIVERED = 'DELIVERED',
  DELIVERY_TIMEOUT = 'DELIVERY_TIMEOUT',
  SUCCESS = 'SUCCESS',
  CAR_TIMEOUT = 'CAR_TIMEOUT',
  CAR_ERROR = 'CAR_ERROR',
  NOT_ALLOWED_PRIVACY_ENABLED = 'NOT_ALLOWED_PRIVACY_ENABLED',
  NOT_ALLOWED_WRONG_USAGE_MODE = 'NOT_ALLOWED_WRONG_USAGE_MODE',
  INVOCATION_SPECIFIC_ERROR = 'INVOCATION_SPECIFIC_ERROR'
}

export enum DoorStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  UNKNOWN = 'UNKNOWN'
}

export enum LockStatus {
  LOCKED = 'LOCKED',
  UNLOCKED = 'UNLOCKED',
  UNKNOWN = 'UNKNOWN'
}

export enum WindowStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  UNKNOWN = 'UNKNOWN'
}

export enum EngineStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  UNKNOWN = 'UNKNOWN'
}

export enum WarningStatus {
  NO_WARNING = 'NO_WARNING',
  WARNING = 'WARNING',
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN'
}

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  UNKNOWN = 'UNKNOWN'
}

// Unified Vehicle State (combines all Connected Vehicle API data)
export interface ConnectedVehicleState {
  vehicleDetails?: VehicleDetails['data'];
  doors?: DoorsResponse['data'];
  windows?: WindowsResponse['data'];
  odometer?: OdometerResponse['data'];
  diagnostics?: DiagnosticsResponse['data'];
  statistics?: StatisticsResponse['data'];
  tyrePressure?: TyrePressureResponse['data'];
  warnings?: WarningsResponse['data'];
  engineStatus?: EngineStatusResponse['data'];
  engineDiagnostics?: EngineDiagnosticsResponse['data'];
  fuel?: FuelResponse['data'];
  brakeStatus?: BrakeStatusResponse['data'];
  commandAccessibility?: CommandAccessibilityResponse['data'];
  availableCommands?: CommandListResponse['data'];
  lastUpdated: string;
}

// API Error Response
export interface CVApiErrorResponse {
  error: {
    message: string;
    description?: string;
  };
}

// Request interfaces for commands
export interface EngineStartRequest {
  runtimeMinutes: number; // 0-15 minutes
}

export interface ClimatizationRequest {
  // Empty body for start/stop commands
}

export interface LockUnlockRequest {
  // Empty body for lock/unlock commands
}

export interface HonkFlashRequest {
  // Empty body for honk/flash commands
}