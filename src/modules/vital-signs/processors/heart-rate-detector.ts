
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Heart rate detection functions for real PPG signals
 * All methods work with real data only, no simulation
 * Enhanced for natural rhythm detection and clear beats
 */
export class HeartRateDetector {
  // Store recent peaks for consistent timing analysis
  private peakTimes: number[] = [];
  private lastProcessTime: number = 0;
  private lastBpm: number = 0;
  
  // Improved peak detection
  private dynamicThreshold: number = 0;
  private readonly THRESHOLD_ADJUSTMENT_RATE = 0.2;
  private readonly MIN_PEAK_HEIGHT = 0.1;
  
  // Signal quality tracking
  private signalQualityHistory: number[] = [];
  private readonly QUALITY_HISTORY_SIZE = 10;
  private readonly MIN_QUALITY_THRESHOLD = 0.3;
  
  // Debug statistics
  private peakHeights: number[] = [];
  private peakIntervals: number[] = [];
  
  /**
   * Calculate heart rate from real PPG values with enhanced peak detection
   */
  public calculateHeartRate(ppgValues: number[], sampleRate: number = 30): number {
    if (ppgValues.length < sampleRate * 0.8) { // Reduced for faster detection
      return 0;
    }
    
    const now = Date.now();
    
    // Track processing time for natural timing
    const timeDiff = now - this.lastProcessTime;
    this.lastProcessTime = now;
    
    // Get recent real data - analyze more data for better detection
    const recentData = ppgValues.slice(-Math.min(ppgValues.length, sampleRate * 3)); // Increased for better detection
    
    // Calculate signal statistics for adaptive thresholding
    const mean = recentData.reduce((sum, val) => sum + val, 0) / recentData.length;
    const stdDev = Math.sqrt(
      recentData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentData.length
    );
    
    // Improved adaptive threshold with higher responsiveness
    if (this.dynamicThreshold === 0) {
      this.dynamicThreshold = mean + stdDev * 0.8;
    } else {
      // Adjust threshold based on signal characteristics
      const targetThreshold = mean + stdDev * 0.8;
      this.dynamicThreshold = this.dynamicThreshold * (1 - this.THRESHOLD_ADJUSTMENT_RATE) 
                            + targetThreshold * this.THRESHOLD_ADJUSTMENT_RATE;
    }
    
    // Find peaks in real data with adaptive threshold
    const peaks = this.findPeaksEnhanced(recentData, mean, stdDev);
    
    // Log peak detection statistics
    if (peaks.length > 0) {
      this.peakHeights = peaks.map(idx => recentData[idx]);
      console.log("HeartRateDetector: Peaks detected", {
        count: peaks.length,
        threshold: this.dynamicThreshold,
        heights: this.peakHeights.slice(-3),
        mean: mean,
        stdDev: stdDev
      });
    }
    
    if (peaks.length < 2) {
      return this.lastBpm; // Return last detected BPM if not enough peaks
    }
    
    // Convert peak indices to timestamps for natural timing
    const sampleDuration = timeDiff / recentData.length;
    const peakTimes = peaks.map(idx => now - (recentData.length - idx) * sampleDuration);
    
    // Update stored peak times
    this.peakTimes = [...this.peakTimes, ...peakTimes].slice(-15); // Increased for better analysis
    
    // Calculate intervals between consecutive peaks
    const intervals: number[] = [];
    for (let i = 1; i < this.peakTimes.length; i++) {
      const interval = this.peakTimes[i] - this.peakTimes[i-1];
      // Only use physiologically plausible intervals (30-240 BPM)
      if (interval >= 250 && interval <= 2000) { // Expanded to detect higher HR
        intervals.push(interval);
      }
    }
    
    // Save intervals for debugging
    this.peakIntervals = intervals.slice(-5);
    
    if (intervals.length < 2) {
      // Fall back to sample-based calculation if not enough timestamp-based intervals
      let totalInterval = 0;
      for (let i = 1; i < peaks.length; i++) {
        totalInterval += peaks[i] - peaks[i - 1];
      }
      
      const avgInterval = totalInterval / (peaks.length - 1);
      const calculatedBpm = Math.round(60 / (avgInterval / sampleRate));
      
      // Validate the calculated BPM
      if (calculatedBpm >= 40 && calculatedBpm <= 200) {
        this.lastBpm = calculatedBpm;
        console.log("HeartRateDetector: Sample-based BPM calculation", {
          bpm: calculatedBpm,
          avgInterval: avgInterval,
          sampleRate: sampleRate
        });
        return calculatedBpm;
      }
      
      return this.lastBpm;
    }
    
    // Calculate average interval with outlier rejection - improved filtering
    intervals.sort((a, b) => a - b);
    const filteredIntervals = intervals.slice(
      Math.floor(intervals.length * 0.1), // More inclusive
      Math.ceil(intervals.length * 0.9)   // More inclusive
    );
    
    if (filteredIntervals.length === 0) {
      return this.lastBpm;
    }
    
    const avgInterval = filteredIntervals.reduce((sum, val) => sum + val, 0) / filteredIntervals.length;
    
    // Convert to beats per minute
    const calculatedBpm = Math.round(60000 / avgInterval);
    
    // Validate the calculated BPM is physiologically plausible
    if (calculatedBpm >= 40 && calculatedBpm <= 200) {
      // Apply smoothing to prevent jumps
      this.lastBpm = (this.lastBpm > 0) 
        ? Math.round(this.lastBpm * 0.6 + calculatedBpm * 0.4)
        : calculatedBpm;
      
      console.log("HeartRateDetector: Time-based BPM calculation", {
        bpm: this.lastBpm,
        rawBpm: calculatedBpm,
        avgInterval: avgInterval,
        intervals: intervals.slice(-5)
      });
    }
    
    return this.lastBpm;
  }
  
