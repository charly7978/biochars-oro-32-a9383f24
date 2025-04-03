
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getErrorBuffer, ErrorLevel, clearErrorBuffer } from '@/utils/debugUtils';
import { getErrorPreventionState, resetErrorPreventionSystem } from '@/utils/errorPrevention';
import { AlertTriangle, Info, AlertCircle, AlertOctagon, RotateCcw } from 'lucide-react';

interface ErrorMetrics {
  total: number;
  info: number;
  warning: number;
  error: number;
  critical: number;
  lastHour: number;
  lastErrorTime: number | null;
}

const ErrorMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<ErrorMetrics>({
    total: 0,
    info: 0,
    warning: 0,
    error: 0,
    critical: 0,
    lastHour: 0,
    lastErrorTime: null
  });
  const [preventionState, setPreventionState] = useState(getErrorPreventionState());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Calculate error metrics
  useEffect(() => {
    const errorBuffer = getErrorBuffer();
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    let lastErrorTime: number | null = null;
    
    const metrics: ErrorMetrics = {
      total: errorBuffer.length,
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
      lastHour: 0,
      lastErrorTime: null
    };
    
    errorBuffer.forEach(error => {
      // Count by severity level
      switch (error.level) {
        case ErrorLevel.INFO:
          metrics.info++;
          break;
        case ErrorLevel.WARNING:
          metrics.warning++;
          break;
        case ErrorLevel.ERROR:
          metrics.error++;
          break;
        case ErrorLevel.CRITICAL:
          metrics.critical++;
          break;
      }
      
      // Count errors in last hour
      if (error.timestamp >= oneHourAgo) {
        metrics.lastHour++;
      }
      
      // Track most recent error time
      if (!lastErrorTime || error.timestamp > lastErrorTime) {
        lastErrorTime = error.timestamp;
      }
    });
    
    metrics.lastErrorTime = lastErrorTime;
    setMetrics(metrics);
    setPreventionState(getErrorPreventionState());
  }, [refreshTrigger]);
  
  // Refresh data every 5 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const handleReset = () => {
    clearErrorBuffer();
    resetErrorPreventionSystem();
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Determine system health status
  const getHealthStatus = (): { status: string; color: string; icon: React.ReactNode } => {
    if (metrics.critical > 0 || preventionState.hasUnresolvedIssues) {
      return { 
        status: 'Crítico', 
        color: 'text-red-600', 
        icon: <AlertOctagon className="h-5 w-5 text-red-600" /> 
      };
    }
    
    if (metrics.error > 3 || preventionState.errorCount >= 5) {
      return { 
        status: 'Degradado', 
        color: 'text-orange-500', 
        icon: <AlertCircle className="h-5 w-5 text-orange-500" /> 
      };
    }
    
    if (metrics.warning > 5) {
      return { 
        status: 'Advertencia', 
        color: 'text-amber-500', 
        icon: <AlertTriangle className="h-5 w-5 text-amber-500" /> 
      };
    }
    
    return { 
      status: 'Saludable', 
      color: 'text-green-500', 
      icon: <Info className="h-5 w-5 text-green-500" /> 
    };
  };
  
  const healthStatus = getHealthStatus();
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Monitor de Errores</CardTitle>
          <div className="flex items-center gap-1.5">
            {healthStatus.icon}
            <span className={`text-sm font-medium ${healthStatus.color}`}>
              {healthStatus.status}
            </span>
          </div>
        </div>
        <CardDescription>
          Sistema de prevención de errores activo
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
            <span className="text-sm">Total Errores:</span>
            <span className="font-medium">{metrics.total}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
            <span className="text-sm">Última Hora:</span>
            <span className="font-medium">{metrics.lastHour}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-1 mb-3">
          <div className="flex flex-col items-center p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded">
            <span className="text-xs text-blue-700 dark:text-blue-300">INFO</span>
            <span className="font-medium">{metrics.info}</span>
          </div>
          <div className="flex flex-col items-center p-1.5 bg-amber-100 dark:bg-amber-900/20 rounded">
            <span className="text-xs text-amber-700 dark:text-amber-300">WARN</span>
            <span className="font-medium">{metrics.warning}</span>
          </div>
          <div className="flex flex-col items-center p-1.5 bg-red-100 dark:bg-red-900/20 rounded">
            <span className="text-xs text-red-700 dark:text-red-300">ERROR</span>
            <span className="font-medium">{metrics.error}</span>
          </div>
          <div className="flex flex-col items-center p-1.5 bg-red-200 dark:bg-red-900/40 rounded">
            <span className="text-xs text-red-800 dark:text-red-200">CRIT</span>
            <span className="font-medium">{metrics.critical}</span>
          </div>
        </div>
        
        <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Estado del sistema de prevención:
        </div>
        
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="flex justify-between p-1.5 bg-gray-50 dark:bg-gray-800 rounded">
            <span>Errores recientes:</span>
            <span className="font-medium">{preventionState.errorCount}</span>
          </div>
          <div className="flex justify-between p-1.5 bg-gray-50 dark:bg-gray-800 rounded">
            <span>Recuperaciones:</span>
            <span className="font-medium">{preventionState.recoveryAttempts}</span>
          </div>
          <div className="flex justify-between p-1.5 bg-gray-50 dark:bg-gray-800 rounded">
            <span>En recuperación:</span>
            <span className={preventionState.isRecovering ? "font-medium text-amber-500" : "font-medium"}>
              {preventionState.isRecovering ? "Sí" : "No"}
            </span>
          </div>
          <div className="flex justify-between p-1.5 bg-gray-50 dark:bg-gray-800 rounded">
            <span>Problemas críticos:</span>
            <span className={preventionState.hasUnresolvedIssues ? "font-medium text-red-500" : "font-medium"}>
              {preventionState.hasUnresolvedIssues ? "Sí" : "No"}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full flex items-center gap-1.5"
          onClick={handleReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reiniciar Sistema</span>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ErrorMonitor;
