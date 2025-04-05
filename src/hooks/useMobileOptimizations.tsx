
import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from './use-mobile';

export interface MobileOptimizationOptions {
  reducedMotion?: boolean;
  optimizeRendering?: boolean;
  reducedImageQuality?: boolean;
  batteryAwareness?: boolean;
}

export function useMobileOptimizations(options: MobileOptimizationOptions = {}) {
  const isMobile = useIsMobile();
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const optimizationsApplied = useRef(false);

  // Default options
  const {
    reducedMotion = true,
    optimizeRendering = true,
    reducedImageQuality = true,
    batteryAwareness = true,
  } = options;

  useEffect(() => {
    if (!isMobile || optimizationsApplied.current) return;

    // Apply mobile optimizations
    if (optimizeRendering) {
      // Add CSS class to html element for global optimizations
      document.documentElement.classList.add('mobile-optimized');
      
      // Find and optimize PPG elements
      const graphElements = document.querySelectorAll('.ppg-signal-meter, canvas, svg');
      graphElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.classList.add('ppg-graph', 'gpu-accelerated', 'rendering-optimized');
          if (el instanceof HTMLCanvasElement) {
            const ctx = el.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = false;
            }
          }
        }
      });
    }

    // Add reduced motion if needed
    if (reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    }

    // Add reduced image quality for better performance
    if (reducedImageQuality) {
      document.documentElement.classList.add('reduced-image-quality');
    }

    // Battery awareness
    if (batteryAwareness && 'getBattery' in navigator) {
      const checkBattery = async () => {
        try {
          const battery = await (navigator as any).getBattery();
          setBatteryLevel(battery.level);
          
          // If battery below 20% and not charging, enable low power mode
          setIsLowPowerMode(battery.level < 0.2 && !battery.charging);
          
          // Add listener for battery changes
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(battery.level);
            setIsLowPowerMode(battery.level < 0.2 && !battery.charging);
          });
          
          battery.addEventListener('chargingchange', () => {
            setIsLowPowerMode(battery.level < 0.2 && !battery.charging);
          });
        } catch (error) {
          console.warn('Battery status not available:', error);
        }
      };
      
      checkBattery();
    }

    optimizationsApplied.current = true;
  }, [isMobile, reducedMotion, optimizeRendering, reducedImageQuality, batteryAwareness]);

  // If in low power mode, apply more aggressive optimizations
  useEffect(() => {
    if (isLowPowerMode) {
      document.documentElement.classList.add('low-power-mode');
      
      // Find and further optimize all animations
      const animatedElements = document.querySelectorAll('[class*="animate-"]');
      animatedElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.animationDuration = '0s';
          el.style.transition = 'none';
        }
      });
    } else {
      document.documentElement.classList.remove('low-power-mode');
    }
  }, [isLowPowerMode]);

  return {
    isMobile,
    isLowPowerMode,
    batteryLevel
  };
}
