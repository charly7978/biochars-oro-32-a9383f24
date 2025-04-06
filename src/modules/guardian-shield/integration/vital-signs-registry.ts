
/**
 * Vital Signs Registry Integration
 * Registers existing vital signs components to prevent duplication
 */

import { registerComponent, getCodeDuplicationGuardian } from '../duplication-guardian';
import { autoRegisterModuleStructure, registerModuleComponents } from '../duplication-utils';

/**
 * Register all vital signs related components
 */
export function registerVitalSignsComponents(): void {
  console.log("Registering vital signs components to prevent duplication");
  
  // Register module structure
  autoRegisterModuleStructure('vital-signs');
  
  // Register processors
  registerModuleComponents(
    'src/modules/vital-signs/processors',
    [
      'base-processor',
      'signal-filter',
      'signal-quality',
      'heart-rate-detector'
    ]
  );
  
  // Register specialized processors
  registerModuleComponents(
    'src/modules/vital-signs/processors/specialized',
    [
      'blood-pressure-processor',
      'spo2-processor',
      'glucose-processor',
      'arrhythmia-processor',
      'lipids-processor',
      'hydration-processor'
    ]
  );
  
  // Register hooks
  registerComponent('useVitalSignsProcessor', 'src/hooks/useVitalSignsProcessor.ts');
  registerComponent('useSignalProcessing', 'src/hooks/useSignalProcessing.ts');
  registerComponent('usePPGExtraction', 'src/hooks/usePPGExtraction.ts');
  registerComponent('useVitalSignsWithProcessing', 'src/hooks/useVitalSignsWithProcessing.ts');
  registerComponent('usePrecisionVitalSigns', 'src/hooks/usePrecisionVitalSigns.ts');
  
  // Register signal processing components
  registerModuleComponents(
    'src/modules/signal-processing',
    [
      'PPGSignalProcessor',
      'HeartbeatProcessor',
      'FingerDetector',
      'types'
    ]
  );
  
  // Register signal processing channels
  registerModuleComponents(
    'src/modules/signal-processing/channels',
    [
      'SpecializedChannel',
      'GlucoseChannel',
      'LipidsChannel',
      'BloodPressureChannel',
      'SpO2Channel',
      'CardiacChannel',
      'HydrationChannel'
    ]
  );
}

/**
 * Initialize vital signs duplication prevention
 */
export function initializeVitalSignsDuplicationPrevention(): void {
  const guardian = getCodeDuplicationGuardian();
  
  // Register all components
  registerVitalSignsComponents();
  
  // Run initial duplication checks
  console.log("Running initial duplication checks for vital signs components");
  
  // Generate report
  const report = guardian.generateReport();
  console.log("Initial duplication report:", report);
}
