
/**
 * Guardian Shield Initialization
 * Sets up all components of the Guardian Shield system
 */

import { getGuardianShield } from './index';
import { TypeScriptWatchdog } from './typescript-watchdog';
import { DuplicationDetector } from './duplication-detector';
import { VitalSignType } from '../../types/vital-sign-types';
import { AntiSimulationGuard } from '../signal-processing/security/anti-simulation-guard';

/**
 * Initialize the Guardian Shield system
 */
export function initializeGuardianShield(): void {
  console.log("Initializing Guardian Shield system...");
  
  // Create shield instance
  const shield = getGuardianShield();
  
  console.log("Guardian Shield initialized and ready!");
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
  return new DuplicationDetector();
}

