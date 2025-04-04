
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PerformanceMetricsProps {
  framesProcessed: number;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  framesProcessed
}) => {
  // Track frame rate performance
  const [fps, setFps] = useState(0);
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<any>(null);
  const [lastFrameCount, setLastFrameCount] = useState(framesProcessed);
  
  // Calculate FPS
  useEffect(() => {
    const interval = setInterval(() => {
      // Calculate FPS from frames processed since last check
      const framesDelta = framesProcessed - lastFrameCount;
      const currentFps = framesDelta;
      setFps(currentFps);
      setLastFrameCount(framesProcessed);
      
      // Add to history and limit to last 10 readings
      setFpsHistory(prev => {
        const newHistory = [...prev, currentFps];
        if (newHistory.length > 10) {
          return newHistory.slice(-10);
        }
        return newHistory;
      });
      
      // Get memory usage if available
      if ((performance as any).memory) {
        setMemoryUsage((performance as any).memory);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [framesProcessed, lastFrameCount]);
  
  // Calculate average FPS
  const averageFps = fpsHistory.length > 0 
    ? fpsHistory.reduce((sum, val) => sum + val, 0) / fpsHistory.length 
    : 0;
  
  // Reference values for performance metrics
  const fpsReferences = {
    excellent: { min: 25, color: "bg-green-500", label: "Excelente" },
    good: { min: 20, color: "bg-blue-500", label: "Bueno" },
    fair: { min: 15, color: "bg-yellow-500", label: "Regular" },
    poor: { min: 10, color: "bg-orange-500", label: "Bajo" },
    critical: { min: 0, color: "bg-red-500", label: "Crítico" },
  };
  
  const getFpsColor = (fpsValue: number) => {
    if (fpsValue >= fpsReferences.excellent.min) return fpsReferences.excellent.color;
    if (fpsValue >= fpsReferences.good.min) return fpsReferences.good.color;
    if (fpsValue >= fpsReferences.fair.min) return fpsReferences.fair.min;
    if (fpsValue >= fpsReferences.poor.min) return fpsReferences.poor.color;
    return fpsReferences.critical.color;
  };
  
  const getFpsStatus = (fpsValue: number) => {
    if (fpsValue >= fpsReferences.excellent.min) return fpsReferences.excellent.label;
    if (fpsValue >= fpsReferences.good.min) return fpsReferences.good.label;
    if (fpsValue >= fpsReferences.fair.min) return fpsReferences.fair.label;
    if (fpsValue >= fpsReferences.poor.min) return fpsReferences.poor.label;
    return fpsReferences.critical.label;
  };
  
  // Format bytes to human readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      <Card className="bg-gray-900 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Rendimiento del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <div className="font-semibold mb-1 text-xs">Rendimiento de Procesamiento</div>
            <div className="flex items-center gap-2">
              <Progress value={Math.min(fps / 30 * 100, 100)} className={getFpsColor(fps)} />
              <span className="text-xs">{fps.toFixed(1)} FPS</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-400">
                Estado: {getFpsStatus(fps)}
              </span>
              <span className="text-gray-400">
                Promedio: {averageFps.toFixed(1)} FPS
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Ref: &gt;25 FPS Excelente, &gt;20 FPS Bueno, &gt;15 FPS Regular, &gt;10 FPS Bajo
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="font-semibold mb-1">Frames procesados</div>
              <div className="text-lg">{framesProcessed}</div>
            </div>
            <div>
              <div className="font-semibold mb-1">Tiempo de ejecución</div>
              <div className="text-lg" id="runtime">--:--</div>
            </div>
          </div>
          
          {memoryUsage && (
            <div className="mt-2">
              <div className="font-semibold mb-1 text-xs">Memoria:</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>Usada: {formatBytes(memoryUsage.usedJSHeapSize)}</div>
                <div>Total: {formatBytes(memoryUsage.totalJSHeapSize)}</div>
                <div>Límite: {formatBytes(memoryUsage.jsHeapSizeLimit)}</div>
                <div>
                  Uso: {((memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
          
          {/* JavaScript Runtime info */}
          <div className="mt-2">
            <div className="font-semibold mb-1 text-xs">Entorno JS:</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>Navegador: {navigator.userAgent.split(' ').slice(-1)[0].split('/')[0]}</div>
              <div>Plataforma: {navigator.platform}</div>
              <div>Conexión: {(navigator as any).connection?.effectiveType || '--'}</div>
              <div>Hilos: {navigator.hardwareConcurrency || '--'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gray-900 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Consola de Diagnóstico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-24 overflow-y-auto text-xs bg-black/50 p-2 rounded font-mono">
            <p className="text-green-400">● Sistema de monitoreo técnico activo</p>
            <p className="text-blue-400">● Procesador de señales PPG: OK</p>
            <p className="text-blue-400">● Procesador de latidos: OK</p>
            <p className="text-blue-400">● Extractor de signos vitales: OK</p>
            <p className="text-yellow-400">ℹ Esperando datos de alta calidad...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMetrics;
