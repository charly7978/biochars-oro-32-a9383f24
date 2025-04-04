
import React, { useEffect, useState } from 'react';
import { Bell, BellOff, HeartPulse, AlertTriangle } from 'lucide-react';

interface ArrhythmiaIndicatorProps {
  isActive: boolean;
  count: number;
  className?: string;
}

const ArrhythmiaIndicator = ({ isActive, count, className = '' }: ArrhythmiaIndicatorProps) => {
  const [isBlinking, setIsBlinking] = useState(false);
  
  useEffect(() => {
    if (isActive) {
      setIsBlinking(true);
      const timeout = setTimeout(() => {
        setIsBlinking(false);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [isActive, count]);
  
  if (!isActive && count === 0) {
    return null;
  }
  
  return (
    <div 
      className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-300 ${
        isActive 
          ? 'bg-red-600/90 text-white animate-pulse shadow-lg shadow-red-600/50' 
          : 'bg-orange-600/70 text-white'
      } ${className}`}
    >
      {isActive ? (
        <AlertTriangle className="w-4 h-4" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      <span className="text-xs font-semibold">
        {count > 0 ? `${count} ${count === 1 ? 'Arritmia' : 'Arritmias'}` : 'Normal'}
      </span>
    </div>
  );
};

export default ArrhythmiaIndicator;
