
import React, { useEffect, useRef, useState } from 'react';
import { HeartPulse, AlertCircle } from 'lucide-react';
import ArrhythmiaVisualization from './ArrhythmiaVisualization';
import { ArrhythmiaWindow } from '../types/signal';

interface PPGSignalMeterProps {
  value: number;
  quality: number;
  isFingerDetected: boolean;
  onStartMeasurement: () => void;
  onReset: () => void;
  arrhythmiaStatus: string;
  rawArrhythmiaData?: any;
  preserveResults?: boolean;
  isArrhythmia?: boolean;
}

const PPGSignalMeter: React.FC<PPGSignalMeterProps> = ({
  value,
  quality,
  isFingerDetected,
  onStartMeasurement,
  onReset,
  arrhythmiaStatus,
  rawArrhythmiaData,
  preserveResults = false,
  isArrhythmia = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signalHistory, setSignalHistory] = useState<number[]>([]);
  const [peakPositions, setPeakPositions] = useState<number[]>([]);
  const [arrhythmiaCount, setArrhythmiaCount] = useState<number>(0);
  const [arrhythmiaWindows, setArrhythmiaWindows] = useState<ArrhythmiaWindow[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const lastPeakTimeRef = useRef<number>(0);
  
  // Extract arrhythmia count from status string
  useEffect(() => {
    if (arrhythmiaStatus) {
      const parts = arrhythmiaStatus.split('|');
      if (parts.length > 1 && !isNaN(parseInt(parts[1]))) {
        setArrhythmiaCount(parseInt(parts[1]));
      }
    }
  }, [arrhythmiaStatus]);
  
  // Initialize audio context for beeps
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      audioContextRef.current = new AudioContext();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0;
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    
    return () => {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Detect peaks and play beep
  useEffect(() => {
    if (!isFingerDetected || value <= 0.1) return;
    
    const now = Date.now();
    const MIN_PEAK_INTERVAL = 300; // ms
    
    // Simple peak detection
    if (value > 0.15 && now - lastPeakTimeRef.current > MIN_PEAK_INTERVAL) {
      // Update last peak time
      lastPeakTimeRef.current = now;
      
      // Add to peak positions
      setPeakPositions(prev => [...prev.slice(-20), signalHistory.length]);
      
      // Play beep
      playBeep();
    }
  }, [value, isFingerDetected, signalHistory.length]);
  
  // Update signal history
  useEffect(() => {
    setSignalHistory(prev => {
      const newHistory = [...prev, value];
      if (newHistory.length > 100) {
        return newHistory.slice(-100);
      }
      return newHistory;
    });
    
    // Add arrhythmia window if arrhythmia detected
    if (isArrhythmia && value > 0.1) {
      const now = Date.now();
      setArrhythmiaWindows(prev => {
        // Check if we already have a window for this time
        const recentWindow = prev.find(w => now - w.start < 500);
        if (!recentWindow) {
          return [...prev.slice(-4), { start: now - 300, end: now + 300 }];
        }
        return prev;
      });
    }
  }, [value, isArrhythmia]);
  
  // Play beep sound
  const playBeep = () => {
    try {
      if (!audioContextRef.current || !gainNodeRef.current) return;
      
      // Resume audio context if it's suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      // Create new oscillator for each beep
      const oscillator = audioContextRef.current.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = isArrhythmia ? 900 : 800;
      
      // Create separate gain node for this beep
      const beepGain = audioContextRef.current.createGain();
      beepGain.gain.value = 0;
      
      // Connect oscillator to gain
      oscillator.connect(beepGain);
      beepGain.connect(audioContextRef.current.destination);
      
      // Start oscillator
      oscillator.start();
      
      // Volume envelope
      const now = audioContextRef.current.currentTime;
      beepGain.gain.setValueAtTime(0, now);
      beepGain.gain.linearRampToValueAtTime(isArrhythmia ? 0.4 : 0.2, now + 0.02);
      beepGain.gain.linearRampToValueAtTime(0, now + 0.15);
      
      // Stop and disconnect
      setTimeout(() => {
        oscillator.stop();
        oscillator.disconnect();
        beepGain.disconnect();
      }, 200);
    } catch (err) {
      console.error('Error playing beep:', err);
    }
  };
  
  // Draw signal on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Skip drawing if no signal
    if (signalHistory.length < 2) return;
    
    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0, 15, 30, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 30, 60, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw arrhythmia zones
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
    
    // Draw signal
    ctx.strokeStyle = isArrhythmia ? '#ff5050' : '#2fd654';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const step = Math.max(1, Math.floor(signalHistory.length / canvas.width));
    
    for (let i = 0; i < signalHistory.length; i += step) {
      const x = (i / signalHistory.length) * canvas.width;
      // Invert and scale y value (canvas y increases downward)
      const y = canvas.height - (signalHistory[i] * canvas.height * 0.8);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    // Draw peaks
    ctx.fillStyle = '#ffffff';
    peakPositions.forEach(pos => {
      if (pos >= 0 && pos < signalHistory.length) {
        const x = (pos / signalHistory.length) * canvas.width;
        const y = canvas.height - (signalHistory[pos] * canvas.height * 0.8);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Draw quality indicator
    ctx.fillStyle = quality > 60 ? '#2fd654' : quality > 30 ? '#ffaa00' : '#ff5050';
    ctx.fillRect(10, 10, (canvas.width - 20) * (quality / 100), 5);
  }, [signalHistory, quality, peakPositions, isArrhythmia, arrhythmiaWindows]);
  
  return (
    <div className="w-full h-full flex flex-col">
      <div className="w-full h-full relative">
        <canvas 
          ref={canvasRef}
          width={300}
          height={150}
          className="w-full h-full bg-black rounded-lg"
        />
        
        {/* Quality indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md">
          <span className="text-xs font-semibold text-gray-300">Quality:</span>
          <span className={`text-xs font-bold ${
            quality > 60 ? 'text-green-500' : 
            quality > 30 ? 'text-yellow-500' : 
            'text-red-500'
          }`}>
            {quality.toFixed(0)}%
          </span>
        </div>
        
        {/* Arrhythmia indicators */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {isArrhythmia && (
            <div className="bg-red-900/50 px-2 py-1 rounded-md flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-bold text-red-400">ARRHYTHMIA</span>
            </div>
          )}
          
          <div className="bg-black/50 px-2 py-1 rounded-md flex items-center gap-1">
            <HeartPulse className="h-4 w-4 text-red-400" />
            <span className="text-xs font-bold text-white">{arrhythmiaCount}</span>
          </div>
        </div>
        
        {/* Finger detection status */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md">
          <div className={`w-3 h-3 rounded-full ${isFingerDetected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs font-bold text-white">
            {isFingerDetected ? 'Finger detected' : 'Place finger on camera'}
          </span>
        </div>
      </div>
      
      {/* Large visualization for arrhythmia detection */}
      <div className="mt-4 h-40">
        <ArrhythmiaVisualization 
          arrhythmiaDetected={isArrhythmia}
          arrhythmiaCount={arrhythmiaCount}
          arrhythmiaWindows={arrhythmiaWindows}
          signalValue={value}
          isPeak={value > 0.15 && Date.now() - lastPeakTimeRef.current < 100}
          width={300}
          height={150}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default PPGSignalMeter;
