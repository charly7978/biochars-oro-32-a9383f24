
import React from 'react';
import { useMobileOptimizations } from '../hooks/useMobileOptimizations';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  optimizeForMedicalData?: boolean;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({ 
  children, 
  className = '',
  optimizeForMedicalData = false
}) => {
  const { isMobile, isLowPowerMode } = useMobileOptimizations({
    reducedMotion: true,
    optimizeRendering: optimizeForMedicalData,
    reducedImageQuality: isLowPowerMode,
    batteryAwareness: true
  });

  // Add different classes based on device type and power mode
  const containerClasses = [
    className,
    isMobile ? 'mobile-container' : 'desktop-container',
    isLowPowerMode ? 'low-power-mode' : '',
    optimizeForMedicalData ? 'medical-optimized' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;
