
/**
 * Hook for interacting with the adaptive system coordinator
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  getAdaptiveSystemCoordinator,
  MessageType,
  AdaptiveSystemMessage
} from '@/modules/signal-processing/utils/adaptive-system-coordinator';

export function useAdaptiveSystem(componentId: string = 'main') {
  const [systemState, setSystemState] = useState<Record<string, any>>({});
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const coordinatorRef = useRef(getAdaptiveSystemCoordinator());
  
  // Connect to the adaptive system
  useEffect(() => {
    const coordinator = coordinatorRef.current;
    coordinator.registerComponent(componentId);
    
    // Initial state
    setSystemState(coordinator.getSystemState());
    setIsConnected(true);
    
    // Subscribe to config updates
    const unsubscribe = coordinator.subscribe(
      MessageType.CONFIG_UPDATE,
      () => {
        setSystemState(coordinator.getSystemState());
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [componentId]);
  
  // Process a value through the adaptive system
  const processValue = useCallback((value: number, metadata?: any): number => {
    return coordinatorRef.current.processValue(value, metadata);
  }, []);
  
  // Send a message to the adaptive system
  const sendMessage = useCallback((
    type: MessageType,
    data?: any,
    source: string = componentId,
    target?: string
  ): void => {
    const message: AdaptiveSystemMessage = {
      type,
      timestamp: Date.now(),
      source,
      data,
      target
    };
    
    coordinatorRef.current.sendMessage(message);
  }, [componentId]);
  
  // Update configuration
  const updateConfig = useCallback((config: Record<string, any>): void => {
    coordinatorRef.current.updateConfig(config);
    setSystemState(coordinatorRef.current.getSystemState());
  }, []);
  
  // Get current system state
  const getSystemState = useCallback((): Record<string, any> => {
    return coordinatorRef.current.getSystemState();
  }, []);
  
  // Request system diagnostics
  const requestDiagnostics = useCallback((): void => {
    sendMessage(
      MessageType.DIAGNOSTICS_REQUEST,
      { timestamp: Date.now() }
    );
  }, [sendMessage]);
  
  // Reset the adaptive system
  const resetSystem = useCallback((): void => {
    sendMessage(MessageType.RESET_REQUEST);
    setSystemState(coordinatorRef.current.getSystemState());
  }, [sendMessage]);
  
  return {
    isConnected,
    systemState,
    processValue,
    sendMessage,
    updateConfig,
    getSystemState,
    requestDiagnostics,
    resetSystem
  };
}
