
/**
 * Guardian Shield System
 * 
 * A robust system for preventing code duplication, enforcing type safety,
 * and automatically correcting errors in the codebase.
 */
import { validateSignalData } from '../signal-processing/signal-validator';
import { handleProcessingError } from '../signal-processing/error-handler';
import { AntiSimulationGuard } from '../signal-processing/security/anti-simulation-guard';

/**
 * Guardian Shield Configuration
 */
export interface GuardianShieldConfig {
  typeConsistencyChecks: boolean;
  antiDuplicationEnabled: boolean;
  autoCorrectTypeErrors: boolean;
  antiSimulationEnabled: boolean;
  loggingEnabled: boolean;
}

/**
 * Anti-duplication detection result
 */
export interface DuplicationDetectionResult {
  isDuplicate: boolean;
  similarity: number;
  source?: string;
  duplicateOf?: string;
}

/**
 * Service registry entry
 */
export interface ServiceRegistryEntry {
  name: string;
  service: any;
  type: string;
  singleton: boolean;
  instance?: any;
}

/**
 * The main Guardian Shield class
 */
export class GuardianShield {
  private config: GuardianShieldConfig;
  private antiSimulationGuard: AntiSimulationGuard;
  private serviceRegistry: Map<string, ServiceRegistryEntry> = new Map();
  private typeRegistry: Map<string, unknown> = new Map();
  
  /**
   * Constructor
   */
  constructor(config?: Partial<GuardianShieldConfig>) {
    this.config = {
      typeConsistencyChecks: true,
      antiDuplicationEnabled: true,
      autoCorrectTypeErrors: true,
      antiSimulationEnabled: true,
      loggingEnabled: true,
      ...config
    };
    
    this.antiSimulationGuard = new AntiSimulationGuard();
    
    if (this.config.loggingEnabled) {
      console.log("Guardian Shield initialized with configuration:", this.config);
    }
  }
  
  /**
   * Register a service with the shield
   */
  public registerService(
    name: string, 
    service: any, 
    type: string, 
    singleton: boolean = true
  ): void {
    if (this.serviceRegistry.has(name)) {
      console.warn(`Service "${name}" is already registered. Use a different name or unregister first.`);
      return;
    }
    
    this.serviceRegistry.set(name, {
      name,
      service,
      type,
      singleton,
      instance: singleton ? new service() : undefined
    });
    
    if (this.config.loggingEnabled) {
      console.log(`Registered service: ${name} (${type}), singleton: ${singleton}`);
    }
  }
  
  /**
   * Get a service instance
   */
  public getService<T>(name: string): T | null {
    const entry = this.serviceRegistry.get(name);
    
    if (!entry) {
      if (this.config.loggingEnabled) {
        console.warn(`Service "${name}" not found in registry`);
      }
      return null;
    }
    
    if (entry.singleton) {
      return entry.instance as T;
    }
    
    return new entry.service() as T;
  }
  
  /**
   * Register a type with the shield
   */
  public registerType<T>(name: string, typeDefinition: T): void {
    this.typeRegistry.set(name, typeDefinition);
    
    if (this.config.loggingEnabled) {
      console.log(`Registered type: ${name}`);
    }
  }
  
  /**
   * Get a type definition
   */
  public getType<T>(name: string): T | null {
    const type = this.typeRegistry.get(name);
    
    if (!type) {
      if (this.config.loggingEnabled) {
        console.warn(`Type "${name}" not found in registry`);
      }
      return null;
    }
    
    return type as T;
  }
  
