import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  BarChart, 
  Timer
} from "lucide-react";

export const SystemPerformanceMonitor: React.FC = () => {
  const [cpuUsage, setCpuUsage] = useState<number>(0);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [frameRate, setFrameRate] = useState<number>(0);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [networkLatency, setNetworkLatency] = useState<number>(0);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [temperature, setTemperature] = useState<number>(0);
  const [diskUsage, setDiskUsage] = useState<number>(0);
  
  // Simular datos de rendimiento
  useEffect(() => {
    const interval = setInterval(() => {
      // Simular fluctuaciones en los datos de rendimiento
      setCpuUsage(Math.min(100, Math.max(0, cpuUsage + (Math.random() * 10 - 5))));
      setMemoryUsage(Math.min(100, Math.max(0, memoryUsage + (Math.random() * 8 - 4))));
      setFrameRate(Math.min(60, Math.max(10, frameRate + (Math.random() * 6 - 3))));
      setProcessingTime(Math.min(100, Math.max(1, processingTime + (Math.random() * 10 - 5))));
      setNetworkLatency(Math.min(200, Math.max(10, networkLatency + (Math.random() * 20 - 10))));
      setBatteryLevel(Math.max(0, Math.min(100, batteryLevel + (Math.random() * 2 - 1))));
      setTemperature(Math.min(80, Math.max(30, temperature + (Math.random() * 4 - 2))));
      setDiskUsage(Math.min(100, Math.max(0, diskUsage + (Math.random() * 2 - 1))));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [cpuUsage, memoryUsage, frameRate, processingTime, networkLatency, batteryLevel, temperature, diskUsage]);
  
  // Inicializar con valores aleatorios
  useEffect(() => {
    setCpuUsage(Math.random() * 50 + 10);
    setMemoryUsage(Math.random() * 40 + 20);
    setFrameRate(Math.random() * 20 + 25);
    setProcessingTime(Math.random() * 30 + 10);
    setNetworkLatency(Math.random() * 50 + 50);
    setBatteryLevel(Math.random() * 30 + 70);
    setTemperature(Math.random() * 20 + 40);
    setDiskUsage(Math.random() * 30 + 40);
  }, []);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <span>CPU y Memoria</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Uso de CPU</span>
              <span>{cpuUsage.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <Progress value={cpuUsage} className="h-2 bg-slate-700" />
            </div>
            
            <div className="flex justify-between text-xs text-slate-400">
              <span>Uso de Memoria</span>
              <span>{memoryUsage.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-green-400" />
              <Progress value={memoryUsage} className="h-2 bg-slate-700" />
            </div>
            
            <div className="flex justify-between text-xs text-slate-400">
              <span>Uso de Disco</span>
              <span>{diskUsage.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <Progress value={diskUsage} className="h-2 bg-slate-700" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span>Rendimiento de Procesamiento</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Frames por Segundo</span>
              <span>{frameRate.toFixed(1)} FPS</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              <Progress value={(frameRate / 60) * 100} className="h-2 bg-slate-700" />
            </div>
            
            <div className="flex justify-between text-xs text-slate-400">
              <span>Tiempo de Procesamiento</span>
              <span>{processingTime.toFixed(1)} ms</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-yellow-400" />
              <Progress 
                value={100 - (processingTime / 100) * 100} 
                className="h-2 bg-slate-700" 
              />
            </div>
            
            <div className="flex justify-between text-xs text-slate-400">
              <span>Latencia de Red</span>
              <span>{networkLatency.toFixed(0)} ms</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart className="w-4 h-4 text-red-400" />
              <Progress 
                value={100 - (networkLatency / 200) * 100} 
                className="h-2 bg-slate-700" 
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-900 border-slate-800 md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart className="w-5 h-5 text-yellow-400" />
            <span>Estadísticas del Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Temperatura del Sistema</span>
                <span className={`font-medium ${temperature > 70 ? 'text-red-400' : temperature > 60 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {temperature.toFixed(1)}°C
                </span>
              </div>
              <Progress 
                value={(temperature / 80) * 100} 
                className={`h-2 bg-slate-700 ${temperature > 70 ? 'text-red-400' : temperature > 60 ? 'text-yellow-400' : 'text-green-400'}`} 
              />
              
              <div className="flex justify-between text-sm mt-4">
                <span className="text-slate-400">Nivel de Batería</span>
                <span className={`font-medium ${batteryLevel < 20 ? 'text-red-400' : batteryLevel < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {batteryLevel.toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={batteryLevel} 
                className={`h-2 bg-slate-700 ${batteryLevel < 20 ? 'text-red-400' : batteryLevel < 50 ? 'text-yellow-400' : 'text-green-400'}`} 
              />
            </div>
            
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-slate-400">Tiempo de Actividad</div>
                  <div className="text-lg font-medium text-white">3h 42m</div>
                </div>
                
                <div className="bg-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-slate-400">Procesos Activos</div>
                  <div className="text-lg font-medium text-white">24</div>
                </div>
                
                <div className="bg-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-slate-400">Hilos</div>
                  <div className="text-lg font-medium text-white">86</div>
                </div>
                
                <div className="bg-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-slate-400">Eventos/s</div>
                  <div className="text-lg font-medium text-white">{(frameRate * 4).toFixed(0)}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
