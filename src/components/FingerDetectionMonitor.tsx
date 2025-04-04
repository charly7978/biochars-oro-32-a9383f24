
import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { unifiedFingerDetector, DetectionState } from '@/modules/signal-processing/finger-detection/unified-finger-detector';
import { CircularBuffer } from '@/modules/signal-processing/utils/circular-buffer';
import { useToast } from '@/hooks/use-toast';

// Historia de detección
const detectionHistory = new CircularBuffer<DetectionState>(100);

interface DetectionStats {
  falsePositives: number;
  falseNegatives: number;
  detectionEvents: number;
  lossEvents: number;
  lastCalibrationTime: number;
  averageDetectionConfidence: number;
  isRecording: boolean;
  currentSessionId: string;
  totalEvents: number;
}

/**
 * Componente para monitorear y ajustar la detección de dedos
 */
const FingerDetectionMonitor: React.FC = () => {
  const { toast } = useToast();
  const [detectionState, setDetectionState] = useState<DetectionState | null>(null);
  const [stats, setStats] = useState<DetectionStats>({
    falsePositives: 0,
    falseNegatives: 0,
    detectionEvents: 0,
    lossEvents: 0,
    lastCalibrationTime: 0,
    averageDetectionConfidence: 0,
    isRecording: false,
    currentSessionId: '',
    totalEvents: 0
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDetectedRef = useRef<boolean | null>(null);
  
  // Iniciar monitoreo al montar
  useEffect(() => {
    startMonitoring();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  // Inicia el monitoreo
  const startMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      try {
        const state = unifiedFingerDetector.getDetectionState();
        setDetectionState(state);
        
        // Actualizar historial
        detectionHistory.push(state);
        
        // Actualizar estadísticas si hay cambio de estado
        if (lastDetectedRef.current !== null && lastDetectedRef.current !== state.isFingerDetected) {
          updateDetectionStats(lastDetectedRef.current, state.isFingerDetected);
        }
        
        lastDetectedRef.current = state.isFingerDetected;
      } catch (error) {
        console.error('Error en monitoreo de detección:', error);
      }
    }, 100);
  };
  
  // Actualiza estadísticas de detección
  const updateDetectionStats = (wasDetected: boolean, isDetected: boolean) => {
    setStats(prev => {
      const newStats = { ...prev };
      
      if (!wasDetected && isDetected) {
        // Nuevo evento de detección
        newStats.detectionEvents++;
        newStats.totalEvents++;
      } else if (wasDetected && !isDetected) {
        // Nuevo evento de pérdida
        newStats.lossEvents++;
        newStats.totalEvents++;
      }
      
      // Actualizar confianza promedio si hay detección
      if (detectionState && isDetected) {
        const newAvg = (prev.averageDetectionConfidence * (newStats.detectionEvents - 1) + 
                      detectionState.confidence) / newStats.detectionEvents;
        newStats.averageDetectionConfidence = newAvg;
      }
      
      return newStats;
    });
  };
  
  // Guarda datos de calibración
  const saveCalibrationData = () => {
    try {
      if (!detectionState) return;
      
      const data = JSON.stringify({
        timestamp: Date.now(),
        state: detectionState,
        performance: {
          detectionRate: stats.detectionEvents / Math.max(1, stats.detectionEvents + stats.lossEvents),
          averageConfidence: stats.averageDetectionConfidence
        }
      } as unknown as BlobPart);
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Crear enlace y descargar
      const a = document.createElement('a');
      a.href = url;
      a.download = `finger-detection-calibration-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: "Calibración guardada",
        description: "Los datos de calibración se han descargado correctamente"
      });
      
      // Actualizar estadísticas
      setStats(prev => ({
        ...prev,
        lastCalibrationTime: Date.now()
      }));
    } catch (error) {
      console.error('Error guardando calibración:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la calibración",
        variant: "destructive"
      });
    }
  };
  
  // Inicia grabación de sesión
  const startRecording = () => {
    // Genera ID de sesión
    const sessionId = `session-${Date.now()}`;
    
    setStats(prev => ({
      ...prev,
      isRecording: true,
      currentSessionId: sessionId
    }));
    
    toast({
      title: "Grabación iniciada",
      description: `Sesión ${sessionId} iniciada`
    });
  };
  
  // Detiene grabación
  const stopRecording = () => {
    setStats(prev => ({
      ...prev,
      isRecording: false
    }));
    
    toast({
      title: "Grabación detenida",
      description: "La sesión de grabación ha finalizado"
    });
  };
  
  // Ajusta la sensibilidad
  const handleSensitivityChange = (value: number[]) => {
    if (!value.length) return;
    unifiedFingerDetector.setSensitivity(value[0]);
  };
  
  // Ajusta la tasa de adaptación
  const handleAdaptationRateChange = (value: number[]) => {
    if (!value.length) return;
    unifiedFingerDetector.setAdaptationRate(value[0]);
  };
  
  // Renderizado
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Detección de Dedos</span>
          {detectionState && (
            <Badge variant={detectionState.isFingerDetected ? "outline" : "destructive"}>
              {detectionState.isFingerDetected ? "Dedo Detectado" : "No Detectado"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="status">Estado</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
            <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted p-2 rounded-md">
                  <div className="text-sm font-medium">Confianza</div>
                  <div className="text-2xl font-bold">
                    {detectionState ? (detectionState.confidence * 100).toFixed(1) + "%" : "--"}
                  </div>
                </div>
                <div className="bg-muted p-2 rounded-md">
                  <div className="text-sm font-medium">Umbral</div>
                  <div className="text-2xl font-bold">
                    {detectionState ? 
                      (detectionState.thresholds.sensitivityLevel * 
                       detectionState.thresholds.qualityFactor * 
                       detectionState.thresholds.environmentFactor * 100).toFixed(1) + "%" : 
                      "--"}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Fuentes</h4>
                {detectionState && Object.entries(detectionState.sources).map(([source, data]) => (
                  <div key={source} className="flex justify-between items-center">
                    <span className="text-sm">{source}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs">
                        {(data.confidence * 100).toFixed(0)}%
                      </span>
                      <Badge variant={data.detected ? "outline" : "secondary"} className="ml-2">
                        {data.detected ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="config">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Sensibilidad</Label>
                  <span className="text-sm">
                    {detectionState ? (detectionState.thresholds.sensitivityLevel * 100).toFixed(0) + "%" : "--"}
                  </span>
                </div>
                <Slider 
                  value={[detectionState?.thresholds.sensitivityLevel || 0.6]} 
                  min={0.1} 
                  max={0.9} 
                  step={0.05}
                  onValueChange={handleSensitivityChange}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Tasa de adaptación</Label>
                  <span className="text-sm">
                    {detectionState ? (detectionState.thresholds.adaptationRate * 100).toFixed(0) + "%" : "--"}
                  </span>
                </div>
                <Slider 
                  value={[detectionState?.thresholds.adaptationRate || 0.2]} 
                  min={0.05} 
                  max={0.5} 
                  step={0.05}
                  onValueChange={handleAdaptationRateChange}
                />
              </div>
              
              <div className="space-y-4 pt-4">
                <h4 className="font-medium">Parámetros avanzados</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Umbral de amplitud</Label>
                    <span className="text-sm">
                      {detectionState?.thresholds.amplitudeThreshold ? 
                        (detectionState.thresholds.amplitudeThreshold * 100).toFixed(0) + "%" : "--"}
                    </span>
                  </div>
                  <Slider 
                    value={[detectionState?.thresholds.amplitudeThreshold || 0.4]} 
                    min={0.1} 
                    max={0.8} 
                    step={0.05}
                    onValueChange={(value) => detectionState && unifiedFingerDetector.setAmplitudeThreshold(value[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Reducción falsos positivos</Label>
                    <span className="text-sm">
                      {detectionState?.thresholds.falsePositiveReduction ? 
                        (detectionState.thresholds.falsePositiveReduction * 100).toFixed(0) + "%" : "--"}
                    </span>
                  </div>
                  <Slider 
                    value={[detectionState?.thresholds.falsePositiveReduction || 0.3]} 
                    min={0.1} 
                    max={0.5} 
                    step={0.05}
                    onValueChange={(value) => detectionState && unifiedFingerDetector.setFalsePositiveReduction(value[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Reducción falsos negativos</Label>
                    <span className="text-sm">
                      {detectionState?.thresholds.falseNegativeReduction ? 
                        (detectionState.thresholds.falseNegativeReduction * 100).toFixed(0) + "%" : "--"}
                    </span>
                  </div>
                  <Slider 
                    value={[detectionState?.thresholds.falseNegativeReduction || 0.3]} 
                    min={0.1} 
                    max={0.5} 
                    step={0.05}
                    onValueChange={(value) => detectionState && unifiedFingerDetector.setFalseNegativeReduction(value[0])}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="stats">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted p-2 rounded-md">
                  <div className="text-sm font-medium">Eventos de detección</div>
                  <div className="text-2xl font-bold">{stats.detectionEvents}</div>
                </div>
                <div className="bg-muted p-2 rounded-md">
                  <div className="text-sm font-medium">Eventos de pérdida</div>
                  <div className="text-2xl font-bold">{stats.lossEvents}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted p-2 rounded-md">
                  <div className="text-sm font-medium">Confianza promedio</div>
                  <div className="text-2xl font-bold">
                    {stats.averageDetectionConfidence ? 
                      (stats.averageDetectionConfidence * 100).toFixed(1) + "%" : 
                      "0%"}
                  </div>
                </div>
                <div className="bg-muted p-2 rounded-md">
                  <div className="text-sm font-medium">Hora última calibración</div>
                  <div className="text-sm">
                    {stats.lastCalibrationTime ? 
                      new Date(stats.lastCalibrationTime).toLocaleTimeString() : 
                      "Nunca"}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="recording">Grabación</Label>
                  <Switch 
                    id="recording"
                    checked={stats.isRecording}
                    onCheckedChange={(checked) => checked ? startRecording() : stopRecording()}
                  />
                </div>
                {stats.isRecording && (
                  <div className="text-sm text-muted-foreground">
                    Grabando sesión: {stats.currentSessionId}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  Total eventos: {stats.totalEvents}
                </div>
              </div>
              
              <div className="space-y-2 pt-4">
                <Button variant="outline" className="w-full" onClick={saveCalibrationData}>
                  Guardar datos de calibración
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FingerDetectionMonitor;
