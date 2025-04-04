/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * CardiacChannel
 * Specialized signal channel optimized for cardiac signal processing
 * - Heart rate detection
 * - Arrhythmia analysis
 * - Beat quality assessment
 */

import { SpecializedChannel } from './SpecializedChannel';
import { ChannelFeedback, VitalSignType } from '../../../types/signal';
import { TensorFlowMLProcessor } from '../../ml/TensorFlowMLProcessor';

/**
 * CardiacChannel
 * Specialized channel optimized for cardiac signal processing
 */
export class CardiacChannel extends SpecializedChannel {
  // Keep RR intervals for arrhythmia analysis
  private rrIntervals: number[] = [];
  private lastPeakTime: number = 0;
  private peakValues: number[] = [];
  private heartRateEstimate: number = 0;
  private latestPeakDetected: boolean = false;
  private peakThreshold: number = 0.2;
  
  // Buffer for recent values
  protected buffer: number[] = [];
  
  // Frequency range for cardiac signals
  private frequencyMin: number = 0.5;
  private frequencyMax: number = 5.0;
  
  // ML processor for enhanced signal analysis
  private mlProcessor: TensorFlowMLProcessor | null = null;
  private mlEnabled: boolean = false;
  
  // Arrhythmia detection
  private isCurrentBeatArrhythmia: boolean = false;
  private arrhythmiaCounter: number = 0;
  
  /**
   * Constructor
   * @param config Channel configuration
   */
  constructor(config: any) {
    super(VitalSignType.CARDIAC, config);
    
    // Initialize ML processor if available
    try {
      this.mlProcessor = new TensorFlowMLProcessor();
      this.mlEnabled = true;
      console.log("CardiacChannel: ML processor initialized");
    } catch (e) {
      console.warn("CardiacChannel: ML processor not available", e);
      this.mlEnabled = false;
    }
    
    // Set cardiac-specific configuration
    this.setCardiacFrequencyRange(0.5, 5.0); // Target heart rate range (30 - 300 bpm)
    
    console.log("CardiacChannel: Initialized with specialized cardiac parameters");
  }

  /**
   * Set frequency range for cardiac processing
   */
  private setCardiacFrequencyRange(min: number, max: number): void {
    this.frequencyMin = min;
    this.frequencyMax = max;
  }
  
  /**
   * Process a single signal value
   * @param value Signal value
   * @returns Processed value
   */
  public processValue(value: number): number {
    // Store in buffer
    this.buffer.push(value);
    if (this.buffer.length > 50) {
      this.buffer.shift();
    }
    
    // Apply channel-specific optimization
    const processedValue = this.applyChannelSpecificOptimization(value);
    
    // Enhanced cardiac processing
    const enhancedValue = this.enhanceCardiacSignal(processedValue);
    
    // ML-enhanced signal if available
    let mlEnhancedValue = enhancedValue;
    if (this.mlEnabled && this.mlProcessor) {
      mlEnhancedValue = this.mlProcessor.processSample(enhancedValue).enhancedValue;
    }
    
    // Detect peak
    const currentTime = Date.now();
    const isPeak = this.detectPeak(mlEnhancedValue);
    
    // Update latest peak detected flag
    this.latestPeakDetected = isPeak;
    
    // Process peak for RR intervals if detected
    if (isPeak) {
      // Store peak value
      this.peakValues.push(mlEnhancedValue);
      if (this.peakValues.length > 10) {
        this.peakValues.shift();
      }
      
      // Adapt peak threshold based on recent peaks
      this.adaptPeakThreshold();
      
      // Calculate RR interval and update list
      if (this.lastPeakTime > 0) {
        const rrInterval = currentTime - this.lastPeakTime;
        
        // Only consider reasonable RR intervals (250ms to 2000ms)
        // Equivalent to HR 30-240 bpm
        if (rrInterval >= 250 && rrInterval <= 2000) {
          this.rrIntervals.push(rrInterval);
          
          // Keep a limited buffer of RR intervals
          if (this.rrIntervals.length > 10) {
            this.rrIntervals.shift();
          }
          
          // Update heart rate estimate
          this.updateHeartRateEstimate();
          
          // Check for arrhythmia
          this.isCurrentBeatArrhythmia = this.detectArrhythmia();
          
          // Emit cardiac peak event with appropriate data
          this.emitCardiacPeakEvent();
        }
      }
      
      // Update last peak time
      this.lastPeakTime = currentTime;
    }
    
    return mlEnhancedValue;
  }
  
