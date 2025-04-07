
import React, { useState, useEffect } from 'react';

interface ArrhythmiaIndicatorProps {
  isActive: boolean;
  severity?: 'low' | 'medium' | 'high';
}

const ArrhythmiaIndicator: React.FC<ArrhythmiaIndicatorProps> = ({ 
  isActive, 
  severity = 'medium' 
}) => {
  const [opacity, setOpacity] = useState(isActive ? 1 : 0);
  
  useEffect(() => {
    if (isActive) {
      setOpacity(1);
      const timer = setTimeout(() => {
        setOpacity(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const getColor = () => {
    switch (severity) {
      case 'high': return 'rgb(239, 68, 68)';
      case 'medium': return 'rgb(234, 179, 8)';
      case 'low': return 'rgb(34, 197, 94)';
      default: return 'rgb(234, 179, 8)';
    }
  };
  
  if (!isActive && opacity === 0) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none transition-opacity"
      style={{ 
        backgroundColor: getColor(),
        opacity: opacity * 0.3,
        zIndex: 5
      }}
    >
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full font-bold">
        Arritmia Detectada
      </div>
    </div>
  );
};

export default ArrhythmiaIndicator;
