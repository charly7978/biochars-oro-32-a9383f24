
import React, { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
  centerContent?: boolean;
  adaptForKeyboard?: boolean;
  optimizeForMedicalData?: boolean;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = "",
  fullHeight = true,
  centerContent = true,
  adaptForKeyboard = true,
  optimizeForMedicalData = false,
}) => {
  const isMobile = useIsMobile();
  const { settings } = useMobileOptimizations();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number>(window.innerHeight);
  
  // Detect changes in window height to adapt to keyboard
  useEffect(() => {
    if (!isMobile || !adaptForKeyboard) return;
    
    const handleResize = () => {
      const newHeight = window.innerHeight;
      // If height decreases significantly, it's probably the keyboard
      const heightDifference = viewportHeight - newHeight;
      const keyboardThreshold = viewportHeight * 0.15; // 15% of height
      
      setViewportHeight(newHeight);
      
      if (heightDifference > keyboardThreshold) {
        setKeyboardOpen(true);
      } else {
        setKeyboardOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Set initial height
    setViewportHeight(window.innerHeight);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile, adaptForKeyboard, viewportHeight]);
  
  // Prevent scrolling and zooming on mobile
  useEffect(() => {
    if (!isMobile) return;
    
    // Configure viewport meta
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
    } else {
      // Create if it doesn't exist
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
      document.head.appendChild(meta);
    }
    
    // Prevent touch events that can cause zoom
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchstart', preventZoom, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', preventZoom);
    };
  }, [isMobile]);
  
  // Base styles
  const containerClasses = [
    "responsive-container",
    fullHeight ? "min-h-screen" : "",
    centerContent ? "flex flex-col items-center justify-center" : "",
    keyboardOpen ? "keyboard-open" : "",
    isMobile ? "mobile-view" : "desktop-view",
    settings.lowPowerMode ? "low-power-mode" : "",
    optimizeForMedicalData ? "medical-data-optimized" : "",
    className
  ].filter(Boolean).join(" ");
  
  // Set performance styles to optimize
  const containerStyle: React.CSSProperties = {
    // Performance optimizations
    willChange: isMobile ? 'transform' : 'auto',
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    // Adjustment for when keyboard is open
    paddingBottom: keyboardOpen ? '40vh' : undefined,
    overflowY: keyboardOpen ? 'auto' : undefined,
    // Specific height for full screen on mobile
    height: isMobile && fullHeight ? `${viewportHeight}px` : undefined
  };
  
  return (
    <div className={containerClasses} style={containerStyle}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;
