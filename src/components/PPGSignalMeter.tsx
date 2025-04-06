
import React, { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import ArrhythmiaIndicator from './ArrhythmiaIndicator';

interface PPGSignalMeterProps {
  value: number;
  quality: number;
  isFingerDetected?: boolean;
  onStartMeasurement?: () => void;
  onReset?: () => void;
  arrhythmiaStatus?: string;
  rawArrhythmiaData?: any;
}

const PPGSignalMeter: React.FC<PPGSignalMeterProps> = ({
  value,
  quality,
  isFingerDetected = false,
  onStartMeasurement,
  onReset,
  arrhythmiaStatus,
  rawArrhythmiaData
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [values, setValues] = useState<number[]>([]);
  const [isMaxValue, setIsMaxValue] = useState(false);
  const [activeArrhythmia, setActiveArrhythmia] = useState(false);
  const [arrhythmiaSeverity, setArrhythmiaSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  
  const MAX_VALUES = 150;
  const ARRHYTHMIA_DISPLAY_TIME = 3000; // 3 seconds display time
  
  useEffect(() => {
    // Handle arrhythmia event listeners
    const handleArrhythmiaVisual = (event: CustomEvent) => {
      const { severity } = event.detail;
      
      console.log("Arrhythmia visual event received:", event.detail);
      
      // Show the arrhythmia indicator
      setArrhythmiaSeverity(severity || 'medium');
      setActiveArrhythmia(true);
      
      // Hide after delay
      setTimeout(() => {
        setActiveArrhythmia(false);
      }, ARRHYTHMIA_DISPLAY_TIME);
    };
    
    window.addEventListener('arrhythmia-visual', handleArrhythmiaVisual as EventListener);
    
    return () => {
      window.removeEventListener('arrhythmia-visual', handleArrhythmiaVisual as EventListener);
    };
  }, []);
  
  // Listen for cardiac peaks to animate heartbeat
  useEffect(() => {
    const handleCardiacPeak = (event: CustomEvent) => {
      const { isArrhythmia } = event.detail;
      
      // Flash heart animation
      setIsMaxValue(true);
      
      // If arrhythmia is detected in this peak, show indicator
      if (isArrhythmia) {
        setActiveArrhythmia(true);
        
        // Determine severity based on heart rate
        const heartRate = event.detail.heartRate || 0;
        if (heartRate > 100) {
          setArrhythmiaSeverity('high');
        } else if (heartRate < 50) {
          setArrhythmiaSeverity('low');
        } else {
          setArrhythmiaSeverity('medium');
        }
        
        // Hide indicator after delay
        setTimeout(() => {
          setActiveArrhythmia(false);
        }, ARRHYTHMIA_DISPLAY_TIME);
      }
      
      // Reset flash after animation time
      setTimeout(() => {
        setIsMaxValue(false);
      }, 150);
    };
    
    window.addEventListener('cardiac-peak-detected', handleCardiacPeak as EventListener);
    
    return () => {
      window.removeEventListener('cardiac-peak-detected', handleCardiacPeak as EventListener);
    };
  }, []);
  
  // Listen to arrhythmia status changes
  useEffect(() => {
    if (arrhythmiaStatus?.includes("ARRHYTHMIA DETECTED")) {
      // Show arrhythmia indicator when status changes
      setActiveArrhythmia(true);
      
      // Hide after delay
      setTimeout(() => {
        setActiveArrhythmia(false);
      }, ARRHYTHMIA_DISPLAY_TIME);
    }
  }, [arrhythmiaStatus]);
  
  // Update values and draw waveform
  useEffect(() => {
    // Add value to array
    setValues(prev => {
      const newValues = [...prev, value];
      if (newValues.length > MAX_VALUES) {
        return newValues.slice(-MAX_VALUES);
      }
      return newValues;
    });
    
    // Draw waveform
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        
        const currentValues = values.slice(-width);
        currentValues.forEach((val, i) => {
          const x = i;
          const y = centerY - val * height * 0.4;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        
        ctx.stroke();
        
        // Draw arrhythmia markers if there's raw data
        if (rawArrhythmiaData && activeArrhythmia) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // Red color for arrhythmia
          ctx.lineWidth = 5;
          
          // Mark the point where arrhythmia was detected
          const arrhythmiaX = currentValues.length - 5;
          if (arrhythmiaX > 0) {
            const y = centerY - currentValues[arrhythmiaX] * height * 0.4;
            ctx.arc(arrhythmiaX, y, 8, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
      }
    }
  }, [value, values, rawArrhythmiaData, activeArrhythmia]);
  
  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="absolute top-4 right-4">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isFingerDetected ? 'bg-green-500' : 'bg-red-500'} text-white`}>
          <Heart 
            className={`${isMaxValue ? 'scale-125' : 'scale-100'} transition-transform`}
            fill={isMaxValue ? 'white' : 'transparent'} 
          />
          <span className="font-medium">
            {isFingerDetected ? 'Dedo detectado' : 'Coloque el dedo'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 relative">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full" 
          width={MAX_VALUES} 
          height={200} 
        />
        
        {/* Arrhythmia visual indicator */}
        <ArrhythmiaIndicator 
          isActive={activeArrhythmia} 
          severity={arrhythmiaSeverity}
        />
        
        {/* Signal quality indicator */}
        <div className="absolute bottom-4 left-4 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-lg">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-300">Calidad:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    quality >= i * 20 ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Arrhythmia status indicator */}
        {arrhythmiaStatus && !arrhythmiaStatus.includes("--") && (
          <div className="absolute bottom-4 right-4 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-lg">
            <div className="flex items-center gap-2">
              <span className={`text-xs ${arrhythmiaStatus.includes("ARRHYTHMIA") ? 'text-red-400' : 'text-green-400'}`}>
                {arrhythmiaStatus.split("|")[0]}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {onStartMeasurement && onReset && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-4">
          <button 
            onClick={onStartMeasurement}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-full"
          >
            Iniciar
          </button>
          <button 
            onClick={onReset}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-full"
          >
            Reiniciar
          </button>
        </div>
      )}
    </div>
  );
};

export default PPGSignalMeter;
