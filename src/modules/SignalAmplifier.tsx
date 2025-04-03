
interface AmplifierResult {
  amplifiedValue: number;
  quality: number;
}

export class SignalAmplifier {
  private gain: number = 1.5;
  private adaptiveGain: number = 1.0;
  private signalQuality: number = 0;
  private signalHistory: number[] = [];
  private readonly HISTORY_SIZE = 20;
  private readonly MAX_GAIN = 5.0; // Increased from 4.0 for even stronger amplification
  private readonly MIN_GAIN = 0.8;
  private readonly ADAPTATION_RATE = 0.2; // Increased from 0.15 for faster adaptation
  private readonly HEARTBEAT_BOOST = 1.5; // Increased from 1.2 for more pronounced beats
  private readonly PEAK_EMPHASIS = 1.2; // New factor to emphasize peaks

  constructor() {
    this.reset();
  }

  reset(): void {
    this.gain = 1.5;
    this.adaptiveGain = 1.0;
    this.signalQuality = 0;
    this.signalHistory = [];
  }

  getCurrentGain(): number {
    return this.gain * this.adaptiveGain;
  }

  processValue(value: number): AmplifierResult {
    // Add to history
    this.signalHistory.push(value);
    if (this.signalHistory.length > this.HISTORY_SIZE) {
      this.signalHistory.shift();
    }

    // Calculate signal characteristics
    let signalQuality = 0;
    let amplifiedValue = value * this.gain;

    if (this.signalHistory.length >= 5) {
      // Calculate signal statistics
      const recentValues = this.signalHistory.slice(-5);
      const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
      const variations = recentValues.map(val => Math.abs(val - mean));
      const variationSum = variations.reduce((sum, val) => sum + val, 0);
      const variationMean = variationSum / variations.length;

      // Detect potential heartbeat patterns - improved algorithm
      let isHeartbeatPattern = false;
      let beatConfidence = 0;
      if (this.signalHistory.length >= 10) {
        const beatPattern = this.detectHeartbeatPattern(this.signalHistory.slice(-10));
        isHeartbeatPattern = beatPattern.confidence > 0.5; // Lowered threshold for more sensitivity
        beatConfidence = beatPattern.confidence;
      }

      // Adjust adaptive gain based on signal characteristics
      if (variationMean > 0.08 && variationMean < 5.0) { // Lowered threshold from 0.1 to 0.08
        // Good signal, adjust gain to optimal level
        let targetGain = 1.7 / Math.max(0.4, Math.min(2.0, variationMean)); // Increased base gain
        
        // Apply heartbeat boost for clearer peaks when a heartbeat pattern is detected
        if (isHeartbeatPattern) {
          // Apply stronger boost based on confidence
          targetGain *= this.HEARTBEAT_BOOST * (0.8 + beatConfidence * 0.4);
        }
        
        this.adaptiveGain = this.adaptiveGain * (1 - this.ADAPTATION_RATE) +
                            targetGain * this.ADAPTATION_RATE;
        
        // Limit gain to reasonable range
        this.adaptiveGain = Math.max(this.MIN_GAIN, Math.min(this.MAX_GAIN, this.adaptiveGain));
        
        // Increase quality rating for good signals
        signalQuality = Math.min(1.0, (0.2 + variationMean) / 2.0);
      } else if (variationMean <= 0.08) {
        // Very low variation might indicate poor signal
        signalQuality = Math.max(0.1, variationMean);
        
        // Gradually increase gain to try to detect signal
        this.adaptiveGain = Math.min(this.MAX_GAIN, this.adaptiveGain * 1.15); // Increased from 1.1
      } else {
        // Too much variation, might be noise
        signalQuality = Math.max(0.1, 5.0 / variationMean);
        
        // Decrease gain to reduce noise
        this.adaptiveGain = Math.max(this.MIN_GAIN, this.adaptiveGain * 0.92); // More aggressive reduction
      }

      // Apply adaptive gain
      amplifiedValue = value * this.gain * this.adaptiveGain;
      
      // Apply additional emphasis to signal changes to make peaks more pronounced
      if (this.signalHistory.length >= 3) {
        const prevValue = this.signalHistory[this.signalHistory.length - 2];
        const change = value - prevValue;
        
        // Increase emphasis on significant changes
        if (Math.abs(change) > 0.04) { // Lowered from 0.05 for more sensitivity
          // Emphasize direction changes for better peak visibility
          const emphasisFactor = Math.min(Math.abs(change) * this.PEAK_EMPHASIS, 0.8); // Increased from 0.5
          amplifiedValue += Math.sign(change) * emphasisFactor;
          
          // Further amplify potential heartbeats
          if (isHeartbeatPattern && change > 0) {
            amplifiedValue += change * 0.3 * beatConfidence; // Additional boost for rising edges
          }
        }
      }
      
      // Advanced waveform shaping to enhance peaks
      if (isHeartbeatPattern && this.signalHistory.length >= 5) {
        const derivative = this.calculateDerivative(this.signalHistory.slice(-5));
        if (derivative > 0.05) {
          // Enhance rising edges (potential systolic peak)
          amplifiedValue += derivative * 0.4;
        }
      }
    }

    // Smooth quality changes
    this.signalQuality = this.signalQuality * 0.7 + signalQuality * 0.3; // Increased responsiveness

    return {
      amplifiedValue,
      quality: this.signalQuality
    };
  }

