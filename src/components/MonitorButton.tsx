
import React from 'react';
import { PlayCircle, StopCircle, RotateCcw } from 'lucide-react';

interface MonitorButtonProps {
  isMonitoring: boolean;
  onToggle: () => void;
  variant: 'monitor' | 'reset';
}

const MonitorButton: React.FC<MonitorButtonProps> = ({ isMonitoring, onToggle, variant }) => {
  const isMonitorButton = variant === 'monitor';
  
  // Se cambia el color del botón de monitoreo para mejor concordancia semántica:
  // - Verde para iniciar (acción positiva)
  // - Rojo para detener (acción de parada)
  // - Gris para reset (acción neutral)
  const bgColor = isMonitorButton 
    ? isMonitoring ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
    : 'bg-gray-700 hover:bg-gray-800';
  
  const buttonText = isMonitorButton
    ? isMonitoring ? 'DETENER' : 'INICIAR'
    : 'RESET';
  
  const Icon = isMonitorButton
    ? isMonitoring ? StopCircle : PlayCircle
    : RotateCcw;

  return (
    <button 
      className={`w-full ${bgColor} text-white py-3 rounded-lg text-lg font-bold flex justify-center items-center gap-2`}
      onClick={onToggle}
    >
      <Icon className="w-5 h-5" />
      {buttonText}
    </button>
  );
};

export default MonitorButton;
