
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * React hook for using GuardianShield
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  guardianShield,
  GuardianShieldState, 
  GuardianShieldReport,
  GuardianShieldConfig,
  TypeValidationIssue,
  DuplicationIssue
} from '../modules/guardian-shield';
import { logError, ErrorLevel } from '../utils/debugUtils';

interface UseGuardianShieldOptions {
  autoInitialize?: boolean;
  initialConfig?: Partial<GuardianShieldConfig>;
  reportingInterval?: number;
}

/**
 * React hook for interacting with GuardianShield
 */
export function useGuardianShield(options: UseGuardianShieldOptions = {}) {
  const { 
    autoInitialize = true, 
    initialConfig = {}, 
    reportingInterval = 30000 
  } = options;
  
  // State for GuardianShield
  const [state, setState] = useState<GuardianShieldState>({
    isActive: false,
    activeSystems: [],
    lastReport: null,
    signalValidationsCount: 0,
    errorRecoveryCount: 0
  });
  
  // State for validation issues
  const [validationIssues, setValidationIssues] = useState<TypeValidationIssue[]>([]);
  const [duplicationIssues, setDuplicationIssues] = useState<DuplicationIssue[]>([]);
  
  // Initialize GuardianShield
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      try {
        await guardianShield.initialize(initialConfig);
        
        if (mounted) {
          setState(guardianShield.getState());
        }
      } catch (error) {
        logError(
          `Failed to initialize GuardianShield: ${error}`,
          ErrorLevel.ERROR,
          'useGuardianShield'
        );
      }
    };
    
    if (autoInitialize) {
      initialize();
    }
    
    // Set up periodic reporting
    const reportingTimer = setInterval(() => {
      if (mounted) {
        setState(guardianShield.getState());
      }
    }, reportingInterval);
    
    return () => {
      mounted = false;
      clearInterval(reportingTimer);
    };
  }, [autoInitialize, initialConfig, reportingInterval]);
  
  // Validate a file
  const validateFile = useCallback(async (path: string) => {
    try {
      const issues = await guardianShield.validateFile(path);
      setValidationIssues(prevIssues => [...prevIssues, ...issues]);
      return issues;
    } catch (error) {
      logError(
        `Failed to validate file ${path}: ${error}`,
        ErrorLevel.ERROR,
        'useGuardianShield'
      );
      return [];
    }
  }, []);
  
  // Check for duplicates
  const checkForDuplicates = useCallback(async (path: string) => {
    try {
      const issues = await guardianShield.checkForDuplicates(path);
      setDuplicationIssues(prevIssues => [...prevIssues, ...issues]);
      return issues;
    } catch (error) {
      logError(
        `Failed to check for duplicates in ${path}: ${error}`,
        ErrorLevel.ERROR,
        'useGuardianShield'
      );
      return [];
    }
  }, []);
  
  // Execute recovery
  const executeRecovery = useCallback(async (actionId: string) => {
    try {
      return await guardianShield.executeRecovery(actionId);
    } catch (error) {
      logError(
        `Failed to execute recovery action ${actionId}: ${error}`,
        ErrorLevel.ERROR,
        'useGuardianShield'
      );
      return false;
    }
  }, []);
  
  // Generate report
  const generateReport = useCallback((): GuardianShieldReport => {
    return guardianShield.getReport();
  }, []);
  
  return {
    state,
    validationIssues,
    duplicationIssues,
    validateFile,
    checkForDuplicates,
    executeRecovery,
    generateReport,
    refresh: () => setState(guardianShield.getState())
  };
}

export default useGuardianShield;
