
import React from 'react';
import { cn } from '@/lib/utils';

interface VitalSignProps {
  label: string;
  value: number | string;
  unit?: string;
  highlighted?: boolean;
}

const VitalSign: React.FC<VitalSignProps> = ({ 
  label, 
  value, 
  unit, 
  highlighted = false 
}) => {
  // Format the value for display
  const displayValue = () => {
    // Handle special cases
    if (value === 0 || value === "--" || value === "") {
      return "--";
    }
    
    // Regular values
    return value;
  };

  // Check if the value is valid for display
  const isValidValue = value !== 0 && value !== "--" && value !== "";
  
  return (
    <div className={cn(
      "flex flex-col items-center p-2 rounded-lg transition-all duration-300",
      highlighted ? "bg-gray-800/60 shadow-lg scale-105" : "bg-gray-900/40"
    )}>
      <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </span>
      
      <div className="flex items-baseline">
        <span className={cn(
          "text-2xl font-bold",
          highlighted ? "text-white" : "text-gray-200"
        )}>
          {displayValue()}
        </span>
        
        {unit && isValidValue && (
          <span className="ml-1 text-xs text-gray-400">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

export default VitalSign;
