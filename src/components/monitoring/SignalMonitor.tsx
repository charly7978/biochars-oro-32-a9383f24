
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { getFingerDetectionState } from '@/modules/signal-processing/finger-detection/unified-finger-detector';
import { Activity, Signal, Wifi } from 'lucide-react';
import { useDebugMode } from '@/hooks/useDebugMode';

export const SignalMonitor: React.FC = () => {
  const [detectionState, setDetectionState] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const { isDebugMode } = useDebugMode();
  
  useEffect(() => {
    // Update detection state every 500ms
    const interval = setInterval(() => {
      try {
        const state = getFingerDetectionState();
        setDetectionState(state);
        
        if (state && state.sources) {
          const sourceEntries = Object.entries(state.sources)
            .map(([key, value]: [string, any]) => ({
              name: key,
              ...value,
              key
            }))
            .filter(source => source.name !== undefined)
            .sort((a, b) => b.confidence - a.confidence);
          
          setSources(sourceEntries);
        }
      } catch (err) {
        console.error("Error getting detection state:", err);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!detectionState) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Inicializando monitor de señal...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Signal className="w-5 h-5" />
            Estado de Señal
          </CardTitle>
          <CardDescription>Monitoreo en tiempo real</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Dedo Detectado:</span>
              <Badge variant={detectionState.isFingerDetected ? "default" : "outline"}>
                {detectionState.isFingerDetected ? "DETECTADO" : "NO DETECTADO"}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Confianza:</span>
                <span>{Math.round(detectionState.confidence * 100)}%</span>
              </div>
              <Progress value={detectionState.confidence * 100} className="h-2" />
            </div>
            
            {isDebugMode && detectionState.thresholds && (
              <div className="text-xs border p-2 rounded bg-muted/50 mt-2">
                <p className="font-medium mb-1">Umbrales de Detección:</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Sensibilidad:</span>
                    <span>{detectionState.thresholds.sensitivityLevel?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Factor de Calidad:</span>
                    <span>{detectionState.thresholds.qualityFactor?.toFixed(2) || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Fuentes de Detección
          </CardTitle>
          <CardDescription>
            {sources.length} fuentes activas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px]">
            <div className="space-y-3">
              {sources.map((source) => (
                <div key={source.key} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{source.name}</span>
                    <Badge variant={source.detected ? "default" : "outline"} className="ml-2">
                      {source.detected ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={source.confidence * 100} className="h-1.5" />
                    <span className="text-xs w-8 text-right">{Math.round(source.confidence * 100)}%</span>
                  </div>
                </div>
              ))}
              
              {sources.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <p>No hay fuentes de detección activas</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignalMonitor;
