
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDiagnosticsData, clearDiagnosticsData } from '@/hooks/heart-beat/signal-processing/peak-detection';
import { Button } from '@/components/ui/button';

export const SignalProcessingMonitor: React.FC = () => {
  const [stats, setStats] = useState({
    signalsProcessed: 0,
    avgProcessTime: 0,
    avgSignalStrength: 0,
    highPriorityPercentage: 0
  });
  
  const [events, setEvents] = useState<Array<any>>([]);

  useEffect(() => {
    // Update stats every second
    const interval = setInterval(() => {
      const diagnosticsData = getDiagnosticsData();
      if (diagnosticsData.length > 0) {
        const totalTime = diagnosticsData.reduce((sum, data) => sum + data.processTime, 0);
        const totalStrength = diagnosticsData.reduce((sum, data) => sum + data.signalStrength, 0);
        const highPriorityCount = diagnosticsData.filter(data => data.processingPriority === 'high').length;
        
        setStats({
          signalsProcessed: diagnosticsData.length,
          avgProcessTime: totalTime / diagnosticsData.length,
          avgSignalStrength: totalStrength / diagnosticsData.length,
          highPriorityPercentage: (highPriorityCount / diagnosticsData.length) * 100
        });
        
        setEvents(diagnosticsData.map(d => ({
          timestamp: d.timestamp,
          priority: d.processingPriority,
          signalStrength: d.signalStrength,
          processTime: d.processTime
        })));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Estado de Procesamiento de Señal</CardTitle>
          <CardDescription>Monitoreo en tiempo real del procesamiento PPG</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Señales Procesadas:</span>
              <span className="font-medium">{stats.signalsProcessed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tiempo Promedio de Procesamiento:</span>
              <span className="font-medium">{stats.avgProcessTime.toFixed(2)} ms</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Fuerza Promedio de Señal:</span>
              <span className="font-medium">{stats.avgSignalStrength.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Porcentaje de Alta Prioridad:</span>
              <span className="font-medium">{stats.highPriorityPercentage.toFixed(1)}%</span>
            </div>
            <div className="pt-2">
              <p className="text-sm mb-2">Calidad de Procesamiento:</p>
              <Progress value={stats.highPriorityPercentage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos de Procesamiento</CardTitle>
          <CardDescription>Últimos eventos registrados del procesador de señales</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full">
            <div className="space-y-2">
              {events.slice().reverse().slice(0, 20).map((event, idx) => (
                <div key={idx} className="text-xs border-l-2 pl-2 py-1 border-blue-300">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    <Badge variant={event.priority === 'high' ? 'default' : 'outline'}>
                      {event.priority}
                    </Badge>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fuerza:</span>
                      <span>{event.signalStrength.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tiempo:</span>
                      <span>{event.processTime.toFixed(2)} ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="mt-4">
            <Button size="sm" variant="outline" onClick={() => clearDiagnosticsData()}>
              Limpiar Eventos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
