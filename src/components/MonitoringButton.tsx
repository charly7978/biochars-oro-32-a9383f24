
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ActivitySquare } from 'lucide-react';

interface MonitoringButtonProps {
  className?: string;
}

const MonitoringButton: React.FC<MonitoringButtonProps> = ({ className }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/monitoring');
  };

  return (
    <Button 
      onClick={handleClick} 
      variant="outline" 
      className={`flex items-center gap-2 ${className}`}
    >
      <ActivitySquare className="w-4 h-4" />
      <span>Sistema de Monitoreo</span>
    </Button>
  );
};

export default MonitoringButton;
