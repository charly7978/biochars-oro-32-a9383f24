
import React, { useEffect, useRef, useCallback, useState, memo } from 'react';
import { Fingerprint, AlertCircle } from 'lucide-react';
import { CircularBuffer, PPGDataPoint } from '../utils/CircularBuffer';
import AppTitle from './AppTitle';

interface PPGSignalMeterProps {
  value: number;
  quality: number;
  isFingerDetected: boolean;
  onStartMeasurement: () => void;
  onReset: () => void;
  arrhythmiaStatus?: string;
  rawArrhythmiaData?: {
    timestamp: number;
    rmssd?: number;
    rrVariation?: number;
  } | null;
  preserveResults?: boolean;
  isArrhythmia?: boolean;
}

interface PPGDataPointExtended extends PPGDataPoint {
  isArrhythmia?: boolean;
}

const PPGSignalMeter = memo(({ 
  value, 
  quality, 
  isFingerDetected,
  onStartMeasurement,
  onReset,
  arrhythmiaStatus,
  rawArrhythmiaData,
  preserveResults = false,
  isArrhythmia = false
}: PPGSignalMeterProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataBufferRef = useRef<CircularBuffer<PPGDataPointExtended> | null>(null);
  const baselineRef = useRef<number | null>(null);
  const lastValueRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number>();
  const lastRenderTimeRef = useRef<number>(0);
  const lastArrhythmiaTime = useRef<number>(0);
  const arrhythmiaCountRef = useRef<number>(0);
  const peaksRef = useRef<{time: number, value: number, isArrhythmia: boolean, beepPlayed?: boolean}[]>([]);
  const [showArrhythmiaAlert, setShowArrhythmiaAlert] = useState(false);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const qualityHistoryRef = useRef<number[]>([]);
  const consecutiveFingerFramesRef = useRef<number>(0);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const arrhythmiaSegmentsRef = useRef<Array<{startTime: number, endTime: number | null}>>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastBeepTimeRef = useRef<number>(0);
  const pendingBeepPeakIdRef = useRef<number | null>(null);

  const WINDOW_WIDTH_MS = 5500;
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 900;
  const GRID_SIZE_X = 5;
  const GRID_SIZE_Y = 5;
  const verticalScale = 35.0;
  const SMOOTHING_FACTOR = 1.5;
  const TARGET_FPS = 60;
  const FRAME_TIME = 1000 / TARGET_FPS;
  const BUFFER_SIZE = 600;
  const PEAK_DETECTION_WINDOW = 8;
  const PEAK_THRESHOLD = 3;
  const MIN_PEAK_DISTANCE_MS = 250;
  const IMMEDIATE_RENDERING = true;
  const MAX_PEAKS_TO_DISPLAY = 25;
  const QUALITY_HISTORY_SIZE = 9;
  const REQUIRED_FINGER_FRAMES = 3;
  const USE_OFFSCREEN_CANVAS = true;

  const BEEP_PRIMARY_FREQUENCY = 880;
  const BEEP_SECONDARY_FREQUENCY = 440;
  const BEEP_DURATION = 80;
  const BEEP_VOLUME = 0.9;
  const MIN_BEEP_INTERVAL_MS = 350;
  
  // Parse arrhythmia count from status string
  useEffect(() => {
    if (arrhythmiaStatus) {
      const parts = arrhythmiaStatus.split('|');
      if (parts.length === 2) {
        const count = parseInt(parts[1]);
        if (!isNaN(count)) {
          arrhythmiaCountRef.current = count;
        }
      }
    }
  }, [arrhythmiaStatus]);

  // Audio initialization for heartbeat sounds
  useEffect(() => {
    const initAudio = async () => {
      try {
        if (!audioContextRef.current && typeof AudioContext !== 'undefined') {
          console.log("PPGSignalMeter: Inicializando Audio Context");
          audioContextRef.current = new AudioContext({ latencyHint: 'interactive' });
          
          if (audioContextRef.current.state !== 'running') {
            await audioContextRef.current.resume();
          }
          
          await playBeep(0.01);
        }
      } catch (err) {
        console.error("PPGSignalMeter: Error inicializando audio context:", err);
      }
    };
    
    initAudio();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => {
          console.error("PPGSignalMeter: Error cerrando audio context:", err);
        });
        audioContextRef.current = null;
      }
    };
  }, []);

  // Play beep sound for heartbeat
  const playBeep = useCallback(async (volume = BEEP_VOLUME) => {
    try {
      const now = Date.now();
      if (now - lastBeepTimeRef.current < MIN_BEEP_INTERVAL_MS) {
        console.log("PPGSignalMeter: Beep bloqueado por intervalo mínimo");
        return false;
      }
      
      if (!audioContextRef.current || audioContextRef.current.state !== 'running') {
        if (audioContextRef.current) {
          await audioContextRef.current.resume();
        } else {
          audioContextRef.current = new AudioContext({ latencyHint: 'interactive' });
        }
        
        if (audioContextRef.current.state !== 'running') {
          console.warn("PPGSignalMeter: No se pudo activar el contexto de audio");
          return false;
        }
      }
      
      console.log("PPGSignalMeter: Reproduciendo beep para latido detectado");
      
      const primaryOscillator = audioContextRef.current.createOscillator();
      const primaryGain = audioContextRef.current.createGain();
      
      const secondaryOscillator = audioContextRef.current.createOscillator();
      const secondaryGain = audioContextRef.current.createGain();
      
      primaryOscillator.type = "sine";
      primaryOscillator.frequency.setValueAtTime(
        BEEP_PRIMARY_FREQUENCY,
        audioContextRef.current.currentTime
      );
      
      secondaryOscillator.type = "sine";
      secondaryOscillator.frequency.setValueAtTime(
        BEEP_SECONDARY_FREQUENCY,
        audioContextRef.current.currentTime
      );
      
      const adjustedVolume = Math.min(volume * 2.0, 1.0);
      
      primaryGain.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      primaryGain.gain.linearRampToValueAtTime(
        adjustedVolume,
        audioContextRef.current.currentTime + 0.0005
      );
      primaryGain.gain.exponentialRampToValueAtTime(
        0.01,
        audioContextRef.current.currentTime + BEEP_DURATION / 1000
      );
      
      secondaryGain.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      secondaryGain.gain.linearRampToValueAtTime(
        adjustedVolume * 0.8,
        audioContextRef.current.currentTime + 0.0005
      );
      secondaryGain.gain.exponentialRampToValueAtTime(
        0.01,
        audioContextRef.current.currentTime + BEEP_DURATION / 1000
      );
      
      primaryOscillator.connect(primaryGain);
      secondaryOscillator.connect(secondaryGain);
      primaryGain.connect(audioContextRef.current.destination);
      secondaryGain.connect(audioContextRef.current.destination);
      
      primaryOscillator.start(audioContextRef.current.currentTime);
      secondaryOscillator.start(audioContextRef.current.currentTime);
      primaryOscillator.stop(audioContextRef.current.currentTime + BEEP_DURATION / 1000 + 0.02);
      secondaryOscillator.stop(audioContextRef.current.currentTime + BEEP_DURATION / 1000 + 0.02);
      
      lastBeepTimeRef.current = now;
      pendingBeepPeakIdRef.current = null;
      
      return true;
    } catch (err) {
      console.error("PPGSignalMeter: Error reproduciendo beep:", err);
      return false;
    }
  }, []);

  // Data buffer initialization
  useEffect(() => {
    if (!dataBufferRef.current) {
      dataBufferRef.current = new CircularBuffer<PPGDataPointExtended>(BUFFER_SIZE);
    }
    if (preserveResults && !isFingerDetected) {
      if (dataBufferRef.current) {
        dataBufferRef.current.clear();
      }
      peaksRef.current = [];
      baselineRef.current = null;
      lastValueRef.current = null;
    }
  }, [preserveResults, isFingerDetected]);

  // Track signal quality
  useEffect(() => {
    qualityHistoryRef.current.push(quality);
    if (qualityHistoryRef.current.length > QUALITY_HISTORY_SIZE) {
      qualityHistoryRef.current.shift();
    }
    
    if (isFingerDetected) {
      consecutiveFingerFramesRef.current++;
    } else {
      consecutiveFingerFramesRef.current = 0;
    }
  }, [quality, isFingerDetected]);

  // Set up canvases
  useEffect(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = CANVAS_WIDTH;
    offscreen.height = CANVAS_HEIGHT;
    offscreenCanvasRef.current = offscreen;
    
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = CANVAS_WIDTH;
    gridCanvas.height = CANVAS_HEIGHT;
    const gridCtx = gridCanvas.getContext('2d', { alpha: false });
    
    if(gridCtx) {
      drawGrid(gridCtx);
      gridCanvasRef.current = gridCanvas;
    }
    
    // Start rendering
    animationFrameRef.current = requestAnimationFrame(renderSignal);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Calculate average signal quality
  const getAverageQuality = useCallback(() => {
    if (qualityHistoryRef.current.length === 0) return 0;
    
    let weightedSum = 0;
    let weightSum = 0;
    
    qualityHistoryRef.current.forEach((q, index) => {
      const weight = index + 1;
      weightedSum += q * weight;
      weightSum += weight;
    });
    
    return weightSum > 0 ? weightedSum / weightSum : 0;
  }, []);

  // Get color based on signal quality
  const getQualityColor = useCallback((q: number) => {
    const avgQuality = getAverageQuality();
    
    if (!(consecutiveFingerFramesRef.current >= REQUIRED_FINGER_FRAMES)) return 'from-gray-400 to-gray-500';
    if (avgQuality > 65) return 'from-green-500 to-emerald-500';
    if (avgQuality > 40) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  }, [getAverageQuality]);

  // Get text description of signal quality
  const getQualityText = useCallback((q: number) => {
    const avgQuality = getAverageQuality();
    
    if (!(consecutiveFingerFramesRef.current >= REQUIRED_FINGER_FRAMES)) return 'Sin detección';
    if (avgQuality > 65) return 'Señal óptima';
    if (avgQuality > 40) return 'Señal aceptable';
    return 'Señal débil';
  }, [getAverageQuality]);

  // Smooth signal values
  const smoothValue = useCallback((currentValue: number, previousValue: number | null): number => {
    if (previousValue === null) return currentValue;
    return previousValue + SMOOTHING_FACTOR * (currentValue - previousValue);
  }, []);

  // Draw grid with arrhythmia status
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    // Create a more sophisticated gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0,'#c1ff82'); // Soft purple (top)
    gradient.addColorStop(0.3, '#ffbddd'); // Soft peach (upper middle)
    gradient.addColorStop(0.5, '#afd7ff'); // Soft green (lower middle)
    gradient.addColorStop(1, '#4d4c6c'); // Soft blue (bottom)
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Add subtle texture pattern
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < CANVAS_WIDTH; i += 20) {
      for (let j = 0; j < CANVAS_HEIGHT; j += 20) {
        ctx.fillStyle = j % 40 === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';
        ctx.fillRect(i, j, 10, 10);
      }
    }
    ctx.globalAlpha = 1.0;
    
    // Draw improved grid lines
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(60, 60, 60, 0.2)'; // More subtle grid lines
    ctx.lineWidth = 0.5;
    
    // Draw vertical grid lines
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE_X) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      if (x % (GRID_SIZE_X * 5) === 0) {
        ctx.fillStyle = 'rgba(50, 50, 50, 0.6)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(x.toString(), x, CANVAS_HEIGHT - 5);
      }
    }
    
    // Draw horizontal grid lines
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE_Y) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      if (y % (GRID_SIZE_Y * 5) === 0) {
        ctx.fillStyle = 'rgba(50, 50, 50, 0.6)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(y.toString(), 15, y + 3);
      }
    }
    ctx.stroke();
    
    // Draw center line (baseline) with improved style
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(40, 40, 40, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]); // Dashed line for the center
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();
    ctx.setLineDash([]); // Reset to solid line
    
    // Draw arrhythmia status if present
    if (arrhythmiaStatus) {
      const [status, count] = arrhythmiaStatus.split('|');
      
      if (status.includes("ARRHYTHMIA") && count === "1" && !showArrhythmiaAlert) {
        // Create a highlight box for the first arrhythmia
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.fillRect(30, 70, 350, 40);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 70, 350, 40);
        
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'left';
        ctx.fillText('¡PRIMERA ARRITMIA DETECTADA!', 45, 95);
        setShowArrhythmiaAlert(true);
      } else if (status.includes("ARRHYTHMIA") && parseInt(count) > 1) {
        // Create a highlight box for multiple arrhythmias
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.fillRect(30, 70, 250, 40);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 70, 250, 40);
        
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'left';
        const redPeaksCount = peaksRef.current.filter(peak => peak.isArrhythmia).length;
        ctx.fillText(`Arritmias detectadas: ${count}`, 45, 95);
      }
    }
  }, [arrhythmiaStatus, showArrhythmiaAlert]);

  // Detect peaks in the signal
  const detectPeaks = useCallback((points: PPGDataPointExtended[], now: number) => {
    if (points.length < PEAK_DETECTION_WINDOW) return;
    
    const potentialPeaks: {index: number, value: number, time: number, isArrhythmia: boolean}[] = [];
    
    for (let i = PEAK_DETECTION_WINDOW; i < points.length - PEAK_DETECTION_WINDOW; i++) {
      const currentPoint = points[i];
      
      const recentlyProcessed = peaksRef.current.some(
        peak => Math.abs(peak.time - currentPoint.time) < MIN_PEAK_DISTANCE_MS
      );
      
      if (recentlyProcessed) continue;
      
      let isPeak = true;
      
      for (let j = i - PEAK_DETECTION_WINDOW; j < i; j++) {
        if (points[j].value >= currentPoint.value) {
          isPeak = false;
          break;
        }
      }
      
      if (isPeak) {
        for (let j = i + 1; j <= i + PEAK_DETECTION_WINDOW; j++) {
          if (j < points.length && points[j].value > currentPoint.value) {
            isPeak = false;
            break;
          }
        }
      }
      
      if (isPeak && Math.abs(currentPoint.value) > PEAK_THRESHOLD) {
        potentialPeaks.push({
          index: i,
          value: currentPoint.value,
          time: currentPoint.time,
          isArrhythmia: currentPoint.isArrhythmia || false
        });
      }
    }
    
    for (const peak of potentialPeaks) {
      const tooClose = peaksRef.current.some(
        existingPeak => Math.abs(existingPeak.time - peak.time) < MIN_PEAK_DISTANCE_MS
      );
      
      if (!tooClose) {
        peaksRef.current.push({
          time: peak.time,
          value: peak.value,
          isArrhythmia: peak.isArrhythmia,
          beepPlayed: false
        });
      }
    }
    
    peaksRef.current.sort((a, b) => a.time - b.time);
    
    peaksRef.current = peaksRef.current
      .filter(peak => now - peak.time < WINDOW_WIDTH_MS)
      .slice(-MAX_PEAKS_TO_DISPLAY);
  }, []);
  
  // Render signal function
  const renderSignal = useCallback(() => {
    if (!canvasRef.current || !dataBufferRef.current) {
      animationFrameRef.current = requestAnimationFrame(renderSignal);
      return;
    }
    
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTimeRef.current;
    
    if (!IMMEDIATE_RENDERING && timeSinceLastRender < FRAME_TIME) {
      animationFrameRef.current = requestAnimationFrame(renderSignal);
      return;
    }
    
    const canvas = canvasRef.current;
    const renderCtx = USE_OFFSCREEN_CANVAS && offscreenCanvasRef.current ? 
      offscreenCanvasRef.current.getContext('2d', { alpha: false }) : 
      canvas.getContext('2d', { alpha: false });
    
    if (!renderCtx) {
      animationFrameRef.current = requestAnimationFrame(renderSignal);
      return;
    }
    
    const now = Date.now();
    
    if (gridCanvasRef.current) {
      renderCtx.drawImage(gridCanvasRef.current, 0, 0);
    } else {
      drawGrid(renderCtx);
    }
    
    if (preserveResults && !isFingerDetected) {
      if (USE_OFFSCREEN_CANVAS && offscreenCanvasRef.current) {
        const visibleCtx = canvas.getContext('2d', { alpha: false });
        if (visibleCtx) {
          visibleCtx.drawImage(offscreenCanvasRef.current, 0, 0);
        }
      }
      
      lastRenderTimeRef.current = currentTime;
      animationFrameRef.current = requestAnimationFrame(renderSignal);
      return;
    }
    
    if (baselineRef.current === null) {
      baselineRef.current = value;
    } else {
      baselineRef.current = baselineRef.current * 0.95 + value * 0.05;
    }
    
    const smoothedValue = smoothValue(value, lastValueRef.current);
    lastValueRef.current = smoothedValue;
    
    const normalizedValue = (baselineRef.current || 0) - smoothedValue;
    const scaledValue = normalizedValue * verticalScale;
    
    // Check for arrhythmia based on multiple sources
    let currentIsArrhythmia = false;
    
    if (isArrhythmia) {
      currentIsArrhythmia = true;
      lastArrhythmiaTime.current = now;
    } else if (rawArrhythmiaData && 
        arrhythmiaStatus?.includes("ARRHYTHMIA") && 
        now - rawArrhythmiaData.timestamp < 1000) {
      currentIsArrhythmia = true;
      lastArrhythmiaTime.current = now;
    }
    
    const dataPoint: PPGDataPointExtended = {
      time: now,
      value: scaledValue,
      isArrhythmia: currentIsArrhythmia
    };
    
    dataBufferRef.current.push(dataPoint);
    
    // Get points from buffer for rendering
    const points = dataBufferRef.current.toArray();
    
    // Detect peaks
    detectPeaks(points, now);
    
    // Only draw if we have at least 2 points
    if (points.length < 2) {
      if (USE_OFFSCREEN_CANVAS && offscreenCanvasRef.current) {
        const visibleCtx = canvas.getContext('2d', { alpha: false });
        if (visibleCtx) {
          visibleCtx.drawImage(offscreenCanvasRef.current, 0, 0);
        }
      }
      
      lastRenderTimeRef.current = currentTime;
      animationFrameRef.current = requestAnimationFrame(renderSignal);
      return;
    }
    
    // Draw the signal lines
    renderCtx.lineWidth = 3;
    renderCtx.lineJoin = 'round';
    
    let currentArrhythmiaSegment = false;
    let segmentStartIndex = 0;
    
    // Draw arrhythmia segments with red color
    for (let i = 0; i < points.length; i++) {
      const isCurrentPointArrhythmia = points[i].isArrhythmia;
      
      if (isCurrentPointArrhythmia && !currentArrhythmiaSegment) {
        // Start a new arrhythmia segment
        currentArrhythmiaSegment = true;
        segmentStartIndex = i;
      } else if (!isCurrentPointArrhythmia && currentArrhythmiaSegment) {
        // End the current arrhythmia segment and draw it
        currentArrhythmiaSegment = false;
        
        if (i - segmentStartIndex > 1) {
          renderCtx.strokeStyle = 'rgb(239, 68, 68)'; // Red for arrhythmia
          renderCtx.beginPath();
          
          const startPoint = points[segmentStartIndex];
          const pointTimeMs = startPoint.time % WINDOW_WIDTH_MS;
          const x = (CANVAS_WIDTH * pointTimeMs) / WINDOW_WIDTH_MS;
          const y = CANVAS_HEIGHT / 2 - startPoint.value;
          
          renderCtx.moveTo(x, y);
          
          for (let j = segmentStartIndex + 1; j < i; j++) {
            const point = points[j];
            const pointTimeMs = point.time % WINDOW_WIDTH_MS;
            const x = (CANVAS_WIDTH * pointTimeMs) / WINDOW_WIDTH_MS;
            const y = CANVAS_HEIGHT / 2 - point.value;
            
            renderCtx.lineTo(x, y);
          }
          
          renderCtx.stroke();
        }
      }
      
      // If we're at the end of points and still in an arrhythmia segment
      if (i === points.length - 1 && currentArrhythmiaSegment) {
        renderCtx.strokeStyle = 'rgb(239, 68, 68)'; // Red for arrhythmia
        renderCtx.beginPath();
        
        const startPoint = points[segmentStartIndex];
        const pointTimeMs = startPoint.time % WINDOW_WIDTH_MS;
        const x = (CANVAS_WIDTH * pointTimeMs) / WINDOW_WIDTH_MS;
        const y = CANVAS_HEIGHT / 2 - startPoint.value;
        
        renderCtx.moveTo(x, y);
        
        for (let j = segmentStartIndex + 1; j <= i; j++) {
          const point = points[j];
          const pointTimeMs = point.time % WINDOW_WIDTH_MS;
          const x = (CANVAS_WIDTH * pointTimeMs) / WINDOW_WIDTH_MS;
          const y = CANVAS_HEIGHT / 2 - point.value;
          
          renderCtx.lineTo(x, y);
        }
        
        renderCtx.stroke();
      }
    }
    
    // Draw normal segments (non-arrhythmia)
    renderCtx.strokeStyle = 'rgb(59, 130, 246)'; // Blue for normal heartbeat
    renderCtx.beginPath();
    
    let lastPointWasArrhythmia = false;
    let lastX = 0;
    let lastY = 0;
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const pointTimeMs = point.time % WINDOW_WIDTH_MS;
      const x = (CANVAS_WIDTH * pointTimeMs) / WINDOW_WIDTH_MS;
      const y = CANVAS_HEIGHT / 2 - point.value;
      
      if (point.isArrhythmia) {
        lastPointWasArrhythmia = true;
        continue;
      }
      
      if (i === 0 || lastPointWasArrhythmia) {
        renderCtx.moveTo(x, y);
        lastPointWasArrhythmia = false;
      } else {
        renderCtx.lineTo(x, y);
      }
      
      lastX = x;
      lastY = y;
    }
    
    renderCtx.stroke();
    
    // Draw peaks as circles
    for (const peak of peaksRef.current) {
      const peakTimeMs = peak.time % WINDOW_WIDTH_MS;
      const x = (CANVAS_WIDTH * peakTimeMs) / WINDOW_WIDTH_MS;
      const y = CANVAS_HEIGHT / 2 - peak.value;
      
      // Draw larger highlighted circles for arrhythmia peaks
      if (peak.isArrhythmia) {
        // Yellow highlight behind red circle for arrhythmia
        renderCtx.beginPath();
        renderCtx.fillStyle = 'rgba(250, 204, 21, 0.7)'; // Yellow highlight
        renderCtx.arc(x, y, 12, 0, 2 * Math.PI);
        renderCtx.fill();
        
        renderCtx.beginPath();
        renderCtx.fillStyle = 'rgb(239, 68, 68)'; // Red
        renderCtx.arc(x, y, 8, 0, 2 * Math.PI);
        renderCtx.fill();
        
        // Draw arrhythmia alert icon
        renderCtx.fillStyle = 'white';
        renderCtx.font = 'bold 10px Inter';
        renderCtx.textAlign = 'center';
        renderCtx.textBaseline = 'middle';
        renderCtx.fillText('!', x, y);
        
        if (!peak.beepPlayed) {
          peak.beepPlayed = true;
          playBeep(BEEP_VOLUME * 1.5); // Louder beep for arrhythmia
        }
      } else {
        // Blue circles for normal peaks
        renderCtx.beginPath();
        renderCtx.fillStyle = 'rgb(59, 130, 246)'; // Blue
        renderCtx.arc(x, y, 6, 0, 2 * Math.PI);
        renderCtx.fill();
        
        if (!peak.beepPlayed) {
          peak.beepPlayed = true;
          playBeep();
        }
      }
    }
    
    // Draw cursor
    const cursorTimeMs = now % WINDOW_WIDTH_MS;
    const cursorX = (CANVAS_WIDTH * cursorTimeMs) / WINDOW_WIDTH_MS;
    
    renderCtx.beginPath();
    renderCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    renderCtx.lineWidth = 1;
    renderCtx.moveTo(cursorX, 0);
    renderCtx.lineTo(cursorX, CANVAS_HEIGHT);
    renderCtx.stroke();
    
    // Draw quality indicator
    renderCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    renderCtx.fillRect(CANVAS_WIDTH - 170, 20, 150, 30);
    
    const qualityColor = getQualityColor(quality);
    const qualityText = getQualityText(quality);
    
    renderCtx.font = 'bold 16px Inter';
    renderCtx.textAlign = 'center';
    renderCtx.fillStyle = qualityColor.split(' ')[1]; // Use the second color from the gradient
    renderCtx.fillText(qualityText, CANVAS_WIDTH - 95, 40);
    
    // Copy from offscreen canvas to visible canvas
    if (USE_OFFSCREEN_CANVAS && offscreenCanvasRef.current) {
      const visibleCtx = canvas.getContext('2d', { alpha: false });
      if (visibleCtx) {
        visibleCtx.drawImage(offscreenCanvasRef.current, 0, 0);
      }
    }
    
    lastRenderTimeRef.current = currentTime;
    animationFrameRef.current = requestAnimationFrame(renderSignal);
  }, [value, quality, isFingerDetected, arrhythmiaStatus, rawArrhythmiaData, isArrhythmia, drawGrid, detectPeaks, getAverageQuality, getQualityColor, getQualityText, playBeep, preserveResults, smoothValue]);

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT}
        className="w-full h-full object-cover"
      />
      
      {!isFingerDetected && !preserveResults && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
          <Fingerprint className="w-24 h-24 text-white mb-4" />
          <div className="text-white font-bold text-2xl text-center px-6">
            Coloque su dedo en la cámara para comenzar la medición
          </div>
          <button
            onClick={onStartMeasurement}
            className="mt-8 bg-gradient-to-b from-blue-500 to-blue-700 text-white px-10 py-4 rounded-full font-bold text-lg active:scale-95 transition transform"
          >
            INICIAR MEDICIÓN
          </button>
        </div>
      )}
      
      {showArrhythmiaAlert && (
        <div className="absolute top-5 right-5 bg-red-600 text-white px-4 py-2 rounded-lg flex items-center">
          <AlertCircle className="mr-2 h-5 w-5" />
          <span className="font-medium">¡Arritmia detectada!</span>
        </div>
      )}
    </div>
  );
});

export default PPGSignalMeter;
