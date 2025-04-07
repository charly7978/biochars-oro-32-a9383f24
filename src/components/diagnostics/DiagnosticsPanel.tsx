
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface MetricProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
}

const Metric: React.FC<MetricProps> = ({ label, value, icon, color = 'bg-blue-100' }) => (
  <div className="flex items-center p-2 rounded-lg bg-muted">
    {icon && (
      <div className={`p-2 rounded-full ${color} mr-3 flex items-center justify-center`}>
        {icon}
      </div>
    )}
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-medium">{value}</p>
    </div>
  </div>
);

interface DiagnosticsPanelProps {
  data: Record<string, any>;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ data }) => {
  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value.toString();
      }
      return value.toFixed(2);
    }
    return value?.toString() || 'N/A';
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {Object.entries(data).map(([key, value]) => (
        <Metric 
          key={key} 
          label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          value={formatValue(value)}
          color={typeof value === 'number' && value > 0.7 ? 'bg-green-100' : 
                typeof value === 'number' && value < 0.3 ? 'bg-red-100' : 'bg-blue-100'}
        />
      ))}
    </div>
  );
};