  // Calculate the average signal derivative (rate of change)
  private calculateDerivative(values: number[]): number {
    let sum = 0;
    for (let i = 1; i < values.length; i++) {
      sum += values[i] - values[i-1];
    }
    return sum / (values.length - 1);
  }

  // Improved method to detect heartbeat patterns in the signal
  private detectHeartbeatPattern(values: number[]): { confidence: number } {
    if (values.length < 6) return { confidence: 0 };

    // Calculate first differences (changes between consecutive values)
    const diffs = [];
    for (let i = 1; i < values.length; i++) {
      diffs.push(values[i] - values[i-1]);
    }

    // Count sign changes (potential heartbeat peaks and valleys)
    let signChanges = 0;
    for (let i = 1; i < diffs.length; i++) {
      if ((diffs[i] > 0 && diffs[i-1] < 0) || (diffs[i] < 0 && diffs[i-1] > 0)) {
        signChanges++;
      }
    }
    
    // Analyze rhythmic patterns (consistent intervals between peaks)
    let rhythmScore = 0;
    if (signChanges >= 2) {
      // Find peaks (local maxima)
      const peaks = [];
      for (let i = 1; i < values.length - 1; i++) {
        if (values[i] > values[i-1] && values[i] > values[i+1]) {
          peaks.push(i);
        }
      }
      
      // Calculate intervals between peaks
      if (peaks.length >= 2) {
        const intervals = [];
        for (let i = 1; i < peaks.length; i++) {
          intervals.push(peaks[i] - peaks[i-1]);
        }
        
        // Evaluate consistency of intervals
        if (intervals.length >= 1) {
          const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
          const intervalVariation = intervals.map(i => Math.abs(i - avgInterval) / avgInterval);
          const avgVariation = intervalVariation.reduce((sum, val) => sum + val, 0) / intervalVariation.length;
          
          // Lower variation means more consistent rhythm
          rhythmScore = Math.max(0, 1 - avgVariation);
        }
      }
    }

    // Calculate variance to assess signal stability
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    // Assess if this looks like a heartbeat pattern:
    // - Should have some sign changes (rhythm)
    // - Should have reasonable variance (not too flat, not too chaotic)
    // - Should have consistent intervals between peaks (rhythmic pattern)
    const signChangesScore = Math.min(signChanges / 3, 1); // Normalize to 0-1
    const varianceScore = variance > 0.01 && variance < 0.7 ? 1 : 0.1; // Increased upper bound
    
    // Combined confidence score with more weight to rhythm
    const confidence = signChangesScore * 0.4 + varianceScore * 0.3 + rhythmScore * 0.3;
    
    return { confidence };
  }
}