  /**
   * Detect duplications in signals
   */
  public detectDuplication(values: number[]): DuplicationDetectionResult {
    if (!this.config.antiDuplicationEnabled) {
      return { isDuplicate: false, similarity: 0 };
    }
    
    try {
      // Use the anti-simulation guard to detect potential duplications
      const simulationDetected = this.antiSimulationGuard.detectSimulation(values[values.length - 1]);
      
      if (simulationDetected) {
        return {
          isDuplicate: true,
          similarity: 1.0,
          source: 'anti_simulation_guard',
          duplicateOf: 'simulated_pattern'
        };
      }
      
      // Also validate signal data
      const validationResult = validateSignalData(values);
      
      if (!validationResult.isValid && 
          (validationResult.validationId === 'LOW_VARIANCE' || 
           validationResult.validationId === 'HIGH_VARIANCE')) {
        return {
          isDuplicate: true,
          similarity: 0.8,
          source: 'signal_validator',
          duplicateOf: validationResult.validationId
        };
      }
      
      return { isDuplicate: false, similarity: 0 };
    } catch (error) {
      handleProcessingError({
        code: 'DUPLICATION_DETECTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        severity: 'medium',
        recoverable: true
      }, 'GuardianShield');
      
      return { isDuplicate: false, similarity: 0 };
    }
  }
  
  /**
   * Auto-correct common type errors
   */
  public correctTypeError<T>(value: any, targetType: string): T {
    if (!this.config.autoCorrectTypeErrors) {
      return value as T;
    }
    
    try {
      // Handle timestamp/time inconsistencies
      if (targetType === 'TimestampedPPGData') {
        const corrected = { ...value };
        
        // Ensure both timestamp and time fields exist
        if ('timestamp' in corrected && !('time' in corrected)) {
          (corrected as any).time = corrected.timestamp;
        } else if ('time' in corrected && !('timestamp' in corrected)) {
          (corrected as any).timestamp = corrected.time;
        }
        
        return corrected as T;
      }
      
      // Handle numeric conversions
      if (targetType === 'number' && typeof value === 'string') {
        return Number(value) as unknown as T;
      }
      
      // Handle boolean conversions
      if (targetType === 'boolean' && typeof value === 'string') {
        return (value.toLowerCase() === 'true') as unknown as T;
      }
      
      // Handle array conversions
      if (targetType.includes('Array') && !Array.isArray(value)) {
        return (value ? [value] : []) as unknown as T;
      }
      
      return value as T;
    } catch (error) {
      if (this.config.loggingEnabled) {
        console.warn(`Type correction failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      return value as T;
    }
  }
  
  /**
   * Validate a value against an expected type
   */
  public validateType(value: any, expectedType: string): boolean {
    if (!this.config.typeConsistencyChecks) {
      return true;
    }
    
    try {
      switch (expectedType) {
        case 'number':
          return typeof value === 'number' && !isNaN(value);
        
        case 'string':
          return typeof value === 'string';
        
        case 'boolean':
          return typeof value === 'boolean';
        
        case 'TimestampedPPGData':
          return typeof value === 'object' && 
                 value !== null && 
                 'value' in value && 
                 (typeof value.value === 'number') &&
                 (('timestamp' in value && typeof value.timestamp === 'number') || 
                  ('time' in value && typeof value.time === 'number'));
        
        case 'VitalSignsResult':
          return typeof value === 'object' && 
                 value !== null &&
                 'spo2' in value &&
                 'pressure' in value &&
                 'arrhythmiaStatus' in value &&
                 'glucose' in value &&
                 'hydration' in value &&
                 'lipids' in value && 
                 typeof value.lipids === 'object';
        
        default:
          // For unknown types, check if it's a registered type
          const registeredType = this.getType(expectedType);
          if (registeredType) {
            // Simple structural check
            return typeof value === typeof registeredType;
          }
          return true;
      }
    } catch (error) {
      if (this.config.loggingEnabled) {
        console.warn(`Type validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      return false;
    }
  }
}

/**
 * Guardian shield singleton instance
 */
let guardianShieldInstance: GuardianShield | null = null;

/**
 * Get the Guardian Shield instance
 */
export function getGuardianShield(config?: Partial<GuardianShieldConfig>): GuardianShield {
  if (!guardianShieldInstance) {
    guardianShieldInstance = new GuardianShield(config);
  }
  
  return guardianShieldInstance;
}
