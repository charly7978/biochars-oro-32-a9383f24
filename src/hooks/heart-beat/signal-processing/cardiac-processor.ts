
/**
 * Optimized signal processor for cardiac calculations to reduce delay
 * REAL data only, no simulation
 */

/**
 * Process raw signal into cardiac-optimized signal
 * Applies optimized filters with lower latency
 */
export function optimizeCardiacSignal(rawValue: number, buffer: number[]): number {
  // Apply real-time optimization without delay-inducing filters
  // Important: No filters that introduce significant delay
  
  // Basic normalization
  const optimized = rawValue * 1.5;
  
  // Simple noise reduction if we have enough buffer
  if (buffer.length > 3) {
    const recentAvg = (buffer[buffer.length - 1] + buffer[buffer.length - 2] + buffer[buffer.length - 3]) / 3;
    // Mix raw signal with minimal smoothing (90/10) to maintain real-time performance
    return optimized * 0.9 + recentAvg * 0.1;
  }
  
  return optimized;
}

/**
 * Detect peaks with minimum latency
 */
export function detectPeakRealTime(
  value: number, 
  buffer: number[], 
  threshold: number = 0.15
): boolean {
  // Need at least 3 samples for basic peak detection
  if (buffer.length < 3) return false;
  
  // Check if current value is peak compared to immediate neighbors
  // This has lower latency than larger window checks
  const current = value;
  const prev1 = buffer[buffer.length - 1];
  const prev2 = buffer[buffer.length - 2];
  
  return current > threshold && 
         current > prev1 * 1.05 && // 5% higher than previous
         prev1 > prev2 * 0.95;    // Previous was already rising
}

/**
 * Calculate heart rate with minimal latency and improved accuracy
 * Uses optimized algorithm for real data
 */
export function calculateHeartRateOptimized(rrIntervals: number[]): number {
  if (rrIntervals.length < 2) return 0;
  
  // Use median instead of mean for better outlier rejection
  // Median has better performance with real physiological data
  const sortedIntervals = [...rrIntervals].sort((a, b) => a - b);
  const medianIdx = Math.floor(sortedIntervals.length / 2);
  const medianRR = sortedIntervals[medianIdx];
  
  // For real data, use weighted averaging of multiple intervals for stability
  let weightedSum = 0;
  let totalWeight = 0;
  
  // More weight to central (more reliable) values
  for (let i = 0; i < sortedIntervals.length; i++) {
    // Only use physiologically plausible intervals (30-220 BPM)
    if (sortedIntervals[i] >= 270 && sortedIntervals[i] <= 2000) {
      // Calculate distance from median for weighting
      const distFromMedian = Math.abs(i - medianIdx);
      const weight = Math.max(1, sortedIntervals.length - distFromMedian);
      
      weightedSum += sortedIntervals[i] * weight;
      totalWeight += weight;
    }
  }
  
  // Calculate BPM from weighted average
  if (totalWeight === 0) return Math.round(60000 / medianRR);
  
  const weightedAvgRR = weightedSum / totalWeight;
  return Math.round(60000 / weightedAvgRR);
}
