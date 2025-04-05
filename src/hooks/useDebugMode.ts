
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { clearDiagnosticEvents } from '@/modules/signal-processing';

// Interface for hook return
interface DebugModeResult {
  isDebugMode: boolean;
  toggleDebugMode: () => void;
  resetDebugData: () => void;
  debugLevel: number;
  setDebugLevel: (level: number) => void;
}

/**
 * Hook for managing debug mode
 */
export function useDebugMode(): DebugModeResult {
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  const [debugLevel, setDebugLevel] = useState<number>(1); // 1-Basic, 2-Intermediate, 3-Advanced
  const { toast } = useToast();

  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    setIsDebugMode(prev => !prev);
    toast({
      title: `Debug Mode ${!isDebugMode ? 'Enabled' : 'Disabled'}`,
      description: !isDebugMode 
        ? 'Debug information is now visible'
        : 'Debug information is now hidden',
      variant: !isDebugMode ? 'default' : 'destructive',
    });
  }, [isDebugMode, toast]);

  // Reset debug data
  const resetDebugData = useCallback(() => {
    // Clear diagnostic events
    clearDiagnosticEvents();
    
    toast({
      title: 'Debug Data Reset',
      description: 'All debug data has been cleared',
      variant: 'default',
    });
  }, [toast]);

  // Debug keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + D to toggle debug mode
      if (e.altKey && e.key === 'd') {
        toggleDebugMode();
      }
      
      // Alt + R to reset debug data
      if (e.altKey && e.key === 'r') {
        resetDebugData();
      }
      
      // Alt + 1-3 to set debug level
      if (e.altKey && ['1', '2', '3'].includes(e.key)) {
        const level = parseInt(e.key);
        setDebugLevel(level);
        toast({
          title: `Debug Level ${level}`,
          description: `Debug level set to ${
            level === 1 ? 'Basic' : level === 2 ? 'Intermediate' : 'Advanced'
          }`,
          variant: 'default',
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDebugMode, resetDebugData, toast]);

  return {
    isDebugMode,
    toggleDebugMode,
    resetDebugData,
    debugLevel,
    setDebugLevel
  };
}
