
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
  const { isMobile, isLowPowerMode } = useMobileOptimizations();
  
  // Add responsive classes
  const containerClass = `
    ${className} 
    responsive-container
    ${isMobile ? 'mobile-view' : 'desktop-view'}
    ${isLowPowerMode ? 'low-power-mode' : ''}
    ${optimizeForMedicalData ? 'medical-data-optimized' : ''}
  `.trim();
  
  // Apply specific settings for medical data visualization if needed
  React.useEffect(() => {
    if (optimizeForMedicalData) {
      document.documentElement.classList.add('medical-data-optimized');
    }
    
    return () => {
      if (optimizeForMedicalData) {
        document.documentElement.classList.remove('medical-data-optimized');
      }
    };
  }, [optimizeForMedicalData]);
  
  return (
    <div className={containerClass}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;
