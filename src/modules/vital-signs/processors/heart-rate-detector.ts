/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Heart rate detection functions for real PPG signals
 * All methods work with real data only, no simulation
 * Enhanced for natural rhythm detection and clear beats
 * Optimized for lower latency and better BPM calculation
 */
export class HeartRateDetector {
  // Store recent peaks for consistent timing analysis
  private peakTimes: number[] = [];
  private lastProcessTime: number = 0;
  private recentBPMs: number[] = [];
  private signalThreshold: number = 0.1;  // Added adaptive threshold
  
  /**
   * Calculate heart rate from real PPG values with enhanced peak detection
   * Optimized for lower latency and more accurate BPM
   */
  public calculateHeartRate(ppgValues: number[], sampleRate: number = 30): number {
    if (ppgValues.length < sampleRate * 0.6) { // Further reduced for faster detection
      return 0;
    }
    
    const now = Date.now();
    
    // Track processing time for natural timing
    const timeDiff = now - this.lastProcessTime;
    this.lastProcessTime = now;
    
    // Get recent real data - using more data for better detection
    const recentData = ppgValues.slice(-Math.min(ppgValues.length, sampleRate * 2)); // Adjusted for better performance
    
    // Calculate signal statistics for adaptive thresholding
    const mean = recentData.reduce((sum, val) => sum + val, 0) / recentData.length;
    const stdDev = Math.sqrt(
      recentData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentData.length
    );
    
    // Update adaptive threshold based on signal characteristics
    this.updateThreshold(mean, stdDev);
    
    // Find peaks in real data with adaptive threshold
    const peaks = this.findPeaksEnhanced(recentData, mean, stdDev);
    
    if (peaks.length < 2) {
      return 0;
    }
    
    // Convert peak indices to timestamps for natural timing
    const sampleDuration = timeDiff / recentData.length || 33.3; // Default to 30fps if calculation fails
    const peakTimes = peaks.map(idx => now - (recentData.length - idx) * sampleDuration);
    
    // Update stored peak times
    this.peakTimes = [...this.peakTimes, ...peakTimes].slice(-18); // Increased for better analysis
    
    // Calculate intervals between consecutive peaks
    const intervals: number[] = [];
    for (let i = 1; i < this.peakTimes.length; i++) {
      const interval = this.peakTimes[i] - this.peakTimes[i-1];
      // Only use physiologically plausible intervals (30-240 BPM)
      if (interval >= 250 && interval <= 2000) { // Extended to detect higher HR
        intervals.push(interval);
      }
    }
    
    if (intervals.length < 2) {
      // Fall back to sample-based calculation if not enough timestamp-based intervals
      let totalInterval = 0;
      for (let i = 1; i < peaks.length; i++) {
        totalInterval += peaks[i] - peaks[i - 1];
      }
      
      const avgInterval = totalInterval / (peaks.length - 1);
      const calculatedBPM = Math.round(60 / (avgInterval / sampleRate));
      
      // Only store physiologically plausible values
      if (calculatedBPM >= 30 && calculatedBPM <= 240) {
        // Store for smoothing
        this.recentBPMs.push(calculatedBPM);
        if (this.recentBPMs.length > 5) {
          this.recentBPMs.shift();
        }
      }
      
      // Apply smoothing for stability
      return this.getSmoothedBPM();
    }
    
    // Calculate average interval with improved outlier rejection
    intervals.sort((a, b) => a - b);
    const filteredIntervals = intervals.slice(
      Math.floor(intervals.length * 0.1), // More inclusive
      Math.ceil(intervals.length * 0.9)   // More inclusive
    );
    
    if (filteredIntervals.length === 0) {
      return this.recentBPMs.length > 0 ? this.getSmoothedBPM() : 0;
    }
    
    const avgInterval = filteredIntervals.reduce((sum, val) => sum + val, 0) / filteredIntervals.length;
    
    // Convert to beats per minute
    const calculatedBPM = Math.round(60000 / avgInterval);
    
    // Only store physiologically plausible values
    if (calculatedBPM >= 30 && calculatedBPM <= 240) {
      // Store for smoothing
      this.recentBPMs.push(calculatedBPM);
      if (this.recentBPMs.length > 5) {
        this.recentBPMs.shift();
      }
    }
    
    // Apply smoothing for stability
    return this.getSmoothedBPM();
  }
  
  /**
   * Update the signal threshold based on current signal characteristics
   */
  private updateThreshold(mean: number, stdDev: number): void {
    // Adaptive threshold that responds to signal strength
    const newThreshold = Math.max(0.05, mean + (stdDev * 0.3)); // More sensitive for weak signals
    
    // Smooth threshold changes for stability
    this.signalThreshold = 0.7 * this.signalThreshold + 0.3 * newThreshold;
    
    // Ensure reasonable bounds
    this.signalThreshold = Math.max(0.05, Math.min(0.3, this.signalThreshold));
  }
  
  /**
   * Get smoothed BPM from recent calculations for more stable output
   * Uses median filtering for better results
   */
  private getSmoothedBPM(): number {
    if (this.recentBPMs.length === 0) return 0;
    if (this.recentBPMs.length === 1) return this.recentBPMs[0];
    
    // Use median for better stability with real data
    const sorted = [...this.recentBPMs].sort((a, b) => a - b);
    const medianIdx = Math.floor(sorted.length / 2);
    
    // If we have at least 3 values, get an average centered around median for stability
    if (sorted.length >= 3) {
      const midValues = sorted.slice(
        Math.max(0, medianIdx - 1),
        Math.min(sorted.length, medianIdx + 2)
      );
      return Math.round(midValues.reduce((sum, val) => sum + val, 0) / midValues.length);
    }
    
    return sorted[medianIdx];
  }
  
  /**
   * Enhanced peak detection with real data and adaptive thresholding
   * Improved for natural synchronization between visualization and beeps
   */
  public findPeaksEnhanced(values: number[], mean: number, stdDev: number): number[] {
    const peaks: number[] = [];
    const minPeakDistance = 5; // More sensitive for natural peak detection
    
    // Dynamic threshold based on real signal statistics - more sensitive
    const peakThreshold = Math.max(0.05, mean + (stdDev * 0.2)); // More sensitive but with minimum
    
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
   * Reset the heart rate detector
   */
  public reset(): void {
    this.peakTimes = [];
    this.lastProcessTime = 0;
    this.recentBPMs = [];
    this.signalThreshold = 0.1;
  }
}
