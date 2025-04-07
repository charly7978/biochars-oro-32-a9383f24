
import React, { useEffect, useRef, useState } from 'react';
import { testAudioSystem, playBeep } from '@/services/AudioManager';
import ArrhythmiaIndicator from './ArrhythmiaIndicator';

export interface PPGSignalMeterProps {
  value: number;
  quality: number;
  isFingerDetected: boolean;
  onStartMeasurement: () => void;
  onReset: () => void;
  arrhythmiaStatus: string;
  isArrhythmia: boolean;
}

const PPGSignalMeter: React.FC<PPGSignalMeterProps> = ({
  value,
  quality,
  isFingerDetected,
  onStartMeasurement,
  onReset,
  arrhythmiaStatus,
  isArrhythmia
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataPointsRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number>(0);
  const [scale, setScale] = useState(1);
  const [fingerDetectedTimeout, setFingerDetectedTimeout] = useState<number | null>(null);
  const [showFingerDetected, setShowFingerDetected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [arrhythmiaCount, setArrhythmiaCount] = useState(0);
  const [arrhythmiaInfo, setArrhythmiaInfo] = useState<{
    active: boolean;
    lastTime: number;
    count: number;
  }>({
    active: false,
    lastTime: 0,
    count: 0
  });
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastBeepTime = useRef<number>(0);
  const lastArrhythmiaTime = useRef<number>(0);
  
  // Parse arrhythmia status to get count
  useEffect(() => {
    if (arrhythmiaStatus && arrhythmiaStatus !== '--') {
      const parts = arrhythmiaStatus.split('|');
      if (parts.length > 1) {
        const count = parseInt(parts[1], 10);
        if (!isNaN(count)) {
          setArrhythmiaCount(count);
          // Update arrhythmia info
          setArrhythmiaInfo(prev => ({
            ...prev,
            count: count
          }));
        }
      }
    }
  }, [arrhythmiaStatus]);
  
  // Handle arrhythmia detection
  useEffect(() => {
    if (isArrhythmia) {
      const now = Date.now();
      
      // Play special arrhythmia beep
      if (now - lastArrhythmiaTime.current > 2000) {
        playBeep('arrhythmia');
        lastArrhythmiaTime.current = now;
      }
      
      // Update arrhythmia info
      setArrhythmiaInfo({
        active: true,
        lastTime: now,
        count: arrhythmiaCount
      });
      
      // Reset active state after delay
      setTimeout(() => {
        setArrhythmiaInfo(prev => ({
          ...prev,
          active: false
        }));
      }, 3000);
    }
  }, [isArrhythmia, arrhythmiaCount]);

  // Initialize audio on component mount
  useEffect(() => {
    if (!isInitialized) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log("PPGSignalMeter: Inicializando Audio Context");
        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing audio context:", error);
      }
    }
  }, [isInitialized]);

  // Update datapoints with new values
  useEffect(() => {
    if (isFingerDetected) {
      dataPointsRef.current.push(value);
      if (dataPointsRef.current.length > 100) {
        dataPointsRef.current.shift();
      }
      
      // Adjust scale based on signal amplitude
      const maxValue = Math.max(...dataPointsRef.current.map(val => Math.abs(val)));
      const targetScale = maxValue > 0 ? Math.min(5, 1 / maxValue) : 1;
      setScale(prev => prev * 0.95 + targetScale * 0.05);
      
      // Show finger detected message
      if (!showFingerDetected) {
        setShowFingerDetected(true);
        if (fingerDetectedTimeout) {
          clearTimeout(fingerDetectedTimeout);
        }
        setFingerDetectedTimeout(window.setTimeout(() => {
          setShowFingerDetected(false);
        }, 2000));
      }
      
      // Play heartbeat sound on peaks
      const now = Date.now();
      if (value > 0.1 && now - lastBeepTime.current > 600) {
        // Adjust volume based on quality
        const beepVolume = Math.min(0.01 + quality / 1000, 0.05);
        console.log("PPGSignalMeter: Reproduciendo beep para círculo dibujado, volumen:", beepVolume);
        playBeepWithVolume(440, beepVolume, 50);
        lastBeepTime.current = now;
      }
    } else {
      if (dataPointsRef.current.length > 0) {
        dataPointsRef.current = [];
      }
    }
  }, [value, isFingerDetected, fingerDetectedTimeout, showFingerDetected, quality]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, width, height);
      
      // Draw grid
      ctx.strokeStyle = 'rgba(50, 50, 50, 0.5)';
      ctx.lineWidth = 1;
      
      // Vertical grid lines
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Horizontal grid lines
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Center line
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      
      // Draw signal
      if (dataPointsRef.current.length > 1) {
        const step = Math.max(1, Math.floor(dataPointsRef.current.length / width));
        
        // Create gradient for waveform
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, isArrhythmiaInfo.active ? '#ff3333' : '#00ff00');
        gradient.addColorStop(0.5, isArrhythmiaInfo.active ? '#ff9999' : '#88ff88');
        gradient.addColorStop(1, isArrhythmiaInfo.active ? '#ff3333' : '#00ff00');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < dataPointsRef.current.length; i++) {
          const x = (i * width) / dataPointsRef.current.length;
          const y = height / 2 - dataPointsRef.current[i] * scale * (height / 2.5);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
        
        // Draw heartbeat circle at the latest point
        if (dataPointsRef.current.length > 0) {
          const latestValue = dataPointsRef.current[dataPointsRef.current.length - 1];
          const x = width - 5;
          const y = height / 2 - latestValue * scale * (height / 2.5);
          
          // Pulsing circle
          const pulseSize = Math.abs(latestValue) * 10 + 5;
          ctx.fillStyle = isArrhythmiaInfo.active ? 'rgba(255, 50, 50, 0.8)' : 'rgba(0, 255, 0, 0.8)';
          ctx.beginPath();
          ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Inner circle
          ctx.fillStyle = isArrhythmiaInfo.active ? '#ff0000' : '#00cc00';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Draw finger detection status
      if (!isFingerDetected) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('Coloque su dedo en la cámara', width / 2, height / 2);
      } else if (showFingerDetected) {
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('Dedo detectado', width / 2, 25);
      }
      
      // Show quality indicator
      const qualityText = `Calidad: ${quality.toFixed(0)}%`;
      ctx.font = '12px Arial';
      ctx.fillStyle = quality > 70 ? '#00ff00' : quality > 40 ? '#ffff00' : '#ff3333';
      ctx.textAlign = 'right';
      ctx.fillText(qualityText, width - 10, 20);
      
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    
    animationFrameRef.current = requestAnimationFrame(draw);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (fingerDetectedTimeout) {
        clearTimeout(fingerDetectedTimeout);
      }
    };
  }, [isFingerDetected, showFingerDetected, fingerDetectedTimeout, scale, quality, arrhythmiaInfo]);

  // Play a beep with adjustable volume
  const playBeepWithVolume = (frequency: number, volume: number, duration: number) => {
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      
      gainNode.gain.value = volume;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + duration / 1000);
    } catch (error) {
      console.error("Error playing beep:", error);
    }
  };

  // Test audio system by playing different types of beeps
  const testAudio = () => {
    testAudioSystem();
  };

  // Helper to check if arrhythmia is active
  const isArrhythmiaInfo = {
    active: arrhythmiaInfo.active || (isArrhythmia && Date.now() - arrhythmiaInfo.lastTime < 3000),
    count: arrhythmiaInfo.count
  };

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="absolute top-5 left-5 z-20">
        <ArrhythmiaIndicator 
          isActive={isArrhythmiaInfo.active}
          count={isArrhythmiaInfo.count}
        />
      </div>
      
      <div className="absolute top-5 right-5 z-20">
        <button 
          className="bg-gray-800/50 text-white px-3 py-1 rounded-md text-xs"
          onClick={testAudio}
        >
          Test Audio
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        width={600}
        height={300}
      />
    </div>
  );
};

export default PPGSignalMeter;
