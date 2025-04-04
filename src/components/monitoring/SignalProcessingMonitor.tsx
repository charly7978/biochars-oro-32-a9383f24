
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Zap, BarChart4, ArrowRight, ArrowDown } from 'lucide-react';
import { logError, ErrorLevel } from '@/utils/debugUtils';

// Interfaz para optimizador de parámetros simulado
interface ParameterOptimizationState {
  parameterName: string;
  currentValue: number;
  optimalValue: number | null;
  minValue: number;
  maxValue: number;
  optimizationProgress: number;
  status: 'optimizing' | 'completed' | 'pending';
}

export const SignalProcessingMonitor: React.FC = () => {
  const [optimizationEnabled, setOptimizationEnabled] = useState(true);
  const [optimizationProgress, setOptimizationProgress] = useState(68);
  const [overallQuality, setOverallQuality] = useState(82);
  const [optimizationParams, setOptimizationParams] = useState<ParameterOptimizationState[]>([]);
  const [processingPriorities, setProcessingPriorities] = useState({
    high: 35,
    medium: 45,
    low: 20
  });
  
  // Inicializar y actualizar estado de optimización
  useEffect(() => {
    try {
      // Definir parámetros iniciales
      const initialParams: ParameterOptimizationState[] = [
        {
          parameterName: 'Umbral de detección',
          currentValue: 0.42,
          optimalValue: 0.45,
          minValue: 0.1,
          maxValue: 0.9,
          optimizationProgress: 85,
          status: 'optimizing'
        },
        {
          parameterName: 'Factor de amplificación',
          currentValue: 1.8,
          optimalValue: 1.75,
          minValue: 1.0,
          maxValue: 3.0,
          optimizationProgress: 92,
          status: 'completed'
        },
        {
          parameterName: 'Sensibilidad de filtro',
          currentValue: 0.62,
          optimalValue: null,
          minValue: 0.2,
          maxValue: 1.0,
          optimizationProgress: 45,
          status: 'optimizing'
        },
        {
          parameterName: 'Tamaño de ventana',
          currentValue: 30,
          optimalValue: 28,
          minValue: 10,
          maxValue: 50,
          optimizationProgress: 95,
          status: 'completed'
        },
        {
          parameterName: 'Frecuencia de corte',
          currentValue: 2.4,
          optimalValue: null,
          minValue: 0.5,
          maxValue: 5.0,
          optimizationProgress: 32,
          status: 'optimizing'
        }
      ];
      
      setOptimizationParams(initialParams);
      
      // Actualizar periódicamente
      const intervalId = setInterval(() => {
        if (optimizationEnabled) {
          // Actualizar parámetros en optimización
          setOptimizationParams(prev => prev.map(param => {
            if (param.status !== 'optimizing') return param;
            
            // Incrementar progreso para simulación
            const newProgress = Math.min(100, param.optimizationProgress + Math.random() * 5);
            
            // Si llega al 100%, establecer óptimo
            let newStatus = param.status;
            let optimalValue = param.optimalValue;
            
            if (newProgress >= 100 && !optimalValue) {
              newStatus = 'completed';
              optimalValue = +(param.currentValue + (Math.random() * 0.2 - 0.1)).toFixed(2);
            }
            
            // Ajustar valor actual hacia el óptimo
            let newValue = param.currentValue;
            if (optimalValue) {
              newValue = param.currentValue + (optimalValue - param.currentValue) * 0.1;
              newValue = +newValue.toFixed(2);
            }
            
            return {
              ...param,
              optimizationProgress: newProgress,
              status: newStatus,
              optimalValue,
              currentValue: newValue
            };
          }));
          
          // Actualizar progreso general
          setOptimizationProgress(prev => {
            const newValue = prev + (Math.random() * 2 - 0.5);
            return Math.min(100, Math.max(0, newValue));
          });
          
          // Actualizar calidad general
          setOverallQuality(prev => {
            const newValue = prev + (Math.random() * 2 - 0.5);
            return Math.min(100, Math.max(0, newValue));
          });
          
          // Actualizar distribución de prioridades
          setProcessingPriorities(prev => {
            const highChange = Math.random() * 4 - 2;
            const mediumChange = Math.random() * 4 - 2;
            let high = Math.max(10, Math.min(60, prev.high + highChange));
            let medium = Math.max(10, Math.min(60, prev.medium + mediumChange));
            let low = 100 - high - medium;
            
            // Normalizar para asegurar que sumen 100
            const total = high + medium + low;
            high = Math.round((high / total) * 100);
            medium = Math.round((medium / total) * 100);
            low = 100 - high - medium;
            
            return { high, medium, low };
          });
        }
      }, 2000);
      
      return () => clearInterval(intervalId);
    } catch (error) {
      logError(
        `Error al inicializar monitor de procesamiento: ${error}`,
        ErrorLevel.ERROR,
        "SignalProcessingMonitor"
      );
    }
  }, [optimizationEnabled]);
  
  // Cambiar estado de optimización
  const toggleOptimization = () => {
    setOptimizationEnabled(!optimizationEnabled);
    
    if (!optimizationEnabled) {
      logError("Optimización de parámetros activada", ErrorLevel.INFO, "SignalProcessingMonitor");
    } else {
      logError("Optimización de parámetros desactivada", ErrorLevel.INFO, "SignalProcessingMonitor");
    }
  };
  
  // Renderizar gráfico de distribución de prioridades
  const renderPriorityChart = () => {
    const { high, medium, low } = processingPriorities;
    
    return (
      <div className="flex h-6 w-full overflow-hidden rounded-full">
        <div 
          className="bg-red-500" 
          style={{ width: `${high}%` }}
          title={`Alta prioridad: ${high}%`}
        />
        <div 
          className="bg-amber-500" 
          style={{ width: `${medium}%` }}
          title={`Media prioridad: ${medium}%`}
        />
        <div 
          className="bg-green-500" 
          style={{ width: `${low}%` }}
          title={`Baja prioridad: ${low}%`}
        />
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Optimización de Procesamiento
          </CardTitle>
          <Badge variant={optimizationEnabled ? "default" : "outline"}>
            {optimizationEnabled ? "OPTIMIZANDO" : "MANUAL"}
          </Badge>
        </div>
        <CardDescription>
          Optimización autoadaptativa de parámetros
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Switch 
                id="optimization-enabled" 
                checked={optimizationEnabled} 
                onCheckedChange={toggleOptimization} 
              />
              <Label htmlFor="optimization-enabled">Optimización Autoadaptativa</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Calidad de procesamiento:</span>
              <Badge variant={
                overallQuality > 85 ? "default" : 
                overallQuality > 70 ? "secondary" : 
                "outline"
              }>
                {overallQuality.toFixed(1)}%
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Progreso de Optimización</Label>
              <span className="text-sm">{optimizationProgress.toFixed(1)}%</span>
            </div>
            <Progress value={optimizationProgress} />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-1">
                <BarChart4 className="h-4 w-4" /> Distribución de Prioridades
              </Label>
            </div>
            {renderPriorityChart()}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Alta: {processingPriorities.high}%</span>
              <span>Media: {processingPriorities.medium}%</span>
              <span>Baja: {processingPriorities.low}%</span>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Parámetros en Optimización</h4>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parámetro</TableHead>
                    <TableHead>Valor Actual</TableHead>
                    <TableHead>Valor Óptimo</TableHead>
                    <TableHead>Progreso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optimizationParams.map(param => (
                    <TableRow key={param.parameterName}>
                      <TableCell>{param.parameterName}</TableCell>
                      <TableCell className="font-mono">
                        {param.currentValue}
                        {param.optimalValue && param.currentValue !== param.optimalValue && (
                          <ArrowRight className="h-3 w-3 inline ml-1 text-blue-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        {param.optimalValue !== null 
                          ? param.optimalValue 
                          : '...'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={param.optimizationProgress} 
                            className="w-[80px]"
                            indicator={
                              param.status === 'completed' ? "bg-green-600" : 
                              param.optimizationProgress > 60 ? "bg-blue-600" : 
                              "bg-amber-500"
                            }
                          />
                          <Badge variant={
                            param.status === 'completed' ? "default" : 
                            param.status === 'optimizing' ? "secondary" : 
                            "outline"
                          }>
                            {param.status}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
