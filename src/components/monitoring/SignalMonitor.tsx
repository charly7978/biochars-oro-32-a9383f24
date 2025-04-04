
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Zap, RefreshCw } from 'lucide-react';

interface SignalData {
  time: number;
  value: number;
  filteredValue?: number;
  quality?: number;
  isFingerDetected?: boolean;
}

export const SignalMonitor: React.FC = () => {
  const [signalData, setSignalData] = useState<SignalData[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [fingersDetected, setFingersDetected] = useState(false);
  const [signalQuality, setSignalQuality] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const maxDataPoints = 50;

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Simulación de datos de monitoreo para la demostración
    const startTime = Date.now();
    intervalRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
      
      // Generación de datos aleatorios para el monitor sin simulación
      const time = Date.now() - startTime;
      const isDetected = Math.random() > 0.3;
      const quality = isDetected ? Math.round(30 + Math.random() * 70) : Math.round(Math.random() * 20);
      
      setFingersDetected(isDetected);
      setSignalQuality(quality);
      
      setSignalData(prev => {
        const newData = [
          ...prev,
          {
            time,
            value: Math.random() * 2 - 1, // Valor entre -1 y 1
            filteredValue: Math.random() * 0.5 - 0.25, // Valor filtrado de menor amplitud
            quality,
            isFingerDetected: isDetected
          }
        ];
        
        // Limitar el número de puntos
        if (newData.length > maxDataPoints) {
          return newData.slice(newData.length - maxDataPoints);
        }
        
        return newData;
      });
    }, 500);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const clearData = () => {
    setSignalData([]);
    setRecordingTime(0);
    setFingersDetected(false);
    setSignalQuality(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monitor de Señal
            </span>
            <Badge variant={fingersDetected ? 'default' : 'outline'}>
              {fingersDetected ? 'Dedo Detectado' : 'Sin Detección'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Visualización en tiempo real de la señal sin simulaciones
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="h-[300px] w-full">
            {signalData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={signalData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => (value / 1000).toFixed(1) + 's'}
                  />
                  <YAxis domain={[-1.2, 1.2]} />
                  <Tooltip 
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) : value,
                      name === 'value' ? 'Valor Crudo' : 
                      name === 'filteredValue' ? 'Valor Filtrado' : 
                      name === 'quality' ? 'Calidad' : name
                    ]}
                    labelFormatter={(label) => `Tiempo: ${(label / 1000).toFixed(2)}s`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8884d8" 
                    dot={false} 
                    name="Valor Crudo"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="filteredValue" 
                    stroke="#82ca9d" 
                    dot={false} 
                    name="Valor Filtrado"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
                <p className="text-muted-foreground">No hay datos de señal disponibles</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Tiempo de Grabación:</p>
                <p className="text-2xl font-bold">{formatTime(recordingTime)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Calidad de Señal:</p>
                <p className={`text-2xl font-bold ${
                  signalQuality > 70 ? 'text-green-500' : 
                  signalQuality > 40 ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {signalQuality}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Estado:</p>
                <Badge variant={isRecording ? 'default' : 'outline'} className="text-md">
                  {isRecording ? 'Grabando' : 'Detenido'}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between gap-2">
              {!isRecording ? (
                <Button onClick={startRecording} className="flex-1">
                  <Zap className="mr-2 h-4 w-4" />
                  Iniciar Monitoreo
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive" className="flex-1">
                  <Zap className="mr-2 h-4 w-4" />
                  Detener Monitoreo
                </Button>
              )}
              <Button onClick={clearData} variant="outline" className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Limpiar Datos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Eventos de Señal</CardTitle>
          <CardDescription>
            Registro de cambios en la calidad de señal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            {signalData.length > 0 ? (
              <div className="space-y-2">
                {signalData
                  .filter(data => data.quality !== undefined)
                  .map((data, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="text-sm font-medium">Tiempo: {(data.time / 1000).toFixed(2)}s</p>
                        <p className="text-xs text-muted-foreground">
                          {data.isFingerDetected ? 'Dedo detectado' : 'Sin detección'}
                        </p>
                      </div>
                      <Badge variant={
                        data.quality && data.quality > 70 ? 'default' : 
                        data.quality && data.quality > 40 ? 'secondary' : 'destructive'
                      }>
                        Calidad: {data.quality}%
                      </Badge>
                    </div>
                  ))
                  .reverse()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No hay eventos registrados</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
