
/**
 * Hook for accessing and using diagnostics service
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  diagnosticsInstance, 
  DiagnosticEvent 
} from '../modules/signal-processing/diagnostics';

/**
 * Interface for diagnostics hook
 */
export interface UseDiagnosticsReturn {
  events: DiagnosticEvent[];
  clearEvents: () => void;
  logEvent: (event: Omit<DiagnosticEvent, 'timestamp'>) => void;
}

/**
 * Implementation of diagnostics hook
 */
export function useDiagnostics(): UseDiagnosticsReturn {
  const [events, setEvents] = useState<DiagnosticEvent[]>([]);
  
  useEffect(() => {
    // Get initial events
    setEvents(diagnosticsInstance.getEvents());
    
    // Create subscriber
    const subscriber = {
      onDiagnosticEvent: (event: DiagnosticEvent) => {
        setEvents(prev => [...prev, event]);
      }
    };
    
    // Subscribe
    diagnosticsInstance.subscribe(subscriber);
    
    // Unsubscribe on cleanup
    return () => {
      diagnosticsInstance.unsubscribe(subscriber);
    };
  }, []);
  
  const clearEvents = useCallback(() => {
    diagnosticsInstance.clearEvents();
    setEvents([]);
  }, []);
  
  const logEvent = useCallback((event: Omit<DiagnosticEvent, 'timestamp'>) => {
    diagnosticsInstance.logEvent(event);
  }, []);
  
  return {
    events,
    clearEvents,
    logEvent
  };
}

export default useDiagnostics;
