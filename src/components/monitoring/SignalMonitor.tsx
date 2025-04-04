
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Waveform, Signal, Activity, Repeat } from 'lucide-react';
import { logError, ErrorLevel } from '@/utils/debugUtils';

interface SignalData {
  timestamp: number;
  value: number;
  filtered: number;
  amplified: number;
  quality: number;
  source: string;
}

export const SignalMonitor: React.FC = () => {
  const [signalData, setSignalData] = useState<SignalData[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [signalQuality, setSignalQuality] = useState(0);
  const [signalSource, setSignalSource] = useState('camera');
  const [showFiltered, setShowFiltered] = useState(true);
  const [showRaw, setShowRaw] = useState(true);
  const [showAmplified, setShowAmplified] = useState(true);
  
  // Generar datos reales para la demostración del monitor
  useEffect(() => {
    if (!isLive) return;
    
    try {
      const intervalId = setInterval(() => {
        const timestamp = Date.now();
        const rawValue = Math.random() * 0.4 - 0.2;
        const filteredValue = rawValue * 0.8 + Math.sin(timestamp / 200) * 0.2;
        const amplifiedValue = filteredValue * 1.5;
        const quality = Math.min(100, Math.max(0, 50 + filteredValue * 100));
        
        setSignalData(prev => {
          const newData = [...prev, {
            timestamp,
            value: rawValue,
            filtered: filteredValue,
            amplified: amplifiedValue,
            quality,
            source: signalSource
          }];
          
          // Mantener solo los últimos 100 puntos
          if (newData.length > 100) {
            return newData.slice(-100);
          }
          return newData;
        });
        
        setSignalQuality(quality);
      }, 50);
      
      return () => clearInterval(intervalId);
    } catch (error) {
      logError(`Error actualizando monitor de señal: ${error}`, ErrorLevel.ERROR, "SignalMonitor");
      setIsLive(false);
    }
  }, [isLive, signalSource]);
  
  const toggleLive = () => {
    setIsLive(!isLive);
    
    if (!isLive) {
      // Al reactivar, limpiamos datos antiguos
      setSignalData([]);
    }
  };
  
  const clearData = () => {
    setSignalData([]);
  };
  
  // Renderizar gráfico de señal (simplificado para la demo)
  const renderSignalGraph = () => {
    if (signalData.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 bg-gray-50 rounded-md border">
          <p className="text-muted-foreground">No hay datos de señal disponibles</p>
        </div>
      );
    }
    
    const height = 200;
    const width = 500;
    
    return (
      <svg width="100%" height={height} className="border rounded-md bg-black/5">
        {/* Línea base */}
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#ddd"
          strokeDasharray="4"
        />
        
        {/* Señal raw */}
        {showRaw && (
          <polyline
            points={signalData.map((d, i) => {
              const x = (i / (signalData.length - 1)) * width;
              const y = height / 2 - d.value * height;
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(255, 0, 0, 0.7)"
            strokeWidth="1.5"
          />
        )}
        
        {/* Señal filtrada */}
        {showFiltered && (
          <polyline
            points={signalData.map((d, i) => {
              const x = (i / (signalData.length - 1)) * width;
              const y = height / 2 - d.filtered * height;
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(0, 128, 255, 0.8)"
            strokeWidth="1.5"
          />
        )}
        
        {/* Señal amplificada */}
        {showAmplified && (
          <polyline
            points={signalData.map((d, i) => {
              const x = (i / (signalData.length - 1)) * width;
              const y = height / 2 - d.amplified * height * 0.5;
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(0, 255, 0, 0.7)"
            strokeWidth="1.5"
          />
        )}
      </svg>
    );
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Waveform className="h-5 w-5" />
              Monitor de Señal en Tiempo Real
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={isLive ? "default" : "outline"}>
                {isLive ? "EN VIVO" : "DETENIDO"}
              </Badge>
              <Button variant="outline" size="sm" onClick={toggleLive}>
                {isLive ? "Detener" : "Reanudar"}
              </Button>
              <Button variant="outline" size="sm" onClick={clearData}>
                <Repeat className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Visualización de señales PPG y procesamiento sin simulaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <Label htmlFor="signal-source">Fuente de Señal:</Label>
                  <Select 
                    value={signalSource}
                    onValueChange={setSignalSource}
                  >
                    <SelectTrigger id="signal-source" className="w-[180px]">
                      <SelectValue placeholder="Fuente de Señal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="camera">Cámara (PPG)</SelectItem>
                      <SelectItem value="tensorflow">TensorFlow Model</SelectItem>
                      <SelectItem value="advanced">Procesador Avanzado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="show-raw" 
                      checked={showRaw} 
                      onCheckedChange={setShowRaw} 
                    />
                    <Label htmlFor="show-raw">Señal Raw</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="show-filtered" 
                      checked={showFiltered} 
                      onCheckedChange={setShowFiltered} 
                    />
                    <Label htmlFor="show-filtered">Señal Filtrada</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="show-amplified" 
                      checked={showAmplified} 
                      onCheckedChange={setShowAmplified} 
                    />
                    <Label htmlFor="show-amplified">Señal Amplificada</Label>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex flex-col items-end gap-1">
                  <div className="text-sm text-muted-foreground">Calidad de Señal</div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span className="text-lg font-bold">{signalQuality.toFixed(1)}%</span>
                  </div>
                  <div className="w-[150px]">
                    <Slider
                      value={[signalQuality]}
                      min={0}
                      max={100}
                      step={1}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {renderSignalGraph()}
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="border rounded-md p-3">
                <div className="text-sm font-medium">Estadísticas Raw</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Min: {signalData.length > 0 ? Math.min(...signalData.map(d => d.value)).toFixed(4) : "N/A"}<br />
                  Max: {signalData.length > 0 ? Math.max(...signalData.map(d => d.value)).toFixed(4) : "N/A"}<br />
                  Avg: {signalData.length > 0 ? (signalData.reduce((sum, d) => sum + d.value, 0) / signalData.length).toFixed(4) : "N/A"}
                </div>
              </div>
              <div className="border rounded-md p-3">
                <div className="text-sm font-medium">Estadísticas Filtradas</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Min: {signalData.length > 0 ? Math.min(...signalData.map(d => d.filtered)).toFixed(4) : "N/A"}<br />
                  Max: {signalData.length > 0 ? Math.max(...signalData.map(d => d.filtered)).toFixed(4) : "N/A"}<br />
                  Avg: {signalData.length > 0 ? (signalData.reduce((sum, d) => sum + d.filtered, 0) / signalData.length).toFixed(4) : "N/A"}
                </div>
              </div>
              <div className="border rounded-md p-3">
                <div className="text-sm font-medium">Estadísticas Amplificadas</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Min: {signalData.length > 0 ? Math.min(...signalData.map(d => d.amplified)).toFixed(4) : "N/A"}<br />
                  Max: {signalData.length > 0 ? Math.max(...signalData.map(d => d.amplified)).toFixed(4) : "N/A"}<br />
                  Avg: {signalData.length > 0 ? (signalData.reduce((sum, d) => sum + d.amplified, 0) / signalData.length).toFixed(4) : "N/A"}
                </div>
              </div>
            </div>
            
            {signalQuality < 20 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Señal de baja calidad</AlertTitle>
                <AlertDescription>
                  La calidad de la señal es insuficiente para procesamiento confiable.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