  /**
   * Apply channel-specific optimization to the signal
   * Required implementation from SpecializedChannel
   */
  protected applyChannelSpecificOptimization(value: number): number {
    // Cardiac-specific optimization
    // - Focus on frequency range of interest for heart rate
    // - Emphasize cardiac features
    
    // Simple implementation for now
    return value * 1.2;
  }
  
  /**
   * Enhance the signal for cardiac processing
   * @param value Base processed value
   * @returns Enhanced value for cardiac analysis
   */
  private enhanceCardiacSignal(value: number): number {
    // Apply specific cardiac signal enhancements
    // - Emphasize peaks
    // - Reduce noise
    
    // Simple enhancement: emphasize peaks a bit more
    return value * 1.1;
  }
  
  /**
   * Detect peaks in the signal
   * @param value Current signal value
   * @returns True if peak detected
   */
  private detectPeak(value: number): boolean {
    // Basic algorithm: adaptive threshold-based peak detection
    
    // Need at least some buffer to detect peaks
    if (this.buffer.length < 5) {
      return false;
    }
    
    // Get the last few samples
    const recentValues = this.buffer.slice(-5);
    
    // Current value is the middle one (to avoid edge effects)
    const currentValue = recentValues[2];
    
    // Check if middle value is bigger than neighbors and above threshold
    return (
      value > this.peakThreshold &&
      currentValue > recentValues[0] &&
      currentValue > recentValues[1] &&
      currentValue > recentValues[3] &&
      currentValue > recentValues[4]
    );
  }
  
  /**
   * Adapt peak detection threshold based on recent signal
   */
  private adaptPeakThreshold(): void {
    if (this.peakValues.length < 3) {
      return;
    }
    
    // Calculate average peak value from recent peaks
    const avgPeak = this.peakValues.reduce((sum, val) => sum + val, 0) / this.peakValues.length;
    
    // Set threshold to 60% of average peak value
    this.peakThreshold = avgPeak * 0.6;
    
    // Ensure reasonable bounds
    this.peakThreshold = Math.max(0.1, Math.min(0.5, this.peakThreshold));
  }
  
  /**
   * Update heart rate estimate based on RR intervals
   */
  private updateHeartRateEstimate(): void {
    if (this.rrIntervals.length < 2) {
      return;
    }
    
    // Average the last few RR intervals
    const avgRR = this.rrIntervals.reduce((sum, val) => sum + val, 0) / this.rrIntervals.length;
    
    // Convert to BPM: 60,000 ms / RR interval in ms
    this.heartRateEstimate = Math.round(60000 / avgRR);
    
    // Ensure physiological range
    this.heartRateEstimate = Math.max(30, Math.min(220, this.heartRateEstimate));
  }
  
  /**
   * Detect arrhythmia based on RR interval variability
   * @returns True if arrhythmia detected
   */
  private detectArrhythmia(): boolean {
    if (this.rrIntervals.length < 3) {
      return false;
    }
    
    // Advanced arrhythmia detection (based on HRV metrics)
    // 1. Calculate RR interval variability
    const avgRR = this.rrIntervals.reduce((sum, val) => sum + val, 0) / this.rrIntervals.length;
    const rrVariability = this.rrIntervals.map(rr => Math.abs(rr - avgRR) / avgRR);
    const maxVariability = Math.max(...rrVariability);
    
    // 2. RMSSD - Root Mean Square of Successive Differences
    let rmssd = 0;
    for (let i = 1; i < this.rrIntervals.length; i++) {
      rmssd += Math.pow(this.rrIntervals[i] - this.rrIntervals[i-1], 2);
    }
    rmssd = Math.sqrt(rmssd / (this.rrIntervals.length - 1));
    
    // 3. Apply rule-based detection with adaptive thresholds
    let isArrhythmia = false;
    
    // High heart rate (>100 bpm) - less variability expected
    if (this.heartRateEstimate > 100) {
      isArrhythmia = maxVariability > 0.25;
    } 
    // Low heart rate (<50 bpm) - more variability expected
    else if (this.heartRateEstimate < 50) {
      isArrhythmia = maxVariability > 0.3;
    }
    // Normal heart rate - moderate variability threshold
    else {
      isArrhythmia = maxVariability > 0.2 || (rmssd > 50 && maxVariability > 0.15);
    }
    
    // Update arrhythmia counter if arrhythmia detected
    if (isArrhythmia) {
      this.arrhythmiaCounter++;
    }
    
    return isArrhythmia;
  }
  
