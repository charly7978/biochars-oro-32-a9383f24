
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, HardDrive, Memory, Wifi, Clock, Activity } from 'lucide-react';

export const SystemPerformanceMonitor: React.FC = () => {
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [frameRate, setFrameRate] = useState(0);
  const [networkLatency, setNetworkLatency] = useState(0);
  const [processingLoad, setProcessingLoad] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cores: navigator.hardwareConcurrency || 'Unknown',
    deviceMemory: (navigator as any).deviceMemory || 'Unknown',
    connection: (navigator as any).connection?.effectiveType || 'Unknown'
  });
  
  // Simulated performance monitoring data
  useEffect(() => {
    const updateMetrics = () => {
      setCpuUsage(Math.floor(Math.random() * 30) + 10); // 10-40%
      setMemoryUsage(Math.floor(Math.random() * 40) + 20); // 20-60%
      setFrameRate(Math.floor(Math.random() * 30) + 30); // 30-60 FPS
      setNetworkLatency(Math.floor(Math.random() * 100) + 50); // 50-150ms
      setProcessingLoad(Math.floor(Math.random() * 50) + 20); // 20-70%
    };
    
    updateMetrics(); // Initial update
    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, []);
  
  const getStatusColor = (value: number, thresholds: { low: number, medium: number }): string => {
    if (value <= thresholds.low) return "text-green-500";
    if (value <= thresholds.medium) return "text-amber-500";
    return "text-red-500";
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      <Card className="md:col-span-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Rendimiento del Sistema
          </CardTitle>
          <CardDescription>Métricas en tiempo real de rendimiento y utilización</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <Cpu className="h-4 w-4 mr-2" />
                    Uso de CPU
                  </span>
                  <span className={`font-medium ${getStatusColor(cpuUsage, { low: 20, medium: 50 })}`}>
                    {cpuUsage}%
                  </span>
                </div>
                <Progress value={cpuUsage} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <Memory className="h-4 w-4 mr-2" />
                    Uso de Memoria
                  </span>
                  <span className={`font-medium ${getStatusColor(memoryUsage, { low: 30, medium: 60 })}`}>
                    {memoryUsage}%
                  </span>
                </div>
                <Progress value={memoryUsage} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Tasa de Cuadros
                  </span>
                  <span className={`font-medium ${getStatusColor(60 - frameRate, { low: 20, medium: 40 })}`}>
                    {frameRate} FPS
                  </span>
                </div>
                <Progress value={(frameRate / 60) * 100} className="h-2" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <Wifi className="h-4 w-4 mr-2" />
                    Latencia de Red
                  </span>
                  <span className={`font-medium ${getStatusColor(networkLatency, { low: 80, medium: 150 })}`}>
                    {networkLatency} ms
                  </span>
                </div>
                <Progress value={(networkLatency / 200) * 100} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    Carga de Procesamiento
                  </span>
                  <span className={`font-medium ${getStatusColor(processingLoad, { low: 30, medium: 60 })}`}>
                    {processingLoad}%
                  </span>
                </div>
                <Progress value={processingLoad} className="h-2" />
              </div>
              
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Tiempo de Ejecución</span>
                    <div className="font-medium">
                      {Math.floor(performance.now() / 1000 / 60)} minutos
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Estado</span>
                    <div>
                      <Badge variant="outline" className="bg-green-100">
                        Operativo
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Información del Dispositivo
          </CardTitle>
          <CardDescription>Detalles del hardware y sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr,2fr] gap-1">
              <span className="text-sm text-muted-foreground">Plataforma:</span>
              <span className="text-sm font-medium truncate">{deviceInfo.platform}</span>
            </div>
            <div className="grid grid-cols-[1fr,2fr] gap-1">
              <span className="text-sm text-muted-foreground">Núcleos:</span>
              <span className="text-sm font-medium">{deviceInfo.cores}</span>
            </div>
            <div className="grid grid-cols-[1fr,2fr] gap-1">
              <span className="text-sm text-muted-foreground">Memoria:</span>
              <span className="text-sm font-medium">
                {typeof deviceInfo.deviceMemory === 'number' ? 
                  `${deviceInfo.deviceMemory}GB` : 
                  deviceInfo.deviceMemory}
              </span>
            </div>
            <div className="grid grid-cols-[1fr,2fr] gap-1">
              <span className="text-sm text-muted-foreground">Conexión:</span>
              <span className="text-sm font-medium">{deviceInfo.connection}</span>
            </div>
            <div className="grid grid-cols-[1fr,2fr] gap-1">
              <span className="text-sm text-muted-foreground">Idioma:</span>
              <span className="text-sm font-medium">{deviceInfo.language}</span>
            </div>
          </div>
          
          <div className="pt-2">
            <h4 className="text-sm font-medium mb-2">Estado de Procesadores</h4>
            <div className="grid grid-cols-2 gap-2">
              <Badge variant="outline" className="bg-green-100 justify-center">WebGL: Activo</Badge>
              <Badge variant="outline" className="bg-green-100 justify-center">WebWorkers: 2</Badge>
              <Badge variant="outline" className="bg-green-100 justify-center">WebAssembly: Sí</Badge>
              <Badge variant="outline" className="bg-amber-100 justify-center">WebGPU: No</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
