
import React from 'react';
import { Droplet } from 'lucide-react';

interface HydrationIndicatorProps {
  hydrationLevel: number;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente que muestra el nivel de hidratación con un indicador visual
 */
export const HydrationIndicator: React.FC<HydrationIndicatorProps> = ({ 
  hydrationLevel, 
  size = 'md' 
}) => {
  // Determinar el tamaño de los elementos según la prop size
  const getSize = () => {
    switch (size) {
      case 'sm': return { icon: 16, text: 'text-sm', container: 'h-8' };
      case 'lg': return { icon: 28, text: 'text-xl', container: 'h-14' };
      default: return { icon: 22, text: 'text-lg', container: 'h-12' };
    }
  };
  
  const { icon, text, container } = getSize();
  
  // Determinar el color según el nivel de hidratación
  const getHydrationColor = () => {
    if (hydrationLevel < 30) return 'text-red-500';
    if (hydrationLevel < 60) return 'text-yellow-500';
    return 'text-blue-500';
  };
  
  // Texto descriptivo según el nivel
  const getHydrationText = () => {
    if (hydrationLevel < 30) return 'Bajo';
    if (hydrationLevel < 60) return 'Medio';
    return 'Óptimo';
  };
  
  // Calcular el fill de la gota (0-1)
  const fillLevel = hydrationLevel / 100;
  
  return (
    <div className={`flex items-center space-x-2 ${container}`}>
      <div className="relative">
        <Droplet size={icon} className={`${getHydrationColor()}`} />
        {/* Capa de "llenado" de la gota */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-current ${getHydrationColor()} opacity-50 rounded-b-full transition-all duration-500 ease-in-out`}
          style={{ 
            height: `${fillLevel * 100}%`,
            maxHeight: '85%' // Evitar que sobrepase los bordes de la gota
          }}
        />
      </div>
      <div>
        <span className={`font-bold ${text}`}>{hydrationLevel}%</span>
        <span className={`ml-1 ${size === 'sm' ? 'text-xs' : 'text-sm'} text-gray-500`}>
          {getHydrationText()}
        </span>
      </div>
    </div>
  );
};

export default HydrationIndicator;
