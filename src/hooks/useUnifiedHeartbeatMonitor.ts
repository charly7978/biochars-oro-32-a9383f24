/**
 * useUnifiedHeartbeatMonitor
 * 
 * Unified hook for monitoring heartbeat and vital signs
 * Integrates CardiacSignalService with other components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCardiacSignal } from './useCardiacSignal';
import { useHeartBeatProcessor } from './useHeartBeatProcessor';
import { useVitalSignsProcessor } from './useVitalSignsProcessor';
import { VitalSignsResult } from '../modules/vital-signs';
import CardiacSignalService from '../services/CardiacSignalService';

interface HeartbeatStatus {
  bpm: number;
  confidence: number;
  arrhythmiaStatus: string;
  arrhythmiaCount: number;
  isArrhythmia: boolean;
  lastPeakTime: number | null;
}

interface VitalStatus extends VitalSignsResult {
  quality: number;
}

interface UseUnifiedHeartbeatReturn {
  heartbeat: HeartbeatStatus;
  vitals: VitalStatus;
  processSignal: (signal: number, quality: number) => void;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  reset: () => void;
  isMonitoring: boolean;
}

export function useUnifiedHeartbeatMonitor(): UseUnifiedHeartbeatReturn {
  // State for heartbeat and vital signs
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastSignalQuality, setLastSignalQuality] = useState(0);
  
  // Default values
  const [heartbeat, setHeartbeat] = useState<HeartbeatStatus>({
    bpm: 0,
    confidence: 0,
    arrhythmiaStatus: '--',
    arrhythmiaCount: 0,
    isArrhythmia: false,
    lastPeakTime: null
  });
  
  const [vitals, setVitals] = useState<VitalStatus>({
    spo2: 0,
    pressure: '--/--',
    arrhythmiaStatus: '--',
    glucose: 0,
    lipids: {
      totalCholesterol: 0,
      triglycerides: 0
    },
    quality: 0
  });
  
  // RR intervals for arrhythmia detection
  const rrIntervalsRef = useRef<{time: number, rrInterval: number, isValid: boolean}[]>([]);
  
  // Service and processors
  const cardiacServiceRef = useRef<CardiacSignalService | null>(null);
  const { 
    processSignal: processHeartBeat, 
    startMonitoring: startHeartBeatMonitoring,
    stopMonitoring: stopHeartBeatMonitoring,
    reset: resetHeartBeat
  } = useHeartBeatProcessor();
  
  const { 
    processSignal: processVitalSigns,
    reset: resetVitalSigns
  } = useVitalSignsProcessor();
  
  // Initialize CardiacSignalService
  useEffect(() => {
    cardiacServiceRef.current = CardiacSignalService.getInstance();
    cardiacServiceRef.current.initialize();
    
    return () => {
      if (cardiacServiceRef.current) {
        cardiacServiceRef.current.reset();
      }
    };
  }, []);
  
  // Setup listeners for cardiac peaks
  useEffect(() => {
    if (!cardiacServiceRef.current) return;
    
    const handlePeak = (peak: any) => {
      if (!isMonitoring) return;
      
      const now = Date.now();
      
      // Update RR intervals
      if (heartbeat.lastPeakTime) {
        const rrInterval = now - heartbeat.lastPeakTime;
        
        if (rrInterval > 300 && rrInterval < 1500) {
          rrIntervalsRef.current.push({
            time: now,
            rrInterval,
            isValid: true
          });
          
          // Keep only recent intervals
          if (rrIntervalsRef.current.length > 10) {
            rrIntervalsRef.current.shift();
          }
        }
      }
      
      // Calculate BPM from recent RR intervals
      if (rrIntervalsRef.current.length >= 3) {
        const validIntervals = rrIntervalsRef.current
          .filter(item => item.isValid)
          .slice(-8) // Use only recent intervals
          .map(item => item.rrInterval);
        
        if (validIntervals.length >= 3) {
          // Sort and take middle 60% for robustness
          const sortedIntervals = [...validIntervals].sort((a, b) => a - b);
          const startIdx = Math.floor(sortedIntervals.length * 0.2);
          const endIdx = Math.min(sortedIntervals.length - 1, Math.ceil(sortedIntervals.length * 0.8));
          
          const filteredIntervals = sortedIntervals.slice(startIdx, endIdx + 1);
          const avgInterval = filteredIntervals.reduce((sum, val) => sum + val, 0) / filteredIntervals.length;
          
          // Calculate BPM
          const calculatedBPM = Math.round(60000 / avgInterval);
          
          if (calculatedBPM >= 40 && calculatedBPM <= 200) {
            // Update heartbeat state
            setHeartbeat(prev => ({
              ...prev,
              bpm: calculatedBPM,
              confidence: peak.confidence,
              isArrhythmia: peak.isArrhythmia,
              lastPeakTime: now,
              arrhythmiaStatus: peak.isArrhythmia ? 'ARRITMIA|1' : 'NORMAL|0',
              arrhythmiaCount: peak.isArrhythmia ? prev.arrhythmiaCount + 1 : prev.arrhythmiaCount
            }));
          }
        }
      } else {
        // Not enough data for BPM calculation yet
        setHeartbeat(prev => ({
          ...prev,
          isArrhythmia: peak.isArrhythmia,
          lastPeakTime: now
        }));
      }
    };
    
    // Subscribe to peak events
    const unsubscribe = cardiacServiceRef.current.onPeak(handlePeak);
    
    return () => {
      unsubscribe();
    };
  }, [isMonitoring, heartbeat.lastPeakTime]);
  
  // Process signal and update vital signs
  const processSignal = useCallback((signal: number, quality: number) => {
    if (!isMonitoring) return;
    
    setLastSignalQuality(quality);
    
    // Process with the legacy heart beat processor for backward compatibility
    const heartbeatResult = processHeartBeat(signal);
    
    // Process with the CardiacSignalService
    if (cardiacServiceRef.current) {
      cardiacServiceRef.current.processSignal(signal, quality, {
        isArrhythmia: heartbeatResult.isArrhythmia
      });
    }
    
    // Process vital signs
    const vitalsResult = processVitalSigns(signal, heartbeatResult.rrData);
    
    if (vitalsResult) {
      setVitals({
        ...vitalsResult,
        quality
      });
    }
  }, [isMonitoring, processHeartBeat, processVitalSigns]);
  
  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    startHeartBeatMonitoring();
    
    // Reset state
    setHeartbeat({
      bpm: 0,
      confidence: 0,
      arrhythmiaStatus: '--',
      arrhythmiaCount: 0,
      isArrhythmia: false,
      lastPeakTime: null
    });
    
    setVitals({
      spo2: 0,
      pressure: '--/--',
      arrhythmiaStatus: '--',
      glucose: 0,
      lipids: {
        totalCholesterol: 0,
        triglycerides: 0
      },
      quality: 0
    });
    
    rrIntervalsRef.current = [];
    
    if (cardiacServiceRef.current) {
      cardiacServiceRef.current.reset();
    }
  }, [startHeartBeatMonitoring]);
  
  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    stopHeartBeatMonitoring();
  }, [stopHeartBeatMonitoring]);
  
  // Reset everything
  const reset = useCallback(() => {
    stopMonitoring();
    resetHeartBeat();
    resetVitalSigns();
    
    setHeartbeat({
      bpm: 0,
      confidence: 0,
      arrhythmiaStatus: '--',
      arrhythmiaCount: 0,
      isArrhythmia: false,
      lastPeakTime: null
    });
    
    setVitals({
      spo2: 0,
      pressure: '--/--',
      arrhythmiaStatus: '--',
      glucose: 0,
      lipids: {
        totalCholesterol: 0,
        triglycerides: 0
      },
      quality: 0
    });
    
    rrIntervalsRef.current = [];
    
    if (cardiacServiceRef.current) {
      cardiacServiceRef.current.reset();
    }
  }, [stopMonitoring, resetHeartBeat, resetVitalSigns]);
  
  return {
    heartbeat,
    vitals,
    processSignal,
    startMonitoring,
    stopMonitoring,
    reset,
    isMonitoring
  };
}
