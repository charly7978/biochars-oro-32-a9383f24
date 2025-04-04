import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  AlertCircle, 
  Signal, 
  Zap,
  BarChart4
} from "lucide-react";

// Modified SignalMonitor component that correctly uses Lucide React icons
export const SignalMonitor: React.FC = () => {
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [signalStrength, setSignalStrength] = useState<number>(0);
  const [signalNoise, setSignalNoise] = useState<number>(0);
  const [frameRate, setFrameRate] = useState<number>(0);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signalDataRef = useRef<number[]>([]);
  
  // Simulated data for demonstration
  useEffect(() => {
    const interval = setInterval(() => {
      // Update signal quality (0-100)
      setSignalQuality(prev => {
        const baseValue = prev || 65;
        const newValue = baseValue + (Math.random() * 10 - 5);
        return Math.max(0, Math.min(100, newValue));
      });
      
      // Update signal strength (0-100)
      setSignalStrength(prev => {
        const baseValue = prev || 70;
        const newValue = baseValue + (Math.random() * 8 - 4);
        return Math.max(0, Math.min(100, newValue));
      });
      
      // Update signal noise (0-100)
      setSignalNoise(prev => {
        const baseValue = prev || 25;
        const newValue = baseValue + (Math.random() * 10 - 5);
        return Math.max(0, Math.min(100, newValue));
      });
      
      // Update frame rate (0-60)
      setFrameRate(prev => {
        const baseValue = prev || 30;
        const newValue = baseValue + (Math.random() * 4 - 2);
        return Math.max(0, Math.min(60, newValue));
      });
      
      // Update processing time (0-50ms)
      setProcessingTime(prev => {
        const baseValue = prev || 15;
        const newValue = baseValue + (Math.random() * 6 - 3);
        return Math.max(1, Math.min(50, newValue));
      });
      
      // Update active state randomly
      if (Math.random() > 0.95) {
        setIsActive(prev => !prev);
      }
      
      // Update last update time
      setLastUpdate(Date.now());
      
      // Add new data point to signal data
      const newDataPoint = Math.sin(Date.now() / 500) * 0.5 + 0.5 + (Math.random() * 0.2 - 0.1);
      signalDataRef.current = [...signalDataRef.current, newDataPoint].slice(-100);
      
      // Draw signal
      drawSignal();
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  // Draw signal on canvas
  const drawSignal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Draw signal
    if (signalDataRef.current.length > 1) {
      ctx.strokeStyle = '#3b82f6'; // blue-500
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const step = canvas.width / (signalDataRef.current.length - 1);
      
      signalDataRef.current.forEach((value, index) => {
        const x = index * step;
        const y = canvas.height - (value * canvas.height);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    }
  };
  
  // Format time since last update
  const formatTimeSince = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s ago`;
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-white flex items-center gap-2">
              <Signal className="w-5 h-5 text-blue-400" />
              <span>Extracción de Señal PPG</span>
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-slate-800 text-white border-slate-700"
            >
              Refrescar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-40 w-full mb-4">
            <canvas 
              ref={canvasRef} 
              width={500} 
              height={160} 
              className="w-full h-full"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Calidad de Señal</span>
                <span>{signalQuality.toFixed(1)}%</span>
              </div>
              <Progress 
                value={signalQuality} 
                className="h-2 bg-slate-700" 
                indicatorClassName={
                  signalQuality > 70 ? "bg-green-500" : 
                  signalQuality > 40 ? "bg-yellow-500" : "bg-red-500"
                }
              />
              
              <div className="flex justify-between text-xs text-slate-400 mt-4">
                <span>Intensidad</span>
                <span>{signalStrength.toFixed(1)}%</span>
              </div>
              <Progress value={signalStrength} className="h-2 bg-slate-700" />
              
              <div className="flex justify-between text-xs text-slate-400 mt-4">
                <span>Ruido</span>
                <span>{signalNoise.toFixed(1)}%</span>
              </div>
              <Progress 
                value={signalNoise} 
                className="h-2 bg-slate-700" 
                indicatorClassName={
                  signalNoise < 30 ? "bg-green-500" : 
                  signalNoise < 60 ? "bg-yellow-500" : "bg-red-500"
                }
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-300">Estado</span>
                <div className={`px-2 py-1 rounded text-xs ${
                  isActive ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                }`}>
                  {isActive ? "Activo" : "Inactivo"}
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-slate-400">
                <span>Frames por segundo</span>
                <span>{frameRate.toFixed(1)} FPS</span>
              </div>
              <Progress value={(frameRate / 60) * 100} className="h-2 bg-slate-700" />
              
              <div className="flex justify-between text-xs text-slate-400 mt-4">
                <span>Tiempo de procesamiento</span>
                <span>{processingTime.toFixed(1)} ms</span>
              </div>
              <Progress 
                value={(processingTime / 50) * 100} 
                className="h-2 bg-slate-700"
                indicatorClassName={
                  processingTime < 20 ? "bg-green-500" : 
                  processingTime < 35 ? "bg-yellow-500" : "bg-red-500"
                }
              />
              
              <div className="text-xs text-slate-400 mt-4">
                Última actualización: {formatTimeSince(lastUpdate)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span>Análisis de Señal</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">Amplitud</span>
                <span className="text-sm font-mono text-green-400">
                  {(signalStrength / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">Frecuencia</span>
                <span className="text-sm font-mono text-blue-400">
                  {(1.2 + Math.random() * 0.4).toFixed(2)} Hz
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">SNR</span>
                <span className="text-sm font-mono text-yellow-400">
                  {(signalStrength / (signalNoise || 1)).toFixed(2)} dB
                </span>
              </div>
            </div>
            
            <div className="bg-slate-800 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">Picos detectados</span>
                <span className="text-sm font-mono text-purple-400">
                  {Math.floor(Math.random() * 10) + 20}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">Intervalo RR</span>
                <span className="text-sm font-mono text-cyan-400">
                  {Math.floor(Math.random() * 100) + 700} ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Variabilidad</span>
                <span className="text-sm font-mono text-red-400">
                  {Math.floor(Math.random() * 20) + 30} ms
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-slate-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className={`w-4 h-4 ${
                signalQuality > 70 ? "text-green-400" : 
                signalQuality > 40 ? "text-yellow-400" : "text-red-400"
              }`} />
              <span className="text-sm text-slate-300">Diagnóstico de señal</span>
            </div>
            <p className="text-xs text-slate-400">
              {signalQuality > 70 
                ? "Señal de alta calidad. Extracción óptima de datos PPG."
                : signalQuality > 40
                ? "Señal de calidad media. Posible ruido en la extracción."
                : "Señal de baja calidad. Dificultad en la extracción de datos."
              }
            </p>
            
            <div className="flex items-center gap-2 mt-3 mb-2">
              <Zap className={`w-4 h-4 ${isActive ? "text-green-400" : "text-red-400"}`} />
              <span className="text-sm text-slate-300">Estado del extractor</span>
            </div>
            <p className="text-xs text-slate-400">
              {isActive
                ? "Extractor funcionando correctamente. Procesando datos en tiempo real."
                : "Extractor inactivo o con problemas. Verifique la conexión."
              }
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-900 border-slate-800 md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart4 className="w-5 h-5 text-indigo-400" />
            <span>Métricas de Extracción</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 p-3 rounded-lg">
              <div className="text-sm text-slate-300 mb-1">Frames Procesados</div>
              <div className="text-2xl font-bold text-white">
                {Math.floor(Math.random() * 1000) + 5000}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Desde el inicio de la sesión
              </div>
            </div>
            
            <div className="bg-slate-800 p-3 rounded-lg">
              <div className="text-sm text-slate-300 mb-1">Tiempo Promedio</div>
              <div className="text-2xl font-bold text-white">
                {processingTime.toFixed(1)} ms
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Por frame procesado
              </div>
            </div>
            
            <div className="bg-slate-800 p-3 rounded-lg">
              <div className="text-sm text-slate-300 mb-1">Calidad Media</div>
              <div className="text-2xl font-bold text-white">
                {signalQuality.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400 mt-1">
                En los últimos 5 minutos
              </div>
            </div>
            
            <div className="bg-slate-800 p-3 rounded-lg">
              <div className="text-sm text-slate-300 mb-1">Errores</div>
              <div className="text-2xl font-bold text-white">
                {Math.floor(Math.random() * 5)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Detectados durante la extracción
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
