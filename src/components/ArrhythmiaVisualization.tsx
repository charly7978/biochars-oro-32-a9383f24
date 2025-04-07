
import React, { useEffect, useRef } from 'react';
import { ArrhythmiaWindow } from '../types/signal';

interface ArrhythmiaVisualizationProps {
  arrhythmiaDetected: boolean;
  arrhythmiaCount: number;
  arrhythmiaWindows: ArrhythmiaWindow[];
  signalValue: number;
  isPeak: boolean;
  width?: number;
  height?: number;
  className?: string;
}

const ArrhythmiaVisualization: React.FC<ArrhythmiaVisualizationProps> = ({
  arrhythmiaDetected,
  arrhythmiaCount,
  arrhythmiaWindows = [],
  signalValue,
  isPeak,
  width = 300,
  height = 150,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);
  const peakPositionsRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    // Add signal value to history
    historyRef.current.push(signalValue);
    
    // Limit history size
    if (historyRef.current.length > 100) {
      historyRef.current.shift();
    }
    
    // Add peak position
    if (isPeak) {
      peakPositionsRef.current.push(historyRef.current.length - 1);
      
      // Limit peak positions list
      if (peakPositionsRef.current.length > 20) {
        peakPositionsRef.current.shift();
      }
    }
    
    // Draw visualization
    const drawVisualization = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background
      ctx.fillStyle = arrhythmiaDetected ? 'rgba(180, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
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
      
      // Draw arrhythmia windows
      arrhythmiaWindows.forEach(window => {
        const now = Date.now();
        
        // Only draw if recent enough to be visible
        if (now - window.start < 3000) {
          const startX = canvas.width - ((now - window.start) / 3000) * canvas.width;
          const endX = canvas.width - ((now - window.end) / 3000) * canvas.width;
          
          ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
          ctx.fillRect(startX, 0, endX - startX, canvas.height);
        }
      });
      
      // Draw signal
      if (historyRef.current.length > 1) {
        ctx.strokeStyle = arrhythmiaDetected ? '#ff5050' : '#2fd654';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < historyRef.current.length; i++) {
          const x = (i / historyRef.current.length) * canvas.width;
          const y = canvas.height - (historyRef.current[i] * canvas.height * 0.8);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
      }
      
      // Draw peaks
      ctx.fillStyle = '#ffffff';
      peakPositionsRef.current.forEach(pos => {
        if (pos >= 0 && pos < historyRef.current.length) {
          const x = (pos / historyRef.current.length) * canvas.width;
          const y = canvas.height - (historyRef.current[pos] * canvas.height * 0.8);
          
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      // Draw arrhythmia count
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Arrhythmias: ${arrhythmiaCount}`, 10, 10);
      
      // Draw arrhythmia status
      if (arrhythmiaDetected) {
        ctx.fillStyle = '#ff5050';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('ARRHYTHMIA DETECTED', canvas.width - 10, 10);
      }
    };
    
    // Animate visualization
    animationFrameRef.current = requestAnimationFrame(drawVisualization);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [signalValue, isPeak, arrhythmiaDetected, arrhythmiaCount, arrhythmiaWindows]);
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
};

export default ArrhythmiaVisualization;
