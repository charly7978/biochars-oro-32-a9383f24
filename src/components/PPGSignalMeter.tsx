
import React, { useEffect, useRef, useState } from 'react';
import GraphGrid from './GraphGrid';
import CardiacMonitor from './CardiacMonitor';
import { HeartBeatResult } from '@/hooks/heart-beat/types';

interface PPGSignalMeterProps {
  value: number;
  quality: number;
  isFingerDetected: boolean;
  onStartMeasurement?: () => void;
  onReset?: () => void;
  arrhythmiaStatus?: string;
  rawArrhythmiaData?: {
    timestamp: number;
    rmssd?: number;
    rrVariation?: number;
  } | null;
  preserveResults?: boolean;
  isArrhythmia?: boolean;
  heartBeatResult?: HeartBeatResult;
  amplificationFactor?: number;
}

const PPGSignalMeter: React.FC<PPGSignalMeterProps> = ({
  value,
  quality,
  isFingerDetected,
  onStartMeasurement,
  onReset,
  arrhythmiaStatus = '--',
  rawArrhythmiaData = null,
  preserveResults = false,
  isArrhythmia = false,
  heartBeatResult,
  amplificationFactor = 2.5
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const averageValueRef = useRef<number>(0);
  const valuesBufferRef = useRef<number[]>([]);
  const signalHistoryRef = useRef<number[]>([]);
  const [signalHistory, setSignalHistory] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [lastResult, setLastResult] = useState<HeartBeatResult | undefined>(undefined);

  // Buffer para amplificar y visualizar mejor la señal
  useEffect(() => {
    if (value !== 0) {
      // Amplificar el valor para visualización
      const amplifiedValue = value * amplificationFactor;
      valuesBufferRef.current.push(amplifiedValue);
      
      // Limitar el tamaño del buffer
      if (valuesBufferRef.current.length > 20) {
        valuesBufferRef.current.shift();
      }

      // Calcular promedio para suavizar la visualización
      const sum = valuesBufferRef.current.reduce((a, b) => a + b, 0);
      averageValueRef.current = sum / valuesBufferRef.current.length;

      // Guardar en historial
      signalHistoryRef.current.push(amplifiedValue);
      if (signalHistoryRef.current.length > 100) {
        signalHistoryRef.current.shift();
      }
      
      // Actualizar estado para componentes reactivos
      setSignalHistory([...signalHistoryRef.current]);
    }
    
    // Actualizar último resultado para CardiacMonitor
    if (heartBeatResult) {
      setLastResult(heartBeatResult);
    }
  }, [value, amplificationFactor, heartBeatResult]);

  // Animación de onda cardíaca
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Optimizar canvas para HiDPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Usar valores en tiempo cero para animación continua
    const now = Date.now();
    const dt = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;

    // Función de animación
    const animate = () => {
      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Si no hay detección de dedo, mostrar mensaje
      if (!isFingerDetected && !preserveResults) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Coloque su dedo en la cámara', canvas.width / (2 * dpr), canvas.height / (2.2 * dpr));
        return;
      }

      // Dibujar onda cardíaca amplificada
      const centerY = canvas.height / (2 * dpr);
      const amplitude = Math.min(canvas.height / (2.5 * dpr), Math.abs(averageValueRef.current * 50));

      ctx.beginPath();
      ctx.moveTo(0, centerY);

      // Dibujar onda progresiva basada en historial de valores
      const points = signalHistoryRef.current.length;
      const width = canvas.width / dpr;
      
      for (let i = 0; i < points; i++) {
        const x = (i / (points - 1)) * width;
        const y = centerY - (signalHistoryRef.current[i] * 50);
        ctx.lineTo(x, y);
      }

      // Si hay pocos puntos, completar hasta el final
      if (points < 2) {
        ctx.lineTo(width, centerY);
      }

      // Aplicar estilo basado en calidad y arritmia
      const qualityFactor = quality / 100;
      const opacityBase = 0.3 + (qualityFactor * 0.6);
      const arrhythmiaDetected = isArrhythmia || arrhythmiaStatus.includes('ARRITMIA');
      
      // Color y estilo de la señal
      ctx.lineWidth = 2;
      
      if (arrhythmiaDetected) {
        ctx.strokeStyle = `rgba(255, 80, 80, ${opacityBase + 0.2})`;
        ctx.filter = 'drop-shadow(0 0 5px rgba(255, 0, 0, 0.7))';
      } else {
        ctx.strokeStyle = `rgba(80, 255, 130, ${opacityBase + 0.2})`;
        ctx.filter = 'drop-shadow(0 0 5px rgba(0, 255, 100, 0.5))';
      }
      
      ctx.stroke();
      ctx.filter = 'none';

      // Dibujar círculo en la posición actual si hay pico
      if (heartBeatResult?.isPeak) {
        const circleX = width - 10;
        const circleY = centerY - (value * 50 * amplificationFactor);
        
        ctx.beginPath();
        ctx.arc(circleX, circleY, 8, 0, Math.PI * 2);
        
        if (arrhythmiaDetected) {
          ctx.fillStyle = 'rgb(255, 50, 50)';
          ctx.filter = 'drop-shadow(0 0 10px rgba(255, 0, 0, 0.9))';
        } else {
          ctx.fillStyle = 'rgb(50, 255, 100)';
          ctx.filter = 'drop-shadow(0 0 10px rgba(0, 255, 100, 0.7))';
        }
        
        ctx.fill();
        ctx.filter = 'none';
      }

      // Agregar información de diagnóstico si está disponible
      if (heartBeatResult?.diagnosticData) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        
        const infoY = 20;
        ctx.fillText(`Calidad: ${quality.toFixed(0)}%`, 10, infoY);
        ctx.fillText(`Amplif: ${amplificationFactor.toFixed(1)}x`, 10, infoY + 20);
        
        if (heartBeatResult.isPeak) {
          ctx.fillStyle = arrhythmiaDetected ? 'rgba(255,100,100,0.8)' : 'rgba(100,255,150,0.8)';
          ctx.fillText('PICO DETECTADO', width - 150, infoY);
        }
      }
    };

    // Ejecutar animación
    animate();
  }, [value, isFingerDetected, quality, arrhythmiaStatus, preserveResults, isArrhythmia, heartBeatResult, amplificationFactor]);

  useEffect(() => {
    setIsActive(isFingerDetected);
  }, [isFingerDetected]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-0 opacity-30">
        <GraphGrid height={300} width={window.innerWidth} />
      </div>

      <div className="relative z-10 h-[200px] bg-black/10 backdrop-blur-sm rounded-lg overflow-hidden">
        <canvas 
          ref={canvasRef}
          className="w-full h-full"
          style={{ 
            width: '100%', 
            height: '100%'
          }}
        />
      </div>
      
      <div className="relative z-10 mt-4">
        <CardiacMonitor 
          lastSignalValue={value}
          quality={quality}
          signalHistory={signalHistory}
          isMonitoring={isFingerDetected}
          amplificationFactor={amplificationFactor}
          lastHeartBeatResult={lastResult}
          arrhythmiaStatus={arrhythmiaStatus}
        />
      </div>
    </div>
  );
};

export default PPGSignalMeter;
