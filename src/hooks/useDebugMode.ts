
import { useState, useEffect } from 'react';
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { setVerboseLogging } from '@/utils/debugUtils';
import { initializeErrorTracking } from '@/utils/debugUtils';

export function useDebugMode(initialDebugMode = false) {
  const [debugMode, setDebugMode] = useState<boolean>(initialDebugMode);
  
  useEffect(() => {
    // Initialize error tracking on first load
    initializeErrorTracking({
      verbose: debugMode,
      setupGlobalHandlers: true
    });
    
    // Configure verbose logging based on debug mode
    setVerboseLogging(debugMode);
    
    logError(
      `Debug mode ${debugMode ? 'activated' : 'deactivated'}`,
      ErrorLevel.INFO,
      'DebugMode'
    );
    
    return () => {
      // Clean up if needed
    };
  }, [debugMode]);
  
  const toggleDebugMode = () => {
    setDebugMode(prev => !prev);
  };
  
  return {
    debugMode,
    setDebugMode,
    toggleDebugMode
  };
}

export default useDebugMode;
