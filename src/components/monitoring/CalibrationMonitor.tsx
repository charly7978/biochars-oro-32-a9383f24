import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Sliders, BarChart2, RefreshCw } from 'lucide-react';
import { getCalibrationParameters, resetCalibration } from '@/modules/signal-processing/finger-detection/adaptive-calibration';
import { toast } from '@/components/ui/use-toast';

export const CalibrationMonitor: React.FC = () => {
  const [calibrationParams, setCalibrationParams] = useState(getCalibrationParameters());
  const [calibrationHistory, setCalibrationHistory] = useState<Array<any>>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // Update calibration parameters periodically
  useEffect(() => {
    const updateCalibration = () => {
      try {
        const params = getCalibrationParameters();
        setCalibrationParams(params);
        setLastUpdateTime(new Date());
        
        // Add to history if there are changes
        setCalibrationHistory(prev => {
          // Only keep last 50 entries
          const newHistory = [...prev, {
            timestamp: Date.now(),
            params: { ...params }
          }].slice(-50);
          return newHistory;
        });
      } catch (error) {
        console.error("Error fetching calibration parameters:", error);
      }
    };
    
    updateCalibration(); // Initial update
    const interval = setInterval(updateCalibration, 2000);
    return () => clearInterval(interval);
  }, []);
  
  const handleResetCalibration = () => {
    try {
      resetCalibration();
      setCalibrationParams(getCalibrationParameters());
      setLastUpdateTime(new Date());
      
      toast({
        title: "Calibración Reiniciada",
        description: "Los parámetros de calibración han sido restaurados a sus valores por defecto."
      });
    } catch (error) {
      console.error("Error resetting calibration:", error);
      toast({
        title: "Error",
        description: "No se pudo reiniciar la calibración.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5" />
            Parámetros de Calibración
          </CardTitle>
          <CardDescription>Estado actual del sistema de calibración adaptativa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Umbral Base</div>
              <div className="flex items-center">
                <Progress value={calibrationParams.baseThreshold * 100} className="flex-1 h-2 mr-2" />
                <span className="text-sm w-12 text-right">
                  {calibrationParams.baseThreshold.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Multiplicador de Ruido</div>
              <div className="flex items-center">
                <Progress value={(calibrationParams.noiseMultiplier / 3) * 100} className="flex-1 h-2 mr-2" />
                <span className="text-sm w-12 text-right">
                  {calibrationParams.noiseMultiplier.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Compensación de Luz</div>
              <div className="flex items-center">
                <Progress value={calibrationParams.lightingCompensation * 100} className="flex-1 h-2 mr-2" />
                <span className="text-sm w-12 text-right">
                  {calibrationParams.lightingCompensation.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Compensación de Movimiento</div>
              <div className="flex items-center">
                <Progress value={(calibrationParams.motionCompensation / 4) * 100} className="flex-1 h-2 mr-2" />
                <span className="text-sm w-12 text-right">
                  {calibrationParams.motionCompensation.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Tasa de Adaptación</div>
              <div className="flex items-center">
                <Progress value={calibrationParams.adaptationRate * 200} className="flex-1 h-2 mr-2" />
                <span className="text-sm w-12 text-right">
                  {calibrationParams.adaptationRate.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Factor de Estabilidad</div>
              <div className="flex items-center">
                <Progress value={calibrationParams.stabilityFactor * 100} className="flex-1 h-2 mr-2" />
                <span className="text-sm w-12 text-right">
                  {calibrationParams.stabilityFactor.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <div className="flex justify-between mb-2">
              <h4 className="text-sm font-medium">Estado Ambiental</h4>
              <span className="text-sm text-muted-foreground">
                Última actualización: {lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : 'Nunca'}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-2 bg-slate-50 rounded-md">
                <span className="text-xs text-muted-foreground">Ruido</span>
                <span className="font-medium">{calibrationParams.environmentalState?.noise?.toFixed(3) || 'N/A'}</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-slate-50 rounded-md">
                <span className="text-xs text-muted-foreground">Iluminación</span>
                <span className="font-medium">{calibrationParams.environmentalState?.lighting?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-slate-50 rounded-md">
                <span className="text-xs text-muted-foreground">Movimiento</span>
                <span className="font-medium">{calibrationParams.environmentalState?.motion?.toFixed(3) || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div className="pt-2 flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={handleResetCalibration}
            >
              <RefreshCw className="h-3 w-3" />
              Reiniciar Calibración
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Historial de Calibración
          </CardTitle>
          <CardDescription>Cambios en parámetros a lo largo del tiempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[320px]">
            <div className="space-y-2">
              {calibrationHistory.slice().reverse().map((entry, index) => (
                <div key={index} className="border-l-2 border-blue-300 pl-3 py-1 text-sm">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Actualización
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Umbral Base:</span>
                      <span>{entry.params.baseThreshold?.toFixed(3) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Mult. Ruido:</span>
                      <span>{entry.params.noiseMultiplier?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Comp. Luz:</span>
                      <span>{entry.params.lightingCompensation?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Comp. Movimiento:</span>
                      <span>{entry.params.motionCompensation?.toFixed(2) || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {calibrationHistory.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No hay datos de calibración disponibles
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
