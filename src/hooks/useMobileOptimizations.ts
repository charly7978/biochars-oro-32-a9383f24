
import { useState, useEffect } from 'react';

interface MobileOptimizationsOptions {
  reducedMotion?: boolean;
  optimizeRendering?: boolean;
  reducedImageQuality?: boolean;
  batteryAwareness?: boolean;
}

interface MobileOptimizationsState {
  isMobile: boolean;
  isLowPowerMode: boolean;
  batteryLevel: number;
}

export const useMobileOptimizations = (options: MobileOptimizationsOptions = {}) => {
  const [optimizationState, setOptimizationState] = useState<MobileOptimizationsState>({
    isMobile: false,
    isLowPowerMode: false,
    batteryLevel: 100
  });

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      
      return isMobileDevice;
    };

    // Check battery status if available
    const checkBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          // The Battery API is deprecated in some browsers but still functional
          // Use cast to avoid TypeScript error
          const battery = await (navigator as any).getBattery();
          
          const updateBatteryInfo = () => {
            // Low power mode detection is approximated via battery level
            const isLowPower = battery.level < 0.2 && !battery.charging;
            
            setOptimizationState(prev => ({
              ...prev,
              isLowPowerMode: isLowPower,
              batteryLevel: Math.round(battery.level * 100)
            }));
          };
          
          // Initial update
          updateBatteryInfo();
          
          // Add event listeners
          battery.addEventListener('levelchange', updateBatteryInfo);
          battery.addEventListener('chargingchange', updateBatteryInfo);
          
          return () => {
            battery.removeEventListener('levelchange', updateBatteryInfo);
            battery.removeEventListener('chargingchange', updateBatteryInfo);
          };
        } catch (error) {
          console.warn('Battery API not supported or permission denied:', error);
        }
      }
    };
    
    // Detect reduced motion preference
    const checkReducedMotion = () => {
      if (options.reducedMotion && window.matchMedia) {
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleMotionChange = () => {
          setOptimizationState(prev => ({
            ...prev,
            isLowPowerMode: prev.isLowPowerMode || motionQuery.matches
          }));
        };
        
        // Initial check
        handleMotionChange();
        
        // Add listener
        motionQuery.addEventListener('change', handleMotionChange);
        return () => motionQuery.removeEventListener('change', handleMotionChange);
      }
    };

    // Run checks
    const isMobile = checkMobile();
    setOptimizationState(prev => ({ ...prev, isMobile }));
    
    if (isMobile || options.batteryAwareness) {
      checkBattery();
    }
    
    const cleanupReducedMotion = checkReducedMotion();
    
    return () => {
      if (cleanupReducedMotion) cleanupReducedMotion();
    };
  }, [options.reducedMotion, options.batteryAwareness]);

  return optimizationState;
};
