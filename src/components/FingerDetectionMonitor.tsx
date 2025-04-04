
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { unifiedFingerDetector } from '@/modules/signal-processing/utils/unified-finger-detector';
import { fingerDiagnostics } from '@/modules/signal-processing/utils/finger-diagnostics';
import { useFingerDetectionSystem } from '@/hooks/useFingerDetectionSystem';

interface FingerDetectionMonitorProps {
  showDetailed?: boolean;
}

export function FingerDetectionMonitor({ showDetailed = false }: FingerDetectionMonitorProps) {
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const fingerSystem = useFingerDetectionSystem({
    enableDebugLogs: true,
    enableDiagnostics: true
  });
  
  const [detailedStats, setDetailedStats] = useState<any>({
    sources: {},
    history: [],
    consensusLevel: 0,
    detectionResult: false,
    confidence: 0
  });
  
  const [diagnosticsInfo, setDiagnosticsInfo] = useState<{
    sessionId: string;
    eventCount: number;
    eventTypes: Record<string, number>;
  }>({
    sessionId: '',
    eventCount: 0,
    eventTypes: {}
  });
  
  useEffect(() => {
    // Actualizar periódicamente las estadísticas detalladas
    const updateTimer = setInterval(() => {
      setLastUpdate(Date.now());
      
      if (showDetailed) {
        // Obtener estadísticas detalladas
        const stats = fingerSystem.getDetailedStats();
        setDetailedStats(stats);
        
        // Obtener información de diagnóstico
        const diagSession = fingerSystem.getDiagnosticSession();
        if (diagSession) {
          // Contar tipos de eventos
          const eventTypes: Record<string, number> = {};
          diagSession.events.forEach(event => {
            eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
          });
          
          setDiagnosticsInfo({
            sessionId: diagSession.id,
            eventCount: diagSession.events.length,
            eventTypes
          });
        }
      }
    }, 1000);
    
    return () => {
      clearInterval(updateTimer);
    };
  }, [fingerSystem, showDetailed]);
  
  // Calcular colores basados en confianza y consenso
  const confidenceColor = fingerSystem.confidence < 0.3 ? 'bg-red-500' :
                         fingerSystem.confidence < 0.7 ? 'bg-yellow-500' :
                         'bg-green-500';
  
  const consensusColor = fingerSystem.consensusLevel < -0.3 ? 'bg-red-500' :
                        fingerSystem.consensusLevel < 0.3 ? 'bg-yellow-500' :
                        'bg-green-500';
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Detección de Dedo</span>
          <span className={`inline-block w-3 h-3 rounded-full ${fingerSystem.isFingerDetected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1 flex justify-between">
              <span>Confianza</span>
              <span>{Math.round(fingerSystem.confidence * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${confidenceColor}`}
                style={{ width: `${fingerSystem.confidence * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="text-sm text-muted-foreground mb-1 flex justify-between">
              <span>Consenso</span>
              <span>{Math.round(fingerSystem.consensusLevel * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${consensusColor}`}
                style={{ 
                  width: `${Math.abs(fingerSystem.consensusLevel) * 100}%`,
                  marginLeft: fingerSystem.consensusLevel < 0 ? 'auto' : '0' 
                }}
              ></div>
            </div>
          </div>
          
          {fingerSystem.diagnostics && (
            <div className="text-xs text-muted-foreground mt-2">
              Eventos: {fingerSystem.diagnostics.totalEvents}
              {fingerSystem.diagnostics.isRecording && (
                <span className="ml-2 inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </div>
          )}
          
          {showDetailed && (
            <Tabs defaultValue="sources">
              <TabsList className="w-full">
                <TabsTrigger value="sources" className="flex-1">Fuentes</TabsTrigger>
                <TabsTrigger value="diagnostics" className="flex-1">Diagnóstico</TabsTrigger>
              </TabsList>
              
              <TabsContent value="sources" className="mt-2">
                <div className="max-h-40 overflow-y-auto space-y-2 text-xs">
                  {Object.entries(detailedStats.sources).map(([source, state]: [string, any]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span className="truncate max-w-[120px]">{source}</span>
                      <div className="flex items-center gap-2">
                        <span 
                          className={`inline-block w-2 h-2 rounded-full ${state.isFingerDetected ? 'bg-green-500' : 'bg-red-500'}`}
                        ></span>
                        <Progress value={state.confidence * 100} className="w-16 h-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="diagnostics" className="mt-2">
                <div className="max-h-40 overflow-y-auto text-xs space-y-2">
                  {Object.entries(diagnosticsInfo.eventTypes).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span>{type}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <div className="text-[10px] text-muted-foreground text-right">
            Actualizado: {new Date(lastUpdate).toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
