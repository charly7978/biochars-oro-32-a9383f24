
/**
 * Hook for accessing and controlling the GuardianShield
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getGuardianShield, 
  GuardianConfig,
  initializeGuardianShield
} from '../modules/guardian-shield/GuardianShield';

interface GuardianShieldState {
  isActive: boolean;
  activeSystems: string[];
  signalValidationsCount: number;
  errorRecoveryCount: number;
  lastReport: ReturnType<typeof getGuardianShield>['generateReport'] | null;
}

/**
 * React hook for using the GuardianShield in components and hooks
 */
export function useGuardianShield(initialConfig?: Partial<GuardianConfig>) {
  // Get or initialize the guardian
  const guardian = getGuardianShield(initialConfig);
  
  // State for guardian status
  const [state, setState] = useState<GuardianShieldState>({
    isActive: true,
    activeSystems: [],
    signalValidationsCount: 0,
    errorRecoveryCount: 0,
    lastReport: null
  });
  
  // Update state with report data
  const updateState = useCallback(() => {
    const report = guardian.generateReport();
    setState({
      isActive: report.activeSystems.length > 0,
      activeSystems: report.activeSystems,
      signalValidationsCount: report.signalValidations.total,
      errorRecoveryCount: report.errorRecovery.attempts,
      lastReport: report
    });
  }, [guardian]);
  
  // Initialize on first render
  useEffect(() => {
    // Make sure the guardian is initialized
    initializeGuardianShield(initialConfig);
    updateState();
    
    // Update state periodically
    const interval = setInterval(updateState, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, [initialConfig, updateState]);
  
  // Configure the guardian
  const configure = useCallback((config: Partial<GuardianConfig>) => {
    guardian.configure(config);
    updateState();
  }, [guardian, updateState]);
  
  // Generate a report on demand
  const generateReport = useCallback(() => {
    const report = guardian.generateReport();
    setState(prev => ({
      ...prev,
      lastReport: report
    }));
    return report;
  }, [guardian]);
  
  // Validate a signal
  const validateSignal = useCallback((signal: any) => {
    return guardian.validateSignal(signal);
  }, [guardian]);
  
  return {
    ...state,
    guardian,
    configure,
    generateReport,
    validateSignal
  };
}
