
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
  private readonly MAX_GAIN = 3.0;
  private readonly MIN_GAIN = 0.8;
  private readonly ADAPTATION_RATE = 0.1;

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

      // Adjust adaptive gain based on signal characteristics
      if (variationMean > 0.1 && variationMean < 5.0) {
        // Good signal, adjust gain to optimal level
        const targetGain = 1.5 / Math.max(0.5, Math.min(2.0, variationMean));
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
        this.adaptiveGain = Math.min(this.MAX_GAIN, this.adaptiveGain * 1.05);
      } else {
        // Too much variation, might be noise
        signalQuality = Math.max(0.1, 5.0 / variationMean);
        
        // Decrease gain to reduce noise
        this.adaptiveGain = Math.max(this.MIN_GAIN, this.adaptiveGain * 0.95);
      }

      // Apply adaptive gain
      amplifiedValue = value * this.gain * this.adaptiveGain;
    }

    // Smooth quality changes
    this.signalQuality = this.signalQuality * 0.8 + signalQuality * 0.2;

    return {
      amplifiedValue,
      quality: this.signalQuality
    };
  }
}
