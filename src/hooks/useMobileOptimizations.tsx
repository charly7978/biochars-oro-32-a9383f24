
import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from './use-mobile';

interface MobileOptimizationConfig {
  reducedMotion?: boolean;
  optimizeRendering?: boolean;
  reducedImageQuality?: boolean;
  batteryAwareness?: boolean;
  reduceAnimations?: boolean;
  lowPowerMode?: boolean;
  optimizeNetworkRequests?: boolean;
  reduceProcessingLoad?: boolean;
  useAdaptiveQuality?: boolean;
}

export const useMobileOptimizations = (config: MobileOptimizationConfig = {}) => {
  const isMobile = useIsMobile();
  const [settings, setSettings] = useState<MobileOptimizationConfig>({
    reducedMotion: config.reducedMotion || false,
    optimizeRendering: config.optimizeRendering || false,
    reducedImageQuality: config.reducedImageQuality || false,
    batteryAwareness: config.batteryAwareness || false,
    reduceAnimations: config.reduceAnimations || false,
    lowPowerMode: config.lowPowerMode || false,
    optimizeNetworkRequests: config.optimizeNetworkRequests || false,
    reduceProcessingLoad: config.reduceProcessingLoad || false,
    useAdaptiveQuality: config.useAdaptiveQuality || true,
  });
  
  // Detect if the device has battery low
  const [isBatteryLow, setIsBatteryLow] = useState<boolean>(false);
  
  // Network quality state
  const [networkQuality, setNetworkQuality] = useState<'high'|'medium'|'low'>('high');
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  
  // Configure optimizations based on device type
  useEffect(() => {
    if (isMobile) {
      // Default settings for mobile
      setSettings(prev => ({
        ...prev,
        reduceAnimations: true,
        lowPowerMode: isBatteryLow,
        optimizeNetworkRequests: true,
        reduceProcessingLoad: true,
        useAdaptiveQuality: true,
      }));
      
      // Apply CSS classes for mobile optimizations
      document.body.classList.add('mobile-optimized');
    } else {
      // Settings for desktop
      setSettings(prev => ({
        ...prev,
        reduceAnimations: false,
        lowPowerMode: false,
        optimizeNetworkRequests: false,
        reduceProcessingLoad: false,
      }));
      
      // Remove CSS classes for mobile optimization
      document.body.classList.remove('mobile-optimized');
    }
    
    // Apply document-level optimizations
    applyDocumentOptimizations();
  }, [isMobile, isBatteryLow]);
  
  // Detect battery status if available
  useEffect(() => {
    if ('getBattery' in navigator) {
      const checkBattery = async () => {
        try {
          // @ts-ignore - Battery API not available in all browsers
          const battery = await navigator.getBattery();
          
          // Update state if battery is below 20%
          setIsBatteryLow(battery.level < 0.2 && !battery.charging);
          setIsLowPowerMode(battery.level < 0.2 && !battery.charging);
          
          // Listen to battery level changes
          battery.addEventListener('levelchange', () => {
            setIsBatteryLow(battery.level < 0.2 && !battery.charging);
            setIsLowPowerMode(battery.level < 0.2 && !battery.charging);
          });
          
          // Listen to charging state changes
          battery.addEventListener('chargingchange', () => {
            setIsBatteryLow(battery.level < 0.2 && !battery.charging);
            setIsLowPowerMode(battery.level < 0.2 && !battery.charging);
          });
        } catch (error) {
          console.error('Error accessing battery API:', error);
        }
      };
      
      checkBattery();
    }
  }, []);
  
  // Check network quality
  useEffect(() => {
    if ('connection' in navigator) {
      // @ts-ignore - Connection API not available in all browsers
      const connection = navigator.connection;
      
      const updateNetworkQuality = () => {
        // @ts-ignore
        const effectiveType = connection.effectiveType;
        
        if (effectiveType === '4g') {
          setNetworkQuality('high');
        } else if (effectiveType === '3g') {
          setNetworkQuality('medium');
        } else {
          setNetworkQuality('low');
        }
      };
      
      updateNetworkQuality();
      
      // Listen for connection changes
      // @ts-ignore
      connection.addEventListener('change', updateNetworkQuality);
      
      return () => {
        // @ts-ignore
        connection.removeEventListener('change', updateNetworkQuality);
      };
    }
  }, []);
  
  // Apply document-level optimizations
  const applyDocumentOptimizations = useCallback(() => {
    if (isMobile) {
      // Disable heavy CSS effects
      document.documentElement.style.setProperty('--enable-animations', settings.reduceAnimations ? '0' : '1');
      
      // Optimize reflow and repaint
      document.body.style.willChange = 'transform';
      document.body.style.backfaceVisibility = 'hidden';
      
      // Reduce visual complexity in low power mode
      if (settings.lowPowerMode) {
        document.documentElement.style.setProperty('--enable-shadows', '0');
        document.documentElement.style.setProperty('--enable-blur', '0');
      } else {
        document.documentElement.style.setProperty('--enable-shadows', '1');
        document.documentElement.style.setProperty('--enable-blur', '1');
      }
    } else {
      // Restore default values for desktop
      document.documentElement.style.setProperty('--enable-animations', '1');
      document.documentElement.style.setProperty('--enable-shadows', '1');
      document.documentElement.style.setProperty('--enable-blur', '1');
      document.body.style.willChange = 'auto';
      document.body.style.backfaceVisibility = 'visible';
    }
  }, [isMobile, settings]);
  
  // Update optimization config manually
  const updateOptimizationConfig = useCallback((newConfig: Partial<MobileOptimizationConfig>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newConfig };
      return updated;
    });
  }, []);
  
  return {
    isMobile,
    isLowPowerMode,
    isBatteryLow,
    networkQuality,
    settings,
    updateOptimizationConfig,
  };
};
