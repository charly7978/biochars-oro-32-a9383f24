
/**
 * Signal Processing Registry Integration
 * Registers existing signal processing components to prevent duplication
 */

import { registerComponent } from '../duplication-guardian';
import { autoRegisterModuleStructure, registerModuleComponents } from '../duplication-utils';

/**
 * Register all signal processing related components
 */
export function registerSignalProcessingComponents(): void {
  console.log("Registering signal processing components to prevent duplication");
  
  // Register module structure
  autoRegisterModuleStructure('signal-processing');
  
  // Register signal processors
  registerModuleComponents(
    'src/modules/signal-processing',
    [
      'index',
      'PPGSignalProcessor',
      'HeartbeatProcessor',
      'OptimizedSignalDistributor',
      'signal-validator',
      'error-handler',
      'types'
    ]
  );
  
  // Register utilities
  registerModuleComponents(
    'src/modules/signal-processing/utils',
    [
      'filter-utils',
      'signal-utils',
      'quality-utils'
    ]
  );
  
  // Register hooks related to signal processing
  registerComponent('useSignalProcessor', 'src/hooks/useSignalProcessor.ts');
  registerComponent('useHeartBeatProcessor', 'src/hooks/useHeartBeatProcessor.ts');
  registerComponent('useSignalProcessing', 'src/hooks/useSignalProcessing.ts');
  
  // Register heart-beat specific modules
  registerModuleComponents(
    'src/hooks/heart-beat/signal-processing',
    [
      'index',
      'peak-detection',
      'signal-quality',
      'result-processor',
      'adaptive-control',
      'optimized-buffer',
      'safe-buffer'
    ]
  );
}

/**
 * Initialize signal processing duplication prevention
 */
export function initializeSignalProcessingDuplicationPrevention(): void {
  // Register all components
  registerSignalProcessingComponents();
  
  console.log("Signal processing components registered for duplication prevention");
}
