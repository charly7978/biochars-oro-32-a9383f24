
/**
 * Guardian Shield Initialization
 * Sets up all components of the Guardian Shield system
 */

import { getGuardianShield, GuardianShieldConfig } from './index';
import { TypeScriptWatchdog } from './typescript-watchdog';
import { DuplicationDetector } from './duplication-detector';
import { VitalSignType } from '../../types/vital-sign-types';
import { AntiSimulationGuard } from '../signal-processing/security/anti-simulation-guard';

/**
 * Initialize the Guardian Shield system
 */
export function initializeGuardianShield(config?: Partial<GuardianShieldConfig>): void {
  console.log("Initializing Guardian Shield system...");
  
  // Create shield instance
  const shield = getGuardianShield(config);
  
  // Register basic types
  registerBasicTypes(shield);
  
  // Register services
  registerServices(shield);
  
  console.log("Guardian Shield initialized and ready!");
}

/**
 * Register basic types with the shield
 */
function registerBasicTypes(shield: ReturnType<typeof getGuardianShield>): void {
  // Register primitive types
  shield.registerType('number', 0);
  shield.registerType('string', '');
  shield.registerType('boolean', false);
  
  // Register complex types
  shield.registerType('VitalSignsResult', {
    spo2: 0,
    pressure: "--/--",
    arrhythmiaStatus: "--",
    glucose: 0,
    hydration: 0,
    lipids: {
      totalCholesterol: 0,
      triglycerides: 0
    }
  });
  
  shield.registerType('TimestampedPPGData', {
    timestamp: Date.now(),
    time: Date.now(),
    value: 0
  });
  
  shield.registerType('ProcessedPPGSignal', {
    timestamp: Date.now(),
    rawValue: 0,
    filteredValue: 0,
    normalizedValue: 0,
    amplifiedValue: 0,
    quality: 0,
    fingerDetected: false,
    signalStrength: 0
  });
  
  // Register enums
  shield.registerType('VitalSignType', VitalSignType);
}

/**
 * Register services with the shield
 */
function registerServices(shield: ReturnType<typeof getGuardianShield>): void {
  // Register TypeScript Watchdog
  shield.registerService(
    'typescriptWatchdog',
    TypeScriptWatchdog,
    'utility',
    false  // Not a singleton
  );
  
  // Register Duplication Detector
  shield.registerService(
    'duplicationDetector',
    DuplicationDetector,
    'utility',
    true  // Singleton
  );
  
  // Register Anti-Simulation Guard
  shield.registerService(
    'antiSimulationGuard',
    AntiSimulationGuard,
    'security',
    true  // Singleton
  );
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initializeGuardianShield();
  });
}

// Export a function to access the watchdog easily
export function getTypeScriptWatchdog(): TypeScriptWatchdog {
  return new TypeScriptWatchdog();
}

// Export a function to get the duplication detector
export function getDuplicationDetector(): DuplicationDetector {
  return getGuardianShield().getService<DuplicationDetector>('duplicationDetector') || 
         new DuplicationDetector();
}
