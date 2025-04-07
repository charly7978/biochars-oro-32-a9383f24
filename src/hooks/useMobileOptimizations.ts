
import { useState, useEffect } from 'react';

interface MobileOptimizationOptions {
  reducedMotion?: boolean;
  optimizeRendering?: boolean;
  reducedImageQuality?: boolean;
  batteryAwareness?: boolean;
}

export const useMobileOptimizations = (options: MobileOptimizationOptions = {}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    // Try to detect low power mode if the API exists
    if (options.batteryAwareness && 'getBattery' in navigator) {
      // @ts-ignore - navigator.getBattery is not in all TypeScript definitions
      navigator.getBattery().then((battery: any) => {
        // Low power mode detected based on battery level and charging state
        setIsLowPowerMode(battery.level < 0.2 && !battery.charging);

        // Listen for changes
        battery.addEventListener('levelchange', () => {
          setIsLowPowerMode(battery.level < 0.2 && !battery.charging);
        });

        battery.addEventListener('chargingchange', () => {
          setIsLowPowerMode(battery.level < 0.2 && !battery.charging);
        });
      }).catch(() => {
        console.log('Battery status not available');
      });
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [options.batteryAwareness]);

  return { isMobile, isLowPowerMode };
};
