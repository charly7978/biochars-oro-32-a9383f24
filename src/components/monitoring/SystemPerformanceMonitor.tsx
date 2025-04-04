
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Cpu, Memory, Clock, Gauge, Activity } from 'lucide-react';
import { logError, ErrorLevel } from '@/utils/debugUtils';

export const SystemPerformanceMonitor: React.FC = () => {
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [frameRate, setFrameRate] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const [benchmarkScore, setBenchmarkScore] = useState(0);
  const [optimizationLevel, setOptimizationLevel] = useState('');
  
  // Simular datos de rendimiento
  useEffect(() => {
    try {
      const intervalId = setInterval(() => {
        // Simulación de datos de rendimiento del sistema
        const newCpuUsage = Math.random() * 30 + 20;
        const newMemoryUsage = Math.random() * 20 + 40;
        const newFrameRate = Math.random() * 5 + 25;
        const newProcessingTime = Math.random() * 10 + 5;
        
        setCpuUsage(newCpuUsage);
        setMemoryUsage(newMemoryUsage);
        setFrameRate(newFrameRate);
        setProcessingTime(newProcessingTime);
        
        // Actualizar benchmark y nivel de optimización
        const score = Math.round((60 / newProcessingTime) * (newFrameRate / 30) * 100);
        setBenchmarkScore(score);
        
        // Determinar nivel de optimización
        if (score > 120) {
          setOptimizationLevel('alto');
        } else if (score > 80) {
          setOptimizationLevel('medio');
        } else {
          setOptimizationLevel('bajo');
        }
      }, 2000);
      
      return () => clearInterval(intervalId);
    } catch (error) {
      logError(
        `Error actualizando monitor de rendimiento: ${error}`,
        ErrorLevel.ERROR,
        "SystemPerformanceMonitor"
      );
    }
  }, []);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          Rendimiento del Sistema
        </CardTitle>
        <CardDescription>
          Métricas de rendimiento en tiempo real
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-1">
                <Cpu className="h-4 w-4" /> CPU
              </Label>
              <Badge variant="outline">{cpuUsage.toFixed(1)}%</Badge>
            </div>
            <Progress value={cpuUsage} />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-1">
                <Memory className="h-4 w-4" /> Memoria
              </Label>
              <Badge variant="outline">{memoryUsage.toFixed(1)}%</Badge>
            </div>
            <Progress value={memoryUsage} />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> Velocidad de Cuadros
              </Label>
              <Badge variant="outline">{frameRate.toFixed(1)} FPS</Badge>
            </div>
            <Progress value={(frameRate / 30) * 100} />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-1">
                <Activity className="h-4 w-4" /> Tiempo de Procesamiento
              </Label>
              <Badge variant="outline">{processingTime.toFixed(1)} ms</Badge>
            </div>
            <Progress value={100 - (processingTime / 20) * 100} />
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <div>
                <Label className="text-sm font-bold">Puntuación de Rendimiento</Label>
                <p className="text-sm text-muted-foreground">Basado en velocidad de procesamiento</p>
              </div>
              <div className="flex flex-col items-end">
                <Badge variant={
                  benchmarkScore > 120 ? "default" : 
                  benchmarkScore > 80 ? "secondary" : 
                  "outline"
                }>
                  {benchmarkScore} puntos
                </Badge>
                <span className="text-xs text-muted-foreground mt-1">
                  Nivel de optimización: {optimizationLevel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
