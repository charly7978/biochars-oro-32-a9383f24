
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface MonitorButtonProps {
  isMonitoring: boolean;
  onToggle: () => void;
  variant?: "monitor" | "reset";
  disabled?: boolean;
  className?: string;
}

const MonitorButton: React.FC<MonitorButtonProps> = ({ 
  isMonitoring, 
  onToggle, 
  variant = "monitor",
  disabled = false,
  className = ""
}) => {
  const baseClass = "w-full transition-colors duration-200";
  
  // Get the button variant accepted by shadcn/ui Button component
  const getButtonVariant = () => {
    if (variant === "reset") return "secondary";
    return isMonitoring ? "destructive" : "default"; 
  };
  
  return (
    <Button 
      onClick={onToggle} 
      variant={getButtonVariant()}
      disabled={disabled}
      className={cn(
        baseClass,
        isMonitoring && variant === "monitor" && "bg-[var(--medical-danger-direct)] hover:bg-[var(--medical-danger-direct)]/90",
        !isMonitoring && variant === "monitor" && "bg-[var(--medical-info-direct)] hover:bg-[var(--medical-info-direct)]/90",
        className
      )}
      aria-label={variant === "monitor" ? (isMonitoring ? 'Detener monitoreo' : 'Iniciar monitoreo') : 'Reiniciar'}
      title={variant === "monitor" ? (isMonitoring ? 'Detener monitoreo' : 'Iniciar monitoreo') : 'Reiniciar'}
    >
      {variant === "monitor" ? (isMonitoring ? 'Detener' : 'Iniciar') : 'Reset'}
    </Button>
  );
};

export default MonitorButton;
