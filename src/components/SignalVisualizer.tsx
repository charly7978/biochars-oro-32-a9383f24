
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SignalVisualizerProps {
  signalData: number[];
  peaks?: number[];
  height?: number;
  autoScale?: boolean;
  title?: string;
  color?: string;
  peakColor?: string;
  isFingerDetected?: boolean;
}

export function SignalVisualizer({
  signalData,
  peaks = [],
  height = 100,
  autoScale = true,
  title = 'Señal PPG',
  color = '#4ade80',
  peakColor = '#ef4444',
  isFingerDetected = false
}: SignalVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });
  
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          const { width } = parent.getBoundingClientRect();
          setDimensions({ width, height });
          
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [height]);
  
  useEffect(() => {
    if (!canvasRef.current || signalData.length === 0) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = dimensions;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);
    
    // Determinar escala
    let min = 0, max = 0;
    
    if (autoScale && signalData.length > 0) {
      min = Math.min(...signalData);
      max = Math.max(...signalData);
      
      // Agregar un pequeño margen
      const range = max - min;
      min -= range * 0.1;
      max += range * 0.1;
    } else {
      // Escala fija pre-determinada para señales PPG
      min = -1;
      max = 1;
    }
    
    // Evitar división por cero
    if (min === max) {
      max = min + 1;
    }
    
    // Configurar estilo
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    
    // Dibujar línea de base (cero)
    const zeroY = height - ((0 - min) / (max - min)) * height;
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.strokeStyle = '#9ca3af80';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Dibujar la señal
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    const step = width / Math.min(100, signalData.length - 1);
    
    for (let i = 0; i < signalData.length; i++) {
      const x = i * step;
      // Invertir Y para que los valores positivos vayan hacia arriba
      const y = height - ((signalData[i] - min) / (max - min)) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    // Dibujar los picos
    if (peaks && peaks.length > 0) {
      const pIndexes = new Set(peaks);
      
      for (let i = 0; i < signalData.length; i++) {
        if (pIndexes.has(i)) {
          const x = i * step;
          const y = height - ((signalData[i] - min) / (max - min)) * height;
          
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = peakColor;
          ctx.fill();
        }
      }
    }
    
  }, [signalData, peaks, dimensions, autoScale, color, peakColor]);
  
  return (
    <Card className="w-full">
      <CardHeader className="py-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{title}</span>
          {isFingerDetected !== undefined && (
            <span className={`inline-block w-2 h-2 rounded-full ${isFingerDetected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="w-full" style={{ height: `${height}px` }}>
          <canvas 
            ref={canvasRef} 
            width={dimensions.width} 
            height={dimensions.height}
            className="w-full h-full"
          ></canvas>
        </div>
      </CardContent>
    </Card>
  );
}
