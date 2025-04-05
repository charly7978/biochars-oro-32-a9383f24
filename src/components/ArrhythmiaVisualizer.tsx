
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle } from 'lucide-react';

interface ArrhythmiaVisualizerProps {
  arrhythmiaCount: number | string;
  arrhythmiaStatus: string;
  latestRRIntervals?: number[];
  heartRate?: number;
  quality?: number;
}

const ArrhythmiaVisualizer: React.FC<ArrhythmiaVisualizerProps> = ({
  arrhythmiaCount,
  arrhythmiaStatus,
  latestRRIntervals = [],
  heartRate = 0,
  quality = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showAlert, setShowAlert] = useState(false);
  
  // Draw the RR interval pattern
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Setup canvas 
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Draw grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    
    // Vertical grid lines
    for (let x = 0; x < rect.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = 0; y < rect.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
    
    // If no data, show placeholder text
    if (latestRRIntervals.length < 2) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Esperando datos de ritmo cardíaco...', rect.width / 2, rect.height / 2);
      return;
    }
    
    // Draw RR interval pattern
    const intervalValues = [...latestRRIntervals];
    const maxInterval = Math.max(...intervalValues);
    const minInterval = Math.min(...intervalValues);
    const range = maxInterval - minInterval || 1;
    
    const scale = (rect.height - 40) / range;
    const step = rect.width / (intervalValues.length - 1);
    
    // Determine if arrhythmia is detected
    const isArrhythmiaDetected = arrhythmiaStatus.includes('DETECTED');
    
    // Draw the line connecting points
    ctx.beginPath();
    ctx.strokeStyle = isArrhythmiaDetected ? '#ef4444' : '#10b981';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < intervalValues.length; i++) {
      const value = intervalValues[i];
      const x = i * step;
      const y = rect.height - ((value - minInterval) * scale) - 20;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // Draw points
      ctx.fillStyle = isArrhythmiaDetected ? '#ef4444' : '#10b981';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.stroke();
    
    // Draw heart rate line
    if (heartRate > 0) {
      const hrInterval = 60000 / heartRate;
      const hrY = rect.height - ((hrInterval - minInterval) * scale) - 20;
      
      if (hrY >= 0 && hrY <= rect.height) {
        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.setLineDash([5, 5]);
        ctx.moveTo(0, hrY);
        ctx.lineTo(rect.width, hrY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Label the line
        ctx.fillStyle = '#3b82f6';
        ctx.font = '12px Arial';
        ctx.fillText(`${heartRate} BPM`, 5, hrY - 5);
      }
    }
    
    // Show alert if arrhythmia detected
    setShowAlert(isArrhythmiaDetected);
    
  }, [latestRRIntervals, arrhythmiaStatus, heartRate]);
  
  // Format arrhythmia count for display
  const formattedCount = typeof arrhythmiaCount === 'number' ? arrhythmiaCount : parseInt(arrhythmiaCount as string) || 0;
  
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            Monitoreo de Arritmias
            {formattedCount > 0 && (
              <Badge variant="destructive" className="ml-2">{formattedCount}</Badge>
            )}
          </CardTitle>
          {showAlert && (
            <div className="flex items-center text-red-500 animate-pulse">
              <AlertTriangle className="h-5 w-5 mr-1" />
              <span className="text-sm font-semibold">Arritmia Detectada</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="rounded-md overflow-hidden border border-gray-200">
            <canvas 
              ref={canvasRef} 
              className="w-full"
              style={{ height: "150px" }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <div>Estado: 
              <span className={`ml-1 font-medium ${arrhythmiaStatus.includes('DETECTED') ? 'text-red-500' : 'text-green-500'}`}>
                {arrhythmiaStatus || 'Normal'}
              </span>
            </div>
            <div>Calidad: 
              <span className={`ml-1 font-medium ${quality < 50 ? 'text-orange-500' : 'text-green-500'}`}>
                {quality.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArrhythmiaVisualizer;
