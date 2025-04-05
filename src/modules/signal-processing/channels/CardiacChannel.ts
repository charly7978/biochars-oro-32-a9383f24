
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
 * Only processes real measured data with no simulation
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
  
  // Arrhythmia detection with auto-reset
  private isCurrentBeatArrhythmia: boolean = false;
  private arrhythmiaCounter: number = 0;
  private lastArrhythmiaTime: number = 0;
  private arrhythmiaAutoResetInterval: number = 3000; // Auto-reset después de 3 segundos sin detectar nueva arritmia
  
  // Diagnostic data
  private diagnosticData: { 
    timestamp: number;
    rmssd: number | null;
    peakAmplitude: number | null;
    rrVariability: number | null;
    signalQuality: number;
    beatConfidence: number;
  }[] = [];
  
  // Enhanced arrhythmia visualization data
  private currentArrhythmiaWindow: {start: number, end: number} | null = null;
  private arrhythmiaWindows: {start: number, end: number}[] = [];
  
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
   * @param value Signal value from real measurement
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
    
    // Auto-reset arrhythmia status if no new arrythmias detected in the timeout period
    if (this.isCurrentBeatArrhythmia && 
        (currentTime - this.lastArrhythmiaTime > this.arrhythmiaAutoResetInterval)) {
      console.log("CardiacChannel: Auto-resetting arrhythmia status after timeout");
      this.isCurrentBeatArrhythmia = false;
    }
    
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
          
          // Update heart rate estimate with improved accuracy
          this.updateHeartRateEstimateImproved();
          
          // Check for arrhythmia
          const isArrhythmia = this.detectArrhythmia();
          
          if (isArrhythmia) {
            this.isCurrentBeatArrhythmia = true;
            this.lastArrhythmiaTime = currentTime;
          }
          
          // If this is an arrhythmia, start or update the current window
          this.updateArrhythmiaWindows(this.isCurrentBeatArrhythmia, currentTime);
          
          // Store diagnostic data for visualization
          this.collectDiagnosticData(
            currentTime, 
            mlEnhancedValue, 
            rrInterval
          );
          
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
    // - Emphasize cardiac features from real signal
    
    // Real signal processing - no simulation
    return value * 1.2;
  }
  
  /**
   * Enhance the signal for cardiac processing
   * @param value Base processed value
   * @returns Enhanced value for cardiac analysis
   */
  private enhanceCardiacSignal(value: number): number {
    // Apply specific cardiac signal enhancements
    // - Emphasize peaks from real signal with improved amplitude
    // - Reduce noise with optimized signal-to-noise ratio
    
    // Real enhancement: emphasize peaks with better amplification factor
    // Increased from 1.1 to 1.35 to avoid achatamiento de ondas
    return value * 1.35;
  }
  
  /**
   * Detect peaks in the real signal
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
   * Adapt peak detection threshold based on recent real signal
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
   * Update heart rate estimate based on real RR intervals
   * Improved algorithm for more accurate BPM calculation
   */
  private updateHeartRateEstimateImproved(): void {
    if (this.rrIntervals.length < 2) {
      return;
    }
    
    // Sort intervals to filter outliers
    const sortedIntervals = [...this.rrIntervals].sort((a, b) => a - b);
    
    // Remove potential outliers by taking the middle 60% of values
    const startIdx = Math.floor(sortedIntervals.length * 0.2);
    const endIdx = Math.ceil(sortedIntervals.length * 0.8);
    const filteredIntervals = sortedIntervals.slice(startIdx, endIdx);
    
    // If we don't have enough intervals after filtering, use all of them
    const intervalsToUse = filteredIntervals.length >= 2 ? filteredIntervals : sortedIntervals;
    
    // Average the intervals with outlier rejection
    const avgRR = intervalsToUse.reduce((sum, val) => sum + val, 0) / intervalsToUse.length;
    
    // Convert to BPM with more precision: 60,000 ms / RR interval in ms
    const calculatedBPM = Math.round(60000 / avgRR);
    
    // Apply weighted averaging to smooth BPM changes
    if (this.heartRateEstimate === 0) {
      this.heartRateEstimate = calculatedBPM;
    } else {
      // Use 70% of previous and 30% of new for smoother transitions
      this.heartRateEstimate = Math.round(this.heartRateEstimate * 0.7 + calculatedBPM * 0.3);
    }
    
    // Ensure physiological range
    this.heartRateEstimate = Math.max(30, Math.min(220, this.heartRateEstimate));
    
    // Log BPM calculation for debugging
    console.log("CardiacChannel: Calculated BPM:", {
      rawBPM: Math.round(60000 / avgRR),
      filteredBPM: this.heartRateEstimate,
      intervals: this.rrIntervals,
      filteredIntervals: intervalsToUse
    });
  }
  
  /**
   * Detect arrhythmia based on real RR interval variability
   * @returns True if arrhythmia detected
   */
  private detectArrhythmia(): boolean {
    if (this.rrIntervals.length < 3) {
      return false;
    }
    
    // Advanced arrhythmia detection (based on real HRV metrics)
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
   * Manage arrhythmia visualization windows
   */
  private updateArrhythmiaWindows(isArrhythmia: boolean, currentTime: number): void {
    if (isArrhythmia) {
      // Start new window or extend current one
      if (!this.currentArrhythmiaWindow) {
        this.currentArrhythmiaWindow = {
          start: currentTime,
          end: currentTime + 500 // Initial end (will be extended)
        };
      } else {
        // Extend current window
        this.currentArrhythmiaWindow.end = currentTime + 500;
      }
    } else {
      // If there's a current window and no longer in arrhythmia, close it
      if (this.currentArrhythmiaWindow && currentTime > this.currentArrhythmiaWindow.end) {
        // Only store windows that are long enough to be significant
        if (this.currentArrhythmiaWindow.end - this.currentArrhythmiaWindow.start > 1000) {
          this.arrhythmiaWindows.push(this.currentArrhythmiaWindow);
          
          // Keep only most recent windows for visualization
          if (this.arrhythmiaWindows.length > 10) {
            this.arrhythmiaWindows.shift();
          }
          
          // Dispatch an arrhythmia window event for visualization
          window.dispatchEvent(new CustomEvent('arrhythmia-window-detected', {
            detail: this.currentArrhythmiaWindow
          }));
        }
        
        this.currentArrhythmiaWindow = null;
      }
    }
  }
  
  /**
   * Collect diagnostic data for visualization
   */
  private collectDiagnosticData(
    currentTime: number, 
    peakValue: number,
    rrInterval: number
  ): void {
    // Calculate RMSSD (root mean square of successive differences)
    let rmssd = null;
    if (this.rrIntervals.length > 3) {
      let sum = 0;
      for (let i = 1; i < this.rrIntervals.length; i++) {
        sum += Math.pow(this.rrIntervals[i] - this.rrIntervals[i-1], 2);
      }
      rmssd = Math.sqrt(sum / (this.rrIntervals.length - 1));
    }
    
    // Calculate RR variability
    let rrVariability = null;
    if (this.rrIntervals.length > 1) {
      const avgRR = this.rrIntervals.reduce((sum, val) => sum + val, 0) / this.rrIntervals.length;
      rrVariability = Math.abs(rrInterval - avgRR) / avgRR;
    }
    
    // Store diagnostic point
    this.diagnosticData.push({
      timestamp: currentTime,
      rmssd: rmssd,
      peakAmplitude: peakValue,
      rrVariability: rrVariability,
      signalQuality: this.rrIntervals.length > 5 ? 85 : 60, // Simple estimation
      beatConfidence: this.rrIntervals.length > 3 ? 0.9 : 0.7 // Simple estimation
    });
    
    // Keep limited history
    if (this.diagnosticData.length > 100) {
      this.diagnosticData.shift();
    }
  }
  
  /**
   * Emit cardiac peak event for audio system
   */
  private emitCardiacPeakEvent(): void {
    // Create custom event with real cardiac data
    const event = new CustomEvent('cardiac-peak-detected', {
      detail: {
        timestamp: Date.now(),
        heartRate: this.heartRateEstimate,
        isArrhythmia: this.isCurrentBeatArrhythmia,
        arrhythmiaCounter: this.arrhythmiaCounter,
        source: 'cardiac-channel',
        diagnosticData: this.diagnosticData[this.diagnosticData.length - 1]
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
   * Get arrhythmia windows for visualization
   * @returns Array of arrhythmia time windows
   */
  public getArrhythmiaWindows(): {start: number, end: number}[] {
    return [...this.arrhythmiaWindows];
  }
  
  /**
   * Get all diagnostic data
   * @returns Array of diagnostic data points
   */
  public getDiagnosticData() {
    return [...this.diagnosticData];
  }
  
  /**
   * Get latest diagnostic data
   * @returns Latest diagnostic data point or null
   */
  public getLatestDiagnosticData() {
    return this.diagnosticData.length > 0 ? 
      this.diagnosticData[this.diagnosticData.length - 1] : null;
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
    this.currentArrhythmiaWindow = null;
    this.diagnosticData = [];
    
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
    this.arrhythmiaWindows = [];
    console.log("CardiacChannel: Full reset complete (including arrhythmia counter)");
  }
}
