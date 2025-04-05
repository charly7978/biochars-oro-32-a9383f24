
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Brain, Layers, Zap, AlertCircle, CheckCircle } from 'lucide-react';

export const NeuralNetworkMonitor: React.FC = () => {
  // States for neural network monitoring
  const [isActive, setIsActive] = useState(false);
  const [networkLoad, setNetworkLoad] = useState(0);
  const [inferenceCount, setInferenceCount] = useState(0);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [lastModelUse, setLastModelUse] = useState<Date | null>(null);
  const [modelInfo, setModelInfo] = useState({
    name: "TensorFlow Lite Optimized",
    version: "1.2.3",
    layers: 4,
    parameters: "124K",
    status: "Inactivo",
    lastActivation: null as Date | null
  });
  
  // Simulate network activity
  useEffect(() => {
    const simulateActivity = () => {
      // Check if any TensorFlow/neural network modules are in use
      // This is a placeholder - in a real app you would check actual usage
      const isTFActive = Math.random() > 0.5;
      setIsActive(isTFActive);
      
      if (isTFActive) {
        setNetworkLoad(Math.floor(Math.random() * 60) + 20); // 20-80% load
        setInferenceCount(prev => prev + Math.floor(Math.random() * 5) + 1);
        setInferenceTime(Math.random() * 10 + 5); // 5-15ms
        const now = new Date();
        setLastModelUse(now);
        
        setModelInfo(prev => ({
          ...prev,
          status: "Activo",
          lastActivation: now
        }));
      } else {
        setNetworkLoad(prev => Math.max(0, prev - 10));
      }
    };
    
    const interval = setInterval(simulateActivity, 2000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Estado de Redes Neuronales
          </CardTitle>
          <CardDescription>Monitoreo de modelos y procesos de IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Estado:</span>
            <Badge variant={isActive ? "default" : "outline"} className={isActive ? "bg-green-500" : ""}>
              {isActive ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm">Carga de la Red:</span>
              <span className="text-sm font-medium">{networkLoad}%</span>
            </div>
            <Progress value={networkLoad} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Inferencias Realizadas:</span>
              <span className="font-medium">{inferenceCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tiempo de Inferencia:</span>
              <span className="font-medium">{inferenceTime.toFixed(2)} ms</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Último Uso:</span>
              <span className="font-medium">
                {lastModelUse ? lastModelUse.toLocaleTimeString() : 'Nunca'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Información del Modelo
          </CardTitle>
          <CardDescription>Detalles técnicos y rendimiento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Nombre</span>
                <span className="font-medium">{modelInfo.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Versión</span>
                <span className="font-medium">{modelInfo.version}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Capas</span>
                <span className="font-medium">{modelInfo.layers}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Parámetros</span>
                <span className="font-medium">{modelInfo.parameters}</span>
              </div>
            </div>
            
            <div className="pt-2 space-y-2">
              <h4 className="text-sm font-medium">Estado de Componentes</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>Motor de Inferencia</span>
                  </div>
                  <Badge variant="outline" className="bg-green-100">Activo</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>Optimizador Bayesiano</span>
                  </div>
                  <Badge variant="outline" className="bg-green-100">Activo</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                    <span>Detección Avanzada</span>
                  </div>
                  <Badge variant="outline" className="bg-amber-100">En espera</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
