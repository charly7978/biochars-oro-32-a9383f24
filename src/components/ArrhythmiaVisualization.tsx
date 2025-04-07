import React, { memo, useEffect, useRef } from 'react';
import { HeartPulse, AlertCircle } from 'lucide-react';
import { ArrhythmiaWindow } from '../types/signal';

interface ArrhythmiaVisualizationProps {
  arrhythmiaDetected: boolean;
  arrhythmiaCount: number;
  arrhythmiaWindows: ArrhythmiaWindow[];
  signalValue: number;
  isPeak: boolean;
  width: number;
  height: number;
  className?: string;
}

const ArrhythmiaVisualization: React.FC<ArrhythmiaVisualizationProps> = ({
  arrhythmiaDetected,
  arrhythmiaCount,
  arrhythmiaWindows,
  signalValue,
  isPeak,
  width,
  height,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeWindowRef = useRef<number[]>([]);
  const signalValuesRef = useRef<number[]>([]);
  const peakMarkersRef = useRef<number[]>([]);
  
  // Update visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Add current time and value to buffers
    const now = Date.now();
    timeWindowRef.current.push(now);
    signalValuesRef.current.push(signalValue);
    
    // Add peak marker if needed
    if (isPeak) {
      peakMarkersRef.current.push(now);
    }
    
    // Keep buffers limited to visible window (3 seconds)
    const windowStart = now - 3000;
    timeWindowRef.current = timeWindowRef.current.filter(t => t >= windowStart);
    signalValuesRef.current = signalValuesRef.current.slice(-timeWindowRef.current.length);
    peakMarkersRef.current = peakMarkersRef.current.filter(t => t >= windowStart);
    
    // Draw background
    ctx.fillStyle = arrhythmiaDetected ? 'rgba(240, 100, 100, 0.1)' : 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw arrhythmia windows
    arrhythmiaWindows.forEach(window => {
      if (window.end >= windowStart) {
        const startX = width - ((now - window.start) / 3000) * width;
        const endX = width - ((now - window.end) / 3000) * width;
        const windowWidth = endX - startX;
        
        ctx.fillStyle = 'rgba(255, 50, 50, 0.2)';
        ctx.fillRect(startX, 0, windowWidth, height);
        
        // Add arrhythmia marker label
        ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
        ctx.font = '10px Arial';
        ctx.fillText('!', (startX + endX) / 2, 12);
      }
    });
    
    // Draw signal
    if (timeWindowRef.current.length > 1) {
      ctx.strokeStyle = arrhythmiaDetected ? 'rgba(255, 100, 100, 0.8)' : '#2fd654';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i < timeWindowRef.current.length; i++) {
        const x = width - ((now - timeWindowRef.current[i]) / 3000) * width;
        // Normalize value to canvas height (invert because canvas y increases downward)
        const y = height - (signalValuesRef.current[i] * height * 0.8 + height * 0.1);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Draw peak markers
      ctx.fillStyle = '#fff';
      peakMarkersRef.current.forEach(time => {
        const x = width - ((now - time) / 3000) * width;
        const y = height / 2;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
  }, [width, height, signalValue, isPeak, arrhythmiaDetected, arrhythmiaWindows]);
  
  return (
    <div className={`relative ${className}`}>
      <canvas 
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-md"
      />
      
      {arrhythmiaDetected && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/30 px-2 py-1 rounded-md">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-xs font-bold text-red-500">Arrhythmia</span>
        </div>
      )}
      
      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md">
        <HeartPulse className="h-4 w-4 text-red-400" />
        <span className="text-xs font-bold text-white">{arrhythmiaCount}</span>
      </div>
    </div>
  );
};

export default memo(ArrhythmiaVisualization);
