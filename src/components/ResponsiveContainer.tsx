
import React, { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { optimizeElement } from '@/utils/displayOptimizer';
import { applyHighResolutionOptimizations, optimizeMedicalDataDisplay } from '@/utils/highResolutionOptimizer';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  optimizeForMedicalData?: boolean;
}

export const ResponsiveContainer = ({
  children,
  className = '',
  optimizeForMedicalData = false,
}: ResponsiveContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    // Apply optimizations when the component mounts
    if (containerRef.current) {
      optimizeElement(containerRef.current);
      
      if (optimizeForMedicalData) {
        optimizeMedicalDataDisplay(containerRef.current);
      }
    }
    
    // Apply high resolution optimizations
    applyHighResolutionOptimizations();
    
    // Setup container queries for adaptive layouts
    const cleanup = isMobile ? setupContainerQueries() : () => {};
    
    return cleanup;
  }, [optimizeForMedicalData, isMobile]);
  
  // Setup container queries for adaptive layouts
  const setupContainerQueries = () => {
    if (typeof window === 'undefined' || !('ResizeObserver' in window) || !containerRef.current) {
      return () => {};
    }
    
    const container = containerRef.current;
    container.classList.add('container-query');
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const container = entry.target as HTMLElement;
        const width = entry.contentRect.width;
        
        // Remove previous classes
        container.classList.remove('cq-sm', 'cq-md', 'cq-lg', 'cq-xl');
        
        // Apply classes based on container width
        if (width < 400) {
          container.classList.add('cq-sm');
        } else if (width < 600) {
          container.classList.add('cq-md');
        } else if (width < 900) {
          container.classList.add('cq-lg');
        } else {
          container.classList.add('cq-xl');
        }
      }
    });
    
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
    };
  };
  
  const mobileClasses = isMobile ? 'mobile-optimized gpu-accelerated' : '';
  
  return (
    <div 
      ref={containerRef} 
      className={`responsive-container ${mobileClasses} ${className}`}
      style={{
        willChange: isMobile ? 'transform' : 'auto',
        transform: isMobile ? 'translateZ(0)' : 'none',
        maxWidth: isMobile ? '100vw' : 'auto',
        overflow: 'hidden',
        contain: isMobile ? 'content' : 'none'
      }}
    >
      {children}
    </div>
  );
};

export default ResponsiveContainer;
