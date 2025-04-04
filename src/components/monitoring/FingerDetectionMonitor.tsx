
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { Fingerprint, Settings, RefreshCw, Zap } from 'lucide-react';
import { logError, ErrorLevel } from '@/utils/debugUtils';

// Tipos simulados para monitoreo
interface DetectionState {
  detected: boolean;
  confidence: number;
  isFingerDetected: boolean;
  amplitude: {
    detected: boolean;
    confidence: number;
  };
  rhythm: {
    detected: boolean;
    confidence: number;
  };
  sources: Record<string, {
    detected: boolean;
    confidence: number;
    lastUpdate: number;
  }>;
  lastUpdate: number;
}

interface DiagnosticEvent {
  type: string;
  message: string;
  source: string;
  isFingerDetected: boolean;
  confidence: number;
  details?: Record<string, any>;
  timestamp: number;
}

interface EnvironmentalState {
  noise: number;
  lighting: number;
  motion: number;
}

interface CalibrationParams {
  baseThreshold: number;
  noiseMultiplier: number;
  lightingCompensation: number;
  motionCompensation: number;
  adaptationRate: number;
  stabilityFactor: number;
  environmentalState?: EnvironmentalState;
}

const FingerDetectionMonitor: React.FC = () => {
  // Estados
  const [sensitivity, setSensitivity] = useState(0.5);
  const [detectionState, setDetectionState] = useState<DetectionState>({
    detected: false,
    confidence: 0,
    isFingerDetected: false,
    amplitude: { detected: false, confidence: 0 },
    rhythm: { detected: false, confidence: 0 },
    sources: {},
    lastUpdate: Date.now()
  });
  const [diagnosticEvents, setDiagnosticEvents] = useState<DiagnosticEvent[]>([]);
  const [isRhythmDetected, setIsRhythmDetected] = useState(false);
  const [isAmplitudeDetected, setIsAmplitudeDetected] = useState(false);
  const [calibrationParams, setCalibrationParams] = useState<CalibrationParams>({
    baseThreshold: 0.5,
    noiseMultiplier: 1.0,
    lightingCompensation: 1.0,
    motionCompensation: 1.0,
    adaptationRate: 0.1,
    stabilityFactor: 1.0
  });
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [lightingLevel, setLightingLevel] = useState(50);
  const [motionLevel, setMotionLevel] = useState(0);

  // Simulación de monitoreo en tiempo real
  useEffect(() => {
    const intervalId = setInterval(() => {
      try {
        // Simulación de detección de dedos
        simulateDetectionUpdate();
        
        // Simulación de eventos de diagnóstico
        if (Math.random() > 0.7) {
          simulateDiagnosticEvent();
        }
      } catch (error) {
        console.error("Error en simulación de monitoreo:", error);
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [detectionState]);
  
  // Simular actualización de estado de detección
  const simulateDetectionUpdate = useCallback(() => {
    // Fluctuar confianza de detección basada en valores ambientales
    const baseConfidence = 0.5;
    const noiseFactor = Math.max(0, 1 - (noiseLevel / 100) * 0.8);
    const lightingFactor = Math.min(1, (lightingLevel / 100) * 1.5) * 0.8 + 0.2;
    const motionFactor = Math.max(0, 1 - (motionLevel / 100) * 0.9);
    
    const amplitudeConfidence = baseConfidence * noiseFactor * lightingFactor * (Math.random() * 0.3 + 0.85);
    const rhythmConfidence = baseConfidence * noiseFactor * motionFactor * (Math.random() * 0.3 + 0.85);
    
    // Usar simpleThrottle para estabilizar valores
    const simpleThrottle = (value: number, change: number) => {
      return value + (change * Math.min(0.3, calibrationParams.adaptationRate * 3));
    };
    
    setDetectionState(prev => {
      // Actualizar confianza de cada fuente
      const newSources = {
        ...prev.sources,
        'camera-quality': {
          detected: lightingFactor > 0.7,
          confidence: lightingFactor * 0.9,
          lastUpdate: Date.now()
        },
        'ppg-extractor': {
          detected: amplitudeConfidence > 0.65,
          confidence: amplitudeConfidence,
          lastUpdate: Date.now()
        },
        'signal-quality-amplitude': {
          detected: amplitudeConfidence > 0.6,
          confidence: simpleThrottle(
            prev.sources['signal-quality-amplitude']?.confidence || 0.5,
            amplitudeConfidence - (prev.sources['signal-quality-amplitude']?.confidence || 0.5)
          ),
          lastUpdate: Date.now()
        },
        'rhythm-detector': {
          detected: rhythmConfidence > 0.7,
          confidence: simpleThrottle(
            prev.sources['rhythm-detector']?.confidence || 0.5,
            rhythmConfidence - (prev.sources['rhythm-detector']?.confidence || 0.5)
          ),
          lastUpdate: Date.now()
        }
      };
      
      // Calcular detección unificada
      const amplitudeDetected = newSources['signal-quality-amplitude'].detected;
      const rhythmDetected = newSources['rhythm-detector'].detected;
      
      const newAmplitudeConfidence = newSources['signal-quality-amplitude'].confidence;
      const newRhythmConfidence = newSources['rhythm-detector'].confidence;
      
      // Calcular confianza general
      const overallConfidence = (newAmplitudeConfidence * 0.6) + (newRhythmConfidence * 0.4);
      
      // Determinar si se detecta dedo con umbral basado en sensibilidad
      const detectionThreshold = 0.6 - (sensitivity - 0.5);
      const isDetected = overallConfidence > detectionThreshold;
      
      setIsAmplitudeDetected(amplitudeDetected);
      setIsRhythmDetected(rhythmDetected);
      
      return {
        detected: isDetected,
        confidence: overallConfidence,
        isFingerDetected: isDetected,
        amplitude: {
          detected: amplitudeDetected,
          confidence: newAmplitudeConfidence
        },
        rhythm: {
          detected: rhythmDetected,
          confidence: newRhythmConfidence
        },
        sources: newSources,
        lastUpdate: Date.now()
      };
    });
    
    // Actualizar parámetros de calibración
    setCalibrationParams(prev => {
      // Ajustar parámetros en base a condiciones ambientales
      return {
        ...prev,
        baseThreshold: prev.baseThreshold + (Math.random() * 0.02 - 0.01),
        noiseMultiplier: Math.max(0.5, Math.min(1.5, prev.noiseMultiplier + (Math.random() * 0.04 - 0.02))),
        lightingCompensation: Math.max(0.5, Math.min(1.5, prev.lightingCompensation + (lightingLevel / 100 - 0.5) * 0.01)),
        motionCompensation: Math.max(0.5, Math.min(1.5, prev.motionCompensation + (motionLevel / 100 - 0.5) * 0.01)),
        adaptationRate: Math.max(0.05, Math.min(0.2, prev.adaptationRate + (Math.random() * 0.01 - 0.005))),
        stabilityFactor: Math.max(0.7, Math.min(1.3, prev.stabilityFactor + (Math.random() * 0.02 - 0.01)))
      };
    });
  }, [noiseLevel, lightingLevel, motionLevel, sensitivity, calibrationParams.adaptationRate]);

  // Simular evento de diagnóstico
  const simulateDiagnosticEvent = useCallback(() => {
    const eventTypes = [
      'finger_detected', 'finger_lost', 'detection_change', 
      'threshold_adaptation', 'calibration_update', 'environmental_change',
      'signal_quality', 'info'
    ];
    const sources = [
      'camera-quality', 'ppg-extractor', 'signal-quality-amplitude',
      'rhythm-detector', 'environment-lighting', 'calibration-system',
      'signal-processor'
    ];
    
    const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    const isDetected = randomType === 'finger_detected' || detectionState.detected;
    
    // Generar mensaje según tipo de evento
    let message = "";
    switch (randomType) {
      case 'finger_detected':
        message = `Dedo detectado por fuente '${randomSource}' con confianza ${detectionState.confidence.toFixed(2)}`;
        break;
      case 'finger_lost':
        message = `Dedo perdido por fuente '${randomSource}' con confianza ${detectionState.confidence.toFixed(2)}`;
        break;
      case 'detection_change':
        message = `Cambio de detección en '${randomSource}'`;
        break;
      case 'threshold_adaptation':
        message = `Adaptación de umbral en '${randomSource}'`;
        break;
      case 'calibration_update':
        message = `Actualización de calibración en '${randomSource}'`;
        break;
      case 'environmental_change':
        message = `Cambio ambiental detectado por '${randomSource}'`;
        break;
      case 'signal_quality':
        message = `Calidad de señal actualizada por '${randomSource}'`;
        break;
      default:
        message = `Información de '${randomSource}'`;
    }
    
    const newEvent: DiagnosticEvent = {
      type: randomType,
      message,
      source: randomSource,
      isFingerDetected: isDetected,
      confidence: detectionState.confidence,
      timestamp: Date.now()
    };
    
    setDiagnosticEvents(prev => {
      const newEvents = [...prev, newEvent];
      if (newEvents.length > 50) {
        return newEvents.slice(-50);
      }
      return newEvents;
    });
  }, [detectionState.detected, detectionState.confidence]);

  // Manejadores de eventos
  const handleApplySensitivity = () => {
    try {
      toast({
        title: "Sensibilidad Aplicada",
        description: `Sensibilidad establecida en ${sensitivity.toFixed(2)}`,
      });
      
      // Registrar cambio
      logError(
        `Sensibilidad del detector cambiada a ${sensitivity.toFixed(2)}`,
        ErrorLevel.INFO,
        "FingerDetection"
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo aplicar la configuración de sensibilidad",
        variant: "destructive"
      });
    }
  };
  
  const handleResetSensitivity = () => {
    try {
      setSensitivity(0.5);
      toast({
        title: "Sensibilidad Restablecida",
        description: "Sensibilidad devuelta al valor predeterminado",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo restablecer la sensibilidad",
        variant: "destructive"
      });
    }
  };
  
  const handleNoiseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newNoise = Number(event.target.value);
    setNoiseLevel(newNoise);
  };
  
  const handleLightingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLighting = Number(event.target.value);
    setLightingLevel(newLighting);
  };
  
  const handleMotionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMotion = Number(event.target.value);
    setMotionLevel(newMotion);
  };
  
  const handleResetCalibration = () => {
    try {
      setCalibrationParams({
        baseThreshold: 0.5,
        noiseMultiplier: 1.0,
        lightingCompensation: 1.0,
        motionCompensation: 1.0,
        adaptationRate: 0.1,
        stabilityFactor: 1.0
      });
      
      toast({
        title: "Calibración Restablecida",
        description: "Calibración adaptativa restablecida a valores predeterminados.",
      });
      
      logError(
        "Calibración del detector de dedos restablecida",
        ErrorLevel.INFO,
        "FingerCalibration"
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo restablecer la calibración",
        variant: "destructive"
      });
    }
  };
  
  const handleClearEvents = () => {
    try {
      setDiagnosticEvents([]);
      toast({
        title: "Eventos Limpiados",
        description: "Eventos de diagnóstico eliminados."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron limpiar los eventos",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            <span>Monitor de Detección de Dedos</span>
          </div>
          <Badge variant={detectionState?.detected ? 'default' : 'outline'}>
            {detectionState?.detected ? 'Detectado' : 'No Detectado'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Monitor y ajuste de parámetros de detección de dedos
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Fuentes de Detección</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <Badge variant={detectionState?.amplitude?.detected ? 'default' : 'outline'}>
                Amplitud
              </Badge>
              <span>Confianza: {detectionState?.amplitude?.confidence.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={detectionState?.rhythm?.detected ? 'default' : 'outline'}>
                Ritmo
              </Badge>
              <span>Confianza: {detectionState?.rhythm?.confidence.toFixed(2) || "0.00"}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Detección Unificada</h4>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center space-x-2">
              <span>Confianza: {detectionState?.confidence?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Detección por Ritmo: {isRhythmDetected ? 'Sí' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Detección por Amplitud: {isAmplitudeDetected ? 'Sí' : 'No'}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Ajuste de Sensibilidad</h4>
          <div className="flex items-center space-x-2">
            <Label htmlFor="sensitivity-slider">Sensibilidad:</Label>
            <Slider
              id="sensitivity-slider"
              value={[sensitivity * 100]}
              max={100}
              step={1}
              onValueChange={(value) => setSensitivity(value[0] / 100)}
              className="w-1/2"
            />
            <span>{sensitivity.toFixed(2)}</span>
            <Button variant="outline" size="sm" onClick={handleApplySensitivity}>
              Aplicar
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetSensitivity}>
              Restablecer
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Simulación Ambiental</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label htmlFor="noise-input">Nivel de Ruido:</Label>
              <Input
                id="noise-input"
                type="number"
                value={noiseLevel}
                onChange={handleNoiseChange}
                min={0}
                max={100}
              />
            </div>
            <div>
              <Label htmlFor="lighting-input">Nivel de Iluminación:</Label>
              <Input
                id="lighting-input"
                type="number"
                value={lightingLevel}
                onChange={handleLightingChange}
                min={0}
                max={100}
              />
            </div>
            <div>
              <Label htmlFor="motion-input">Nivel de Movimiento:</Label>
              <Input
                id="motion-input"
                type="number"
                value={motionLevel}
                onChange={handleMotionChange}
                min={0}
                max={100}
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetCalibration}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Restablecer Calibración
          </Button>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Parámetros de Calibración</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label>Umbral Base: {calibrationParams?.baseThreshold?.toFixed(3) || "0.000"}</Label>
            </div>
            <div>
              <Label>Multiplicador de Ruido: {calibrationParams?.noiseMultiplier?.toFixed(3) || "0.000"}</Label>
            </div>
            <div>
              <Label>Compensación de Iluminación: {calibrationParams?.lightingCompensation?.toFixed(3) || "0.000"}</Label>
            </div>
            <div>
              <Label>Compensación de Movimiento: {calibrationParams?.motionCompensation?.toFixed(3) || "0.000"}</Label>
            </div>
            <div>
              <Label>Tasa de Adaptación: {calibrationParams?.adaptationRate?.toFixed(3) || "0.000"}</Label>
            </div>
            <div>
              <Label>Factor de Estabilidad: {calibrationParams?.stabilityFactor?.toFixed(3) || "0.000"}</Label>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Eventos de Diagnóstico</h4>
            <Button variant="outline" size="sm" onClick={handleClearEvents}>
              Limpiar Eventos
            </Button>
          </div>
          <ScrollArea className="h-[200px] w-full">
            <div className="space-y-1">
              {(diagnosticEvents || []).slice().reverse().map((event, index) => (
                <div key={index} className="text-xs border-l-2 pl-2 py-1 border-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                  </div>
                  <p className="mt-1">{event.message}</p>
                </div>
              ))}
              
              {(diagnosticEvents || []).length === 0 && (
                <div className="flex justify-center items-center h-32 text-muted-foreground">
                  No hay eventos de diagnóstico para mostrar
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default FingerDetectionMonitor;
