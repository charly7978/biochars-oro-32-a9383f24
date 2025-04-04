import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  BrainCircuit, 
  Layers, 
  Cpu,
  HardDrive,
  Network
} from "lucide-react";

export const TensorflowMonitor: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<string>("Cargando...");
  const [inferenceSpeed, setInferenceSpeed] = useState<number>(0);
  const [memoryUsage, setMemoryUsage] = useState<number>(2.5); // en MB
  const [gpuUtilization, setGpuUtilization] = useState<number>(0);

  useEffect(() => {
    // Simular carga de datos de TensorFlow
    const interval = setInterval(() => {
      setModelStatus("Activo");
      setInferenceSpeed(Math.random() * 10);
      setMemoryUsage(Math.random() * 5 + 1);
      setGpuUtilization(Math.random() * 80);
    }, 3000);

    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-400" />
            <span>Estado de TensorFlow</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Replace Memory with HardDrive for memory usage visualization */}
          <div className="space-y-4">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Uso de Memoria</span>
              <span>{memoryUsage.toFixed(1)} MB</span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <Progress value={memoryUsage / 5 * 100} className="h-2 bg-slate-700" />
            </div>
            
            <div className="flex justify-between text-xs text-slate-400">
              <span>Velocidad de Inferencia</span>
              <span>{inferenceSpeed.toFixed(2)} ms</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-green-400" />
              <Progress value={inferenceSpeed * 10} className="h-2 bg-slate-700" />
            </div>
            
            <div className="flex justify-between text-xs text-slate-400">
              <span>Utilización de GPU</span>
              <span>{gpuUtilization.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-orange-400" />
              <Progress value={gpuUtilization} className="h-2 bg-slate-700" />
            </div>
            
            <div className="text-xs text-slate-400">
              Estado del Modelo: <span className="text-green-500">{modelStatus}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-yellow-400" />
            <span>Capas de la Red Neuronal</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-slate-400">
            Información detallada sobre las capas y parámetros de la red.
          </CardDescription>
          <ul className="list-disc list-inside text-slate-400 mt-2">
            <li>Capa de entrada: 128 neuronas</li>
            <li>Capa oculta 1: 64 neuronas</li>
            <li>Capa oculta 2: 32 neuronas</li>
            <li>Capa de salida: 1 neurona</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
