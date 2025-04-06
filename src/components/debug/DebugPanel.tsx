
import React, { useState, useEffect } from 'react';
import { getErrorBuffer, clearErrorBuffer, setVerboseLogging, ErrorLevel } from '@/utils/debugUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import SignalDebugger from './SignalDebugger';

interface SignalMetrics {
  avgValue?: number;
  minValue?: number;
  maxValue?: number;
  stdDev?: number;
  frameRate?: number;
  signalQuality?: number;
  heartRate?: number;
}

interface DebugPanelProps {
  isVisible?: boolean;
  onClose?: () => void;
  signalData?: any[];
  rawValues?: number[];
  filteredValues?: number[];
  metrics?: SignalMetrics;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  isVisible = true,
  onClose,
  signalData = [],
  rawValues = [],
  filteredValues = [],
  metrics = {}
}) => {
  const [errors, setErrors] = useState(getErrorBuffer());
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [verboseLogging, setVerboseLoggingState] = useState(false);
  
  // Count errors by level
  const errorCounts = {
    info: errors.filter(e => e.level === ErrorLevel.INFO).length,
    warning: errors.filter(e => e.level === ErrorLevel.WARNING).length,
    error: errors.filter(e => e.level === ErrorLevel.ERROR).length,
    critical: errors.filter(e => e.level === ErrorLevel.CRITICAL).length
  };
  
  // Auto-refresh errors
  useEffect(() => {
    if (!isVisible || !autoRefresh) return;
    
    const intervalId = setInterval(() => {
      setErrors(getErrorBuffer());
      setRefreshCounter(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [isVisible, autoRefresh]);
  
  // Toggle verbose logging
  const handleVerboseLoggingChange = (checked: boolean) => {
    setVerboseLoggingState(checked);
    setVerboseLogging(checked);
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Debug Panel</CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <span className="sr-only">Close</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </Button>
            )}
          </div>
          <CardDescription>
            Herramienta de diagnóstico para depuración de señales y errores
          </CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="signal" className="flex-1 flex flex-col">
          <div className="px-4 border-b">
            <TabsList className="grid grid-cols-3 my-2">
              <TabsTrigger value="signal">Visualizador de Señal</TabsTrigger>
              <TabsTrigger value="errors">
                Registro de Errores 
                {(errorCounts.error > 0 || errorCounts.critical > 0) && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {errorCounts.error + errorCounts.critical}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings">Configuración</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="signal" className="flex-1 px-6 py-4 overflow-hidden flex flex-col">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Métricas de Señal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Valor Promedio</span>
                      <span className="text-xl font-semibold">{metrics.avgValue?.toFixed(3) || '--'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">FPS</span>
                      <span className="text-xl font-semibold">{metrics.frameRate || '--'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Calidad</span>
                      <span className="text-xl font-semibold">{metrics.signalQuality || '--'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Pulso</span>
                      <span className="text-xl font-semibold">{metrics.heartRate || '--'} BPM</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Estadísticas de Errores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-sm text-blue-500">INFO</span>
                      <span className="text-xl font-semibold">{errorCounts.info}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-amber-500">WARNING</span>
                      <span className="text-xl font-semibold">{errorCounts.warning}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-red-500">ERROR</span>
                      <span className="text-xl font-semibold">{errorCounts.error}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm bg-red-600 text-white px-1 rounded">CRITICAL</span>
                      <span className="text-xl font-semibold">{errorCounts.critical}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex-1 pb-2">
              <SignalDebugger
                signalData={signalData}
                rawValues={rawValues}
                filteredValues={filteredValues}
                showErrorLog={false}
                showControls={false}
                height="100%"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="errors" className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-500">
                  Total de errores registrados: <span className="font-medium">{errors.length}</span>
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <Label htmlFor="auto-refresh">Auto-refresh</Label>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    clearErrorBuffer();
                    setErrors([]);
                  }}
                >
                  Limpiar
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              {errors.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No hay errores registrados
                </div>
              ) : (
                <table className="w-full min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Tiempo</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Nivel</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Origen</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Mensaje</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Datos</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {errors.map((error, index) => {
                      // Get level color
                      let levelClass = "";
                      switch (error.level) {
                        case ErrorLevel.INFO: levelClass = "text-blue-500"; break;
                        case ErrorLevel.WARNING: levelClass = "text-amber-500"; break;
                        case ErrorLevel.ERROR: levelClass = "text-red-500"; break;
                        case ErrorLevel.CRITICAL: levelClass = "text-white bg-red-600 px-1 rounded"; break;
                        default: levelClass = "text-gray-700";
                      }
                      
                      return (
                        <tr key={`${error.timestamp}-${index}`}>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                            {new Date(error.timestamp).toLocaleTimeString()} 
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`text-xs font-medium ${levelClass}`}>
                              {error.level.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs">
                            {error.source}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {error.message}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {error.data ? (
                              <details>
                                <summary className="cursor-pointer text-blue-500">Ver detalles</summary>
                                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40 text-[10px]">
                                  {JSON.stringify(error.data, null, 2)}
                                </pre>
                                {error.stack && (
                                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40 text-[10px]">
                                    {error.stack}
                                  </pre>
                                )}
                              </details>
                            ) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="settings" className="p-6">
            <div className="grid gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Opciones de Depuración</h3>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="verbose-logging" className="text-base">Logging Detallado</Label>
                      <p className="text-sm text-gray-500">Activa el registro detallado de eventos, incluyendo INFO</p>
                    </div>
                    <Switch 
                      id="verbose-logging" 
                      checked={verboseLogging}
                      onCheckedChange={handleVerboseLoggingChange}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Información del Sistema</h3>
                <div className="grid gap-2">
                  <div>
                    <span className="text-sm font-medium">Navegador:</span>
                    <span className="text-sm ml-2">{navigator.userAgent}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Plataforma:</span>
                    <span className="text-sm ml-2">{navigator.platform}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Memoria disponible:</span>
                    <span className="text-sm ml-2">
                      {(performance as any).memory?.jsHeapSizeLimit ? 
                        `${Math.round((performance as any).memory.usedJSHeapSize / 1048576)} MB / ${Math.round((performance as any).memory.jsHeapSizeLimit / 1048576)} MB` : 
                        'No disponible'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <CardFooter className="border-t flex justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <span className="text-xs text-gray-500">
            Actualizado hace {refreshCounter} segundo{refreshCounter !== 1 ? 's' : ''}
          </span>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DebugPanel;
