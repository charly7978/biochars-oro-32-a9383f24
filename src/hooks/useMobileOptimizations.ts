
import { useState, useEffect } from 'react';

interface MobileOptimizationsOptions {
  reducedMotion?: boolean;
  optimizeRendering?: boolean;
  reducedImageQuality?: boolean;
  batteryAwareness?: boolean;
}

interface MobileOptimizationsResult {
  isMobile: boolean;
  isLowPowerMode: boolean;
  isPoorConnection: boolean;
  optimizationsApplied: boolean;
}

export const useMobileOptimizations = (options: MobileOptimizationsOptions = {}): MobileOptimizationsResult => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isLowPowerMode, setIsLowPowerMode] = useState<boolean>(false);
  const [isPoorConnection, setIsPoorConnection] = useState<boolean>(false);

  useEffect(() => {
    // Detect if device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent) || window.innerWidth < 768);
    };

    // Try to detect battery status if available
    const checkBatteryStatus = async () => {
      if ('getBattery' in navigator) {
        try {
          // @ts-ignore - Navigator.getBattery is not in the standard TypeScript definitions
          const battery = await navigator.getBattery();
          const isLow = battery.level < 0.2 && !battery.charging;
          setIsLowPowerMode(isLow);
          
          // Add event listeners for battery changes
          battery.addEventListener('levelchange', () => {
            setIsLowPowerMode(battery.level < 0.2 && !battery.charging);
          });
          
          battery.addEventListener('chargingchange', () => {
            setIsLowPowerMode(battery.level < 0.2 && !battery.charging);
          });
        } catch (err) {
          console.log('Battery status not available', err);
        }
      }
    };

    // Check network connection quality
    const checkConnectionQuality = () => {
      // @ts-ignore - Connection property exists on Navigator but is not in standard TypeScript definitions
      if ('connection' in navigator) {
        // @ts-ignore
        const connection = navigator.connection;
        
        if (connection) {
          const isSlowConnection = connection.downlink < 1 || connection.rtt > 500 || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
          setIsPoorConnection(isSlowConnection);
          
          connection.addEventListener('change', () => {
            const isSlowConnection = connection.downlink < 1 || connection.rtt > 500 || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
            setIsPoorConnection(isSlowConnection);
          });
        }
      }
    };

    // Apply optimizations
    const applyOptimizations = () => {
      if (options.reducedMotion) {
        document.documentElement.classList.toggle('reduced-motion', isMobile || isLowPowerMode);
      }
      
      if (options.optimizeRendering && (isMobile || isLowPowerMode)) {
        // Add optimized rendering class that CSS can target
        document.documentElement.classList.add('optimized-rendering');
      }
    };

    checkMobile();
    checkBatteryStatus();
    checkConnectionQuality();
    
    // Listen for resize events to update mobile status
    window.addEventListener('resize', checkMobile);
    
    // Apply optimizations whenever dependencies change
    applyOptimizations();
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [options.reducedMotion, options.optimizeRendering, isMobile, isLowPowerMode]);

  return {
    isMobile,
    isLowPowerMode,
    isPoorConnection,
    optimizationsApplied: Boolean(isMobile || isLowPowerMode)
  };
};