  /**
   * Emit cardiac peak event for audio system
   */
  private emitCardiacPeakEvent(): void {
    // Create custom event with cardiac data
    const event = new CustomEvent('cardiac-peak-detected', {
      detail: {
        timestamp: Date.now(),
        heartRate: this.heartRateEstimate,
        isArrhythmia: this.isCurrentBeatArrhythmia,
        arrhythmiaCounter: this.arrhythmiaCounter,
        source: 'cardiac-channel'
      }
    });
    
    // Dispatch event for listeners (AudioManager)
    window.dispatchEvent(event);
  }
  
  /**
   * Apply feedback to adjust channel parameters
   * @param feedback Feedback from cardiac algorithm
   */
  public applyFeedback(feedback: ChannelFeedback): void {
    // Add timestamp if not present
    const timestampedFeedback = {
      ...feedback,
      timestamp: feedback.timestamp || Date.now()
    };
    
    // Apply base feedback handling from parent class
    super.applyFeedback(timestampedFeedback);
    
    // Apply cardiac-specific feedback
    if (timestampedFeedback.suggestedAdjustments) {
      if (timestampedFeedback.suggestedAdjustments.peakDetectionThreshold !== undefined) {
        // Override adaptive threshold with suggested value
        this.peakThreshold = timestampedFeedback.suggestedAdjustments.peakDetectionThreshold;
      }
    }
    
    // Apply ML feedback if available
    if (timestampedFeedback.mlFeedback && this.mlProcessor) {
      // Forward feedback to ML processor
      this.mlProcessor.applyFeedback(timestampedFeedback.mlFeedback);
    }
    
    console.log("CardiacChannel: Applied feedback", {
      signalQuality: timestampedFeedback.signalQuality,
      success: timestampedFeedback.success,
      adaptedThreshold: this.peakThreshold
    });
  }
  
  /**
   * Get the most recent RR intervals
   * @returns Array of RR intervals in milliseconds
   */
  public getRRIntervals(): number[] {
    return [...this.rrIntervals];
  }
  
  /**
   * Check if latest sample was a peak
   * @returns True if latest sample was a peak
   */
  public isLatestPeakDetected(): boolean {
    return this.latestPeakDetected;
  }
  
  /**
   * Get estimated heart rate
   * @returns Heart rate in BPM
   */
  public getEstimatedHeartRate(): number {
    return this.heartRateEstimate;
  }
  
  /**
   * Get arrhythmia status
   * @returns True if current beat is arrhythmic
   */
  public isArrhythmia(): boolean {
    return this.isCurrentBeatArrhythmia;
  }
  
  /**
   * Get arrhythmia counter
   * @returns Number of arrhythmias detected
   */
  public getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }
  
  /**
   * Reset channel
   */
  public reset(): void {
    super.reset();
    this.rrIntervals = [];
    this.lastPeakTime = 0;
    this.peakValues = [];
    this.heartRateEstimate = 0;
    this.latestPeakDetected = false;
    this.isCurrentBeatArrhythmia = false;
    this.buffer = [];
    
    // Don't reset arrhythmia counter on normal reset
    // Users typically want to track this across measurement sessions
    
    console.log("CardiacChannel: Reset complete");
  }
  
  /**
   * Full reset (including arrhythmia counter)
   */
  public fullReset(): void {
    this.reset();
    this.arrhythmiaCounter = 0;
    console.log("CardiacChannel: Full reset complete (including arrhythmia counter)");
  }
}
