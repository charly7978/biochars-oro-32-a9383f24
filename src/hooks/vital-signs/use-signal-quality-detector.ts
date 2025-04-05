
import { useState, useEffect } from 'react';
import { useSignalProcessor } from '@/hooks/useSignalProcessor';

/**
 * Hook to detect and report signal quality
 */
export function useSignalQualityDetector() {
  const { lastSignal } = useSignalProcessor();
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [qualityLevel, setQualityLevel] = useState<string>("Sin señal");
  
  useEffect(() => {
    if (lastSignal) {
      setSignalQuality(lastSignal.quality);
      setQualityLevel(getQualityLevel(lastSignal.quality));
    }
  }, [lastSignal]);
  
  // Get text description of quality level
  const getQualityLevel = (quality: number) => {
    if (quality >= 80) return "Excelente";
    if (quality >= 60) return "Buena";
    if (quality >= 40) return "Regular";
    if (quality >= 20) return "Baja";
    return "Muy baja";
  };
  
  return { signalQuality, qualityLevel };
}
