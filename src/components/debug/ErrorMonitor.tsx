import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getErrorBuffer, ErrorLevel, clearErrorBuffer } from '@/utils/debugUtils';
import { getErrorPreventionState, resetErrorPreventionSystem, acknowledgeIssues, getErrorAnalytics } from '@/utils/errorPrevention';
import { getCameraState, getDeviceErrorHistory, clearDeviceErrorHistory, CameraState } from '@/utils/deviceErrorTracker';
import { AlertTriangle, Info, AlertCircle, AlertOctagon, RotateCcw, Camera, RefreshCw } from 'lucide-react';

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
    lastHour: null,
    lastErrorTime: null
  });
  const [preventionState, setPreventionState] = useState(getErrorPreventionState());
  const [errorAnalytics, setErrorAnalytics] = useState(getErrorAnalytics());
  const [cameraState, setCameraState] = useState(getCameraState());
  const [deviceErrors, setDeviceErrors] = useState(getDeviceErrorHistory());
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
    setErrorAnalytics(getErrorAnalytics());
    setCameraState(getCameraState());
    setDeviceErrors(getDeviceErrorHistory());
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
    clearDeviceErrorHistory();
    setRefreshTrigger(prev => prev + 1);
  };
  
  const handleAcknowledgeIssues = () => {
    acknowledgeIssues();
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Determine system health status
  const getHealthStatus = (): { status: string; color: string; icon: React.ReactNode } => {
    const healthStatus = preventionState.healthStatus;
    
    switch (healthStatus) {
      case 'critical':
        return { 
          status: 'Crítico', 
          color: 'text-red-600', 
          icon: <AlertOctagon className="h-5 w-5 text-red-600" /> 
        };
      case 'degraded':
        return { 
          status: 'Degradado', 
          color: 'text-orange-500', 
          icon: <AlertCircle className="h-5 w-5 text-orange-500" /> 
        };
      case 'warning':
        return { 
          status: 'Advertencia', 
          color: 'text-amber-500', 
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" /> 
        };
      default:
        return { 
          status: 'Saludable', 
          color: 'text-green-500', 
          icon: <Info className="h-5 w-5 text-green-500" /> 
        };
    }
  };
  
  // Get camera status display
  const getCameraStatusDisplay = (): { text: string; color: string; } => {
    switch (cameraState) {
      case CameraState.ACTIVE:
        return { text: 'Activa', color: 'text-green-500' };
      case CameraState.REQUESTING:
        return { text: 'Solicitando', color: 'text-amber-500' };
      case CameraState.ERROR:
        return { text: 'Error', color: 'text-red-500' };
      default:
        return { text: 'Inactiva', color: 'text-gray-500' };
    }
  };
  
  const healthStatus = getHealthStatus();
  const cameraStatus = getCameraStatusDisplay();
  
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
        
        <div className="grid grid-cols-2 gap-1 text-xs mb-3">
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
        
        <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Camera className="h-3 w-3" />
          <span>Estado de la cámara:</span>
        </div>
        
        <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded mb-3">
          <span className="text-sm">Estado:</span>
          <span className={`font-medium ${cameraStatus.color}`}>{cameraStatus.text}</span>
        </div>
        
        {deviceErrors.length > 0 && (
          <div className="mb-2 p-2 border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/20 rounded text-xs">
            <div className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Errores de dispositivo recientes ({deviceErrors.length})</span>
            </div>
            <div className="text-amber-700 dark:text-amber-400">
              {deviceErrors[0].message}
              {deviceErrors.length > 1 && ` (y ${deviceErrors.length - 1} más)`}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 flex gap-2 flex-wrap">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1.5"
          onClick={handleReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reiniciar Sistema</span>
        </Button>
        
        {preventionState.hasUnresolvedIssues && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1.5"
            onClick={handleAcknowledgeIssues}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reconocer Problemas</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ErrorMonitor;