  /**
   * Enhanced peak detection with real data and adaptive thresholding
   * Improved for natural synchronization between visualization and beeps
   */
  public findPeaksEnhanced(values: number[], mean: number, stdDev: number): number[] {
    const peaks: number[] = [];
    const minPeakDistance = 5; // More sensitive for natural peak detection
    
    // Dynamic threshold based on real signal statistics - more sensitive threshold
    const peakThreshold = this.dynamicThreshold;
    
    // First pass: identify all potential peaks
    const potentialPeaks: number[] = [];
    for (let i = 2; i < values.length - 2; i++) {
      const current = values[i];
      
      // Check if this point is a peak in real data
      if (current > values[i - 1] && 
          current > values[i - 2] &&
          current > values[i + 1] && 
          current > values[i + 2] &&
          current > peakThreshold) {
        
        potentialPeaks.push(i);
      }
    }
    
    // Second pass: filter for natural rhythm with minimum distance
    if (potentialPeaks.length === 0) {
      return peaks;
    }
    
    // Always include the first peak
    peaks.push(potentialPeaks[0]);
    
    // Filter other peaks based on minimum distance
    for (let i = 1; i < potentialPeaks.length; i++) {
      const current = potentialPeaks[i];
      const prev = peaks[peaks.length - 1];
      
      // Enforce minimum distance between peaks for physiological plausibility
      if (current - prev >= minPeakDistance) {
        peaks.push(current);
      } else {
        // If peaks are too close, keep the stronger one
        if (values[current] > values[prev]) {
          peaks.pop();
          peaks.push(current);
        }
      }
    }
    
    return peaks;
  }
  
  /**
   * Original peak finder with real data
   */
  public findPeaks(values: number[]): number[] {
    const peaks: number[] = [];
    
    // Simple peak detector for real data
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push(i);
      }
    }
    
    return peaks;
  }
  
  /**
   * Get debug information about heart rate detection
   */
  public getDebugInfo(): any {
    return {
      lastBpm: this.lastBpm,
      dynamicThreshold: this.dynamicThreshold,
      peakCount: this.peakTimes.length,
      recentPeakHeights: this.peakHeights.slice(-3),
      recentPeakIntervals: this.peakIntervals
    };
  }
  
  /**
   * Reset the heart rate detector
   */
  public reset(): void {
    this.peakTimes = [];
    this.lastProcessTime = 0;
    this.lastBpm = 0;
    this.dynamicThreshold = 0;
    this.signalQualityHistory = [];
    this.peakHeights = [];
    this.peakIntervals = [];
    console.log("HeartRateDetector: Reset complete");
  }
}
