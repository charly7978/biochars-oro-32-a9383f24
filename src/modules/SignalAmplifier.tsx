
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
  private readonly MAX_GAIN = 4.0; // Increased from 3.0 for stronger amplification
  private readonly MIN_GAIN = 0.8;
  private readonly ADAPTATION_RATE = 0.15; // Increased from 0.1 for faster adaptation
  private readonly HEARTBEAT_BOOST = 1.2; // New parameter to boost heartbeat signals

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

      // Detect potential heartbeat patterns
      let isHeartbeatPattern = false;
      if (this.signalHistory.length >= 10) {
        const beatPattern = this.detectHeartbeatPattern(this.signalHistory.slice(-10));
        isHeartbeatPattern = beatPattern.confidence > 0.6;
      }

      // Adjust adaptive gain based on signal characteristics
      if (variationMean > 0.1 && variationMean < 5.0) {
        // Good signal, adjust gain to optimal level
        let targetGain = 1.5 / Math.max(0.5, Math.min(2.0, variationMean));
        
        // Apply heartbeat boost for clearer peaks when a heartbeat pattern is detected
        if (isHeartbeatPattern) {
          targetGain *= this.HEARTBEAT_BOOST;
        }
        
        this.adaptiveGain = this.adaptiveGain * (1 - this.ADAPTATION_RATE) +
                            targetGain * this.ADAPTATION_RATE;
        
        // Limit gain to reasonable range
        this.adaptiveGain = Math.max(this.MIN_GAIN, Math.min(this.MAX_GAIN, this.adaptiveGain));
        
        // Increase quality rating for good signals
        signalQuality = Math.min(1.0, (0.2 + variationMean) / 2.0);
      } else if (variationMean <= 0.1) {
        // Very low variation might indicate poor signal
        signalQuality = Math.max(0.1, variationMean);
        
        // Gradually increase gain to try to detect signal
        this.adaptiveGain = Math.min(this.MAX_GAIN, this.adaptiveGain * 1.1); // Increased from 1.05
      } else {
        // Too much variation, might be noise
        signalQuality = Math.max(0.1, 5.0 / variationMean);
        
        // Decrease gain to reduce noise
        this.adaptiveGain = Math.max(this.MIN_GAIN, this.adaptiveGain * 0.95);
      }

      // Apply adaptive gain
      amplifiedValue = value * this.gain * this.adaptiveGain;
      
      // Apply additional emphasis to signal changes to make peaks more pronounced
      if (this.signalHistory.length >= 3) {
        const prevValue = this.signalHistory[this.signalHistory.length - 2];
        const change = value - prevValue;
        if (Math.abs(change) > 0.05) {
          // Emphasize direction changes for better peak visibility
          amplifiedValue += Math.sign(change) * Math.min(Math.abs(change) * 0.8, 0.5);
        }
      }
    }

    // Smooth quality changes
    this.signalQuality = this.signalQuality * 0.8 + signalQuality * 0.2;

    return {
      amplifiedValue,
      quality: this.signalQuality
    };
  }

  // New method to detect heartbeat patterns in the signal
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

    // Calculate variance to assess signal stability
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    // Assess if this looks like a heartbeat pattern:
    // - Should have some sign changes (rhythm)
    // - Should have reasonable variance (not too flat, not too chaotic)
    const signChangesScore = Math.min(signChanges / 3, 1); // Normalize to 0-1
    const varianceScore = variance > 0.01 && variance < 0.5 ? 1 : 0.1;
    
    const confidence = signChangesScore * 0.6 + varianceScore * 0.4;
    return { confidence };
  }
}
