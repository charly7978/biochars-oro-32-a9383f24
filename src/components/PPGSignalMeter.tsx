
import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Play, Square, RotateCcw } from 'lucide-react';

interface PPGSignalMeterProps {
  value: number;
  quality: number;
  isFingerDetected: boolean;
  onStartMeasurement?: () => void;
  onReset?: () => void;
  arrhythmiaStatus?: string;
  rawArrhythmiaData?: {
    timestamp: number;
    rmssd: number;
    rrVariation: number;
  } | null;
}

export default function PPGSignalMeter({
  value,
  quality,
  isFingerDetected,
  onStartMeasurement,
  onReset,
  arrhythmiaStatus = "--",
  rawArrhythmiaData
}: PPGSignalMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastBeatTime, setLastBeatTime] = useState<number>(0);
  const signalHistoryRef = useRef<number[]>([]);
  const animationRef = useRef<number>();
  
  // VIBRACIÓN POR LATIDO - API nativa
  const vibrateForBeat = (isArrhythmia: boolean = false) => {
    if ('vibrate' in navigator) {
      // Vibración diferenciada:
      // Normal: 50ms corto
      // Arritmia: 200ms largo + pausa + 100ms
      const pattern = isArrhythmia ? [200, 100, 100] : [50];
      navigator.vibrate(pattern);
    }
  };

  // AUDIO CENTRALIZADO AQUÍ
  const playHeartbeatSound = (isArrhythmia: boolean = false) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    const oscillator = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    
    // Sonido diferenciado para arritmias
    const frequency = isArrhythmia ? 660 : 880; // Tono más grave para arritmia
    const duration = isArrhythmia ? 150 : 80;
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
    
    gain.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration / 1000);
    
    oscillator.connect(gain);
    gain.connect(audioContextRef.current.destination);
    
    oscillator.start(0);
    oscillator.stop(audioContextRef.current.currentTime + duration / 1000);
  };

  // Detectar picos para activar sonido y vibración
  useEffect(() => {
    if (isFingerDetected && Math.abs(value) > 0.1) {
      const now = Date.now();
      
      // Detectar si es un pico (cambio significativo)
      const history = signalHistoryRef.current;
      if (history.length >= 2) {
        const prevValue = history[history.length - 1];
        const isPeak = value > prevValue && value > 0.15;
        
        // Solo activar si ha pasado tiempo suficiente (evitar múltiples activaciones)
        if (isPeak && now - lastBeatTime > 400) {
          const isArrhythmia = arrhythmiaStatus.includes('ARRHYTHMIA DETECTED');
          
          // ACTIVAR VIBRACIÓN Y SONIDO POR CADA LATIDO
          vibrateForBeat(isArrhythmia);
          playHeartbeatSound(isArrhythmia);
          
          setLastBeatTime(now);
        }
      }
      
      // Mantener historial de señal
      history.push(value);
      if (history.length > 10) {
        history.shift();
      }
    }
  }, [value, isFingerDetected, arrhythmiaStatus, lastBeatTime]);

  // Renderizado del canvas con visualización en tiempo real
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // Limpiar canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      // Obtener historial de señal
      const history = signalHistoryRef.current;
      if (history.length < 2) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      
      // Configurar línea de señal
      ctx.strokeStyle = isFingerDetected ? 
        (arrhythmiaStatus.includes('ARRHYTHMIA DETECTED') ? '#ef4444' : '#22d3ee') : 
        '#6b7280';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Dibujar forma de onda PPG
      const step = width / Math.max(history.length - 1, 1);
      for (let i = 0; i < history.length; i++) {
        const x = i * step;
        const y = height / 2 - (history[i] * height * 0.4);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Línea central de referencia
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      
      // Indicador de calidad de señal
      const qualityHeight = (quality / 100) * height * 0.1;
      ctx.fillStyle = quality > 70 ? '#10b981' : quality > 40 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(width - 20, height - qualityHeight, 10, qualityHeight);
      
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, quality, isFingerDetected, arrhythmiaStatus]);

  const handleStart = () => {
    setIsPlaying(true);
    signalHistoryRef.current = [];
    if (onStartMeasurement) {
      onStartMeasurement();
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (onReset) {
      onReset();
    }
  };

  // Determinar color y estado basado en detección de arritmias
  const getStatusInfo = () => {
    if (!isFingerDetected) {
      return { color: 'text-gray-400', status: 'Coloque el dedo en la cámara' };
    }
    
    if (arrhythmiaStatus.includes('ARRHYTHMIA DETECTED')) {
      return { 
        color: 'text-red-500', 
        status: '🚨 ARRITMIA DETECTADA 🚨',
        details: rawArrhythmiaData ? 
          `RMSSD: ${rawArrhythmiaData.rmssd.toFixed(1)}ms | Variación: ${(rawArrhythmiaData.rrVariation * 100).toFixed(1)}%` :
          'Ritmo cardíaco irregular detectado'
      };
    }
    
    return { color: 'text-cyan-400', status: 'Ritmo cardíaco normal' };
  };

  const statusInfo = getStatusInfo();

  return (
    <Card className="bg-black/80 border-gray-800 p-6">
      <div className="space-y-4">
        {/* Canvas para visualización de señal PPG */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={200}
            className="w-full h-32 border border-gray-700 rounded bg-black"
          />
          
          {/* Overlay de estado */}
          <div className="absolute top-2 left-2 text-xs text-gray-400">
            Calidad: {quality.toFixed(0)}% | {isFingerDetected ? 'Dedo detectado' : 'Sin dedo'}
          </div>
        </div>

        {/* Estado de arritmias con visualización prominente */}
        <div className="text-center">
          <div className={`text-lg font-bold ${statusInfo.color} flex items-center justify-center gap-2`}>
            <Heart className={`w-6 h-6 ${arrhythmiaStatus.includes('ARRHYTHMIA DETECTED') ? 'animate-pulse' : ''}`} />
            {statusInfo.status}
          </div>
          {statusInfo.details && (
            <div className="text-sm text-gray-300 mt-1">
              {statusInfo.details}
            </div>
          )}
        </div>

        {/* Información adicional de arritmias */}
        {arrhythmiaStatus.includes('ARRHYTHMIA DETECTED') && rawArrhythmiaData && (
          <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
            <div className="text-red-400 text-sm space-y-1">
              <div>⚠️ <strong>Arritmia confirmada</strong></div>
              <div>Tiempo: {new Date(rawArrhythmiaData.timestamp).toLocaleTimeString()}</div>
              <div>Variabilidad RR: {(rawArrhythmiaData.rrVariation * 100).toFixed(2)}%</div>
              <div>RMSSD: {rawArrhythmiaData.rmssd.toFixed(2)} ms</div>
              <div className="text-xs text-red-300 mt-2">
                🏥 Consulte con un profesional médico inmediatamente
              </div>
            </div>
          </div>
        )}

        {/* Controles */}
        <div className="flex gap-2 justify-center">
          <Button
            onClick={handleStart}
            disabled={isPlaying}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar
          </Button>
          
          <Button
            onClick={handleStop}
            disabled={!isPlaying}
            className="bg-red-600 hover:bg-red-700"
          >
            <Square className="w-4 h-4 mr-2" />
            Detener
          </Button>
          
          <Button
            onClick={() => {
              signalHistoryRef.current = [];
              if (onReset) onReset();
            }}
            variant="outline"
            className="border-gray-600"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Indicador de vibración */}
        <div className="text-center text-xs text-gray-500">
          📳 Vibración activada por cada latido | 🔊 Audio diferenciado para arritmias
        </div>
      </div>
    </Card>
  );
}
