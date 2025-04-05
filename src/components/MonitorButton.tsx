
import React from "react";
import { Button } from "./ui/button";
import { Activity, RotateCcw, Gauge } from "lucide-react";

interface MonitorButtonProps {
  isMonitoring: boolean;
  onToggle: () => void;
  variant: "monitor" | "reset" | "debug";
}

const MonitorButton: React.FC<MonitorButtonProps> = ({ isMonitoring, onToggle, variant }) => {
  let buttonClass = "";
  let buttonText = "";
  let icon = null;

  switch (variant) {
    case "monitor":
      buttonClass = isMonitoring ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700";
      buttonText = isMonitoring ? "DETENER" : "MONITOREAR";
      icon = <Activity size={20} className="mr-2" />;
      break;
    case "reset":
      buttonClass = "bg-blue-600 hover:bg-blue-700";
      buttonText = "REINICIAR";
      icon = <RotateCcw size={20} className="mr-2" />;
      break;
    case "debug":
      buttonClass = "bg-purple-600 hover:bg-purple-700";
      buttonText = "MONITOR TÉCNICO";
      icon = <Gauge size={20} className="mr-2" />;
      break;
    default:
      buttonClass = "bg-gray-600 hover:bg-gray-700";
      buttonText = "ACCIÓN";
      break;
  }

  return (
    <Button
      onClick={onToggle}
      className={`w-full px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center justify-center ${buttonClass}`}
    >
      {icon}
      {buttonText}
    </Button>
  );
};

export default MonitorButton;
