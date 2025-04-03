import { useState, useCallback, useEffect } from 'react';
import { logError, setVerboseLogging, ErrorLevel } from '@/utils/debugUtils';

export const useDebugMode = () => {
  // Check for debug mode in localStorage
  const initialDebugMode = localStorage.getItem('debugMode') === 'true';
  const [isDebugMode, setIsDebugMode] = useState<boolean>(initialDebugMode);
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(false);
  const [signalData, setSignalData] = useState<any[]>([]);
  const [rawValues, setRawValues] = useState<number[]>([]);
  const [filteredValues, setFilteredValues] = useState<number[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  
  // Initialize debug mode
  useEffect(() => {
    if (isDebugMode) {
      setVerboseLogging(true);
      logError("Modo de depuración activado", ErrorLevel.INFO, "DebugMode");
      
      // Set up keyboard shortcut (Ctrl+Shift+D)
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
          setIsPanelVisible(prev => !prev);
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } else {
      setVerboseLogging(false);
    }
  }, [isDebugMode]);
  
  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    const newMode = !isDebugMode;
    setIsDebugMode(newMode);
    localStorage.setItem('debugMode', newMode.toString());
    
    logError(
      `Modo de depuración ${newMode ? 'activado' : 'desactivado'}`, 
      ErrorLevel.INFO, 
      "DebugMode"
    );
  }, [isDebugMode]);
  
  // Show/hide debug panel
  const toggleDebugPanel = useCallback(() => {
    setIsPanelVisible(prev => !prev);
  }, []);
  
  // Add signal data for visualization
  const addSignalData = useCallback((data: any) => {
    setSignalData(prev => {
      const newData = [...prev, data];
      // Keep only the last 300 points
      if (newData.length > 300) {
        return newData.slice(-300);
      }
      return newData;
    });
  }, []);
  
  // Add raw value for visualization
  const addRawValue = useCallback((value: number) => {
    setRawValues(prev => {
      const newData = [...prev, value];
      // Keep only the last 300 points
      if (newData.length > 300) {
        return newData.slice(-300);
      }
      return newData;
    });
  }, []);
  
  // Add filtered value for visualization
  const addFilteredValue = useCallback((value: number) => {
    setFilteredValues(prev => {
      const newData = [...prev, value];
      // Keep only the last 300 points
      if (newData.length > 300) {
        return newData.slice(-300);
      }
      return newData;
    });
  }, []);
  
  // Update metrics
  const updateMetrics = useCallback((newMetrics: any) => {
    setMetrics(prev => ({
      ...prev,
      ...newMetrics
    }));
  }, []);
  
  return {
    isDebugMode,
    toggleDebugMode,
    isPanelVisible,
    toggleDebugPanel,
    showDebugPanel: () => setIsPanelVisible(true),
    hideDebugPanel: () => setIsPanelVisible(false),
    signalData,
    addSignalData,
    rawValues,
    addRawValue,
    filteredValues,
    addFilteredValue,
    metrics,
    updateMetrics
  };
};
