
import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, HeartPulse, AlertTriangle } from 'lucide-react';
import { vibrate, playArrhythmiaAlert } from '@/utils/feedback-utilities';

interface ArrhythmiaVisualizerProps {
  audioContextRef?: React.RefObject<AudioContext | null>;
  enabled?: boolean;
  className?: string;
}

const ArrhythmiaVisualizer: React.FC<ArrhythmiaVisualizerProps> = ({ 
  audioContextRef,
  enabled = true,
  className = ''
}) => {
  const [visible, setVisible] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const [arrhythmiaCount, setArrhythmiaCount] = useState(0);
  const lastArrhythmiaTimeRef = useRef<number>(0);
  const animationTimerRef = useRef<number | null>(null);
  const MIN_DISPLAY_INTERVAL_MS = 10000; // At least 10s between alerts
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleArrhythmiaDetection = (event: CustomEvent) => {
      const now = Date.now();
      const { timestamp, confidence } = event.detail;
      
      // Prevent too frequent alerts
      if (now - lastArrhythmiaTimeRef.current < MIN_DISPLAY_INTERVAL_MS) {
        return;
      }
      
      lastArrhythmiaTimeRef.current = now;
      setArrhythmiaCount(prev => prev + 1);
      
      // Calculate intensity based on confidence
      const calculatedIntensity = confidence > 0.7 ? 1.0 : 
                                 confidence > 0.5 ? 0.8 : 0.6;
      setIntensity(calculatedIntensity);
      
      // Show alert
      setVisible(true);
      
      // Provide vibration feedback
      vibrate({ 
        pattern: [100, 50, 200, 50, 100], 
        strong: true 
      });
      
      // Provide audio feedback
      if (audioContextRef?.current) {
        playArrhythmiaAlert(audioContextRef.current, {
          frequency: 880,
          duration: 200,
          volume: 0.7,
          distinctive: true
        });
      }
      
      // Auto-hide after animation
      if (animationTimerRef.current) {
        window.clearTimeout(animationTimerRef.current);
      }
      
      animationTimerRef.current = window.setTimeout(() => {
        setVisible(false);
      }, 4000);
    };
    
    const handleArrhythmiaWindow = (event: CustomEvent) => {
      // Additional feedback for arrhythmia windows if needed
      const { start, end, intervals } = event.detail;
      
      // Maybe trigger subtle background indication
    };
    
    window.addEventListener('arrhythmia-detected', 
      handleArrhythmiaDetection as EventListener);
    
    window.addEventListener('arrhythmia-window-detected', 
      handleArrhythmiaWindow as EventListener);
    
    return () => {
      window.removeEventListener('arrhythmia-detected', 
        handleArrhythmiaDetection as EventListener);
      
      window.removeEventListener('arrhythmia-window-detected', 
        handleArrhythmiaWindow as EventListener);
      
      if (animationTimerRef.current) {
        window.clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [enabled, audioContextRef]);
  
  // Don't render anything when not visible
  if (!visible) return null;
  
  return (
    <div 
      className={`fixed top-16 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-xl z-50 flex items-center animate-pulse ${className}`}
      style={{ 
        opacity: intensity, 
        animationDuration: `${1 / intensity}s` 
      }}
    >
      <AlertCircle className="w-6 h-6 mr-2" />
      <div className="flex flex-col">
        <div className="font-bold text-lg flex items-center">
          ¡Arritmia Detectada!
          <HeartPulse className="ml-2 w-5 h-5" />
        </div>
        <div className="text-xs">
          Irregularidad en el ritmo cardíaco ({arrhythmiaCount})
        </div>
      </div>
    </div>
  );
};

export default ArrhythmiaVisualizer;
