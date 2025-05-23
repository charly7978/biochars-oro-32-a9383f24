
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * OptimizedSignalDistributor
 * Splits the processed PPG signal into specialized channels for each vital sign algorithm
 * Each channel is individually optimized for specific features needed by the corresponding algorithm
 * Implements bidirectional feedback to continuously improve signal quality
 */

import { 
  ProcessedSignal, 
  OptimizedSignalChannel, 
  VitalSignType,
  ChannelFeedback,
  SignalDistributorConfig
} from '../../types/signal';
import { SpecializedChannel, ChannelConfig } from './channels/SpecializedChannel';
import { SpO2Channel } from './channels/SpO2Channel';
import { CardiacChannel } from './channels/CardiacChannel';

/**
 * Default configuration for the signal distributor
 */
const DEFAULT_CONFIG: SignalDistributorConfig = {
  enableFeedback: true,
  adaptChannels: true,
  optimizationInterval: 5000, // 5 seconds
  channels: {
    // Configure each channel with optimal settings for each vital sign
    [VitalSignType.SPO2]: {
      initialAmplification: 1.15,
      initialFilterStrength: 0.75,
      frequencyBandMin: 0.8,
      frequencyBandMax: 5.0
    },
    // Add cardiac channel configuration
    [VitalSignType.CARDIAC]: {
      initialAmplification: 1.8,
      initialFilterStrength: 0.6,
      frequencyBandMin: 0.5,
      frequencyBandMax: 4.0
    }
  }
};

/**
 * OptimizedSignalDistributor
 * Core class that manages specialized signal channels for each vital sign
 */
export class OptimizedSignalDistributor {
  private channels: Map<VitalSignType, SpecializedChannel> = new Map();
  private feedbackQueue: ChannelFeedback[] = [];
  private isProcessing: boolean = false;
  private config: SignalDistributorConfig;
  private optimizationTimer: ReturnType<typeof setInterval> | null = null;
  private lastProcessedSignal: ProcessedSignal | null = null;
  private processingMetrics: {
    channelProcessingTimes: Map<VitalSignType, number[]>;
    feedbackCount: Map<VitalSignType, number>;
    successRate: Map<VitalSignType, number[]>;
  };
  private audioEnabled: boolean = true;

  /**
   * Constructor
   * @param config Configuration for the signal distributor
   */
  constructor(config?: Partial<SignalDistributorConfig>) {
    this.config = {...DEFAULT_CONFIG, ...config};
    
    // Initialize processing metrics
    this.processingMetrics = {
      channelProcessingTimes: new Map(),
      feedbackCount: new Map(),
      successRate: new Map()
    };
    
    // Initialize channels
    this.initializeChannels();
    
    // Start optimization loop if enabled
    if (this.config.adaptChannels) {
      this.startOptimizationLoop();
    }
    
    console.log("OptimizedSignalDistributor: Initialized with SpO2 and Cardiac channels with bidirectional feedback");
  }

  /**
   * Initialize all specialized channels
   */
  private initializeChannels(): void {
    // Create specialized channel for SpO2 measurement
    this.channels.set(
      VitalSignType.SPO2, 
      new SpO2Channel(
        this.config.channels[VitalSignType.SPO2] || DEFAULT_CONFIG.channels[VitalSignType.SPO2]
      )
    );
    
    // Create specialized channel for Cardiac measurement
    this.channels.set(
      VitalSignType.CARDIAC, 
      new CardiacChannel(
        this.config.channels[VitalSignType.CARDIAC] || DEFAULT_CONFIG.channels[VitalSignType.CARDIAC]
      )
    );
    
    // Initialize metrics for each channel
    for (const type of Object.values(VitalSignType)) {
      if (this.channels.has(type)) {
        this.processingMetrics.channelProcessingTimes.set(type, []);
        this.processingMetrics.feedbackCount.set(type, 0);
        this.processingMetrics.successRate.set(type, []);
      }
    }
    
    console.log("OptimizedSignalDistributor: SpO2 and Cardiac channels initialized");
  }

  /**
   * Process a signal and distribute it to all channels
   * @param signal Processed PPG signal
   * @returns Object with processed values for each channel
   */
  public processSignal(signal: ProcessedSignal): Record<VitalSignType, number> {
    if (!this.isProcessing) {
      console.log("OptimizedSignalDistributor: Not currently processing signals");
      return this.getEmptyResults();
    }
    
    // Store the signal for optimization purposes
    this.lastProcessedSignal = signal;
    
    const startTime = performance.now();
    const results: Record<VitalSignType, number> = {} as Record<VitalSignType, number>;
    
    // Skip processing if finger is not detected or signal quality is too low
    if (!signal.fingerDetected || signal.quality < 20) {
      console.log("OptimizedSignalDistributor: Skipping - no finger detected or low quality", {
        fingerDetected: signal.fingerDetected,
        quality: signal.quality
      });
      return this.getEmptyResults();
    }
    
    // Process signal through each specialized channel
    for (const [type, channel] of this.channels.entries()) {
      const channelStartTime = performance.now();
      
      // Process the value through the specialized channel
      const processedValue = channel.processValue(signal.filteredValue);
      results[type] = processedValue;
      
      // Record processing time for this channel
      const channelProcessingTime = performance.now() - channelStartTime;
      const times = this.processingMetrics.channelProcessingTimes.get(type) || [];
      times.push(channelProcessingTime);
      
      // Keep only the last 50 measurements for metrics
      if (times.length > 50) {
        times.shift();
      }
      this.processingMetrics.channelProcessingTimes.set(type, times);
      
      // Special handling for cardiac channel - emit beep if peak detected
      if (type === VitalSignType.CARDIAC) {
        const cardiacChannel = channel as CardiacChannel;
        if (cardiacChannel.isLatestPeakDetected() && this.audioEnabled) {
          // Emit peak detected event for audio system
          this.emitCardiacPeakEvent(cardiacChannel.getEstimatedHeartRate());
        }
      }
    }
    
    const totalProcessingTime = performance.now() - startTime;
    
    if (totalProcessingTime > 10) { // Log only if processing time is significant
      console.log("OptimizedSignalDistributor: Signal processing complete", {
        totalProcessingTime,
        channelCount: this.channels.size,
        signalQuality: signal.quality,
        timestamp: signal.timestamp
      });
    }
    
    return results;
  }

  /**
   * Emit cardiac peak event for audio system
   * @param heartRate Current heart rate estimate
   */
  private emitCardiacPeakEvent(heartRate: number): void {
    // Custom event with heart rate data for audio system
    const event = new CustomEvent('cardiac-peak-detected', { 
      detail: { 
        heartRate,
        timestamp: Date.now(),
        source: 'optimized-cardiac-channel'
      } 
    });
    
    // Dispatch the event for listeners (AudioManager will listen)
    window.dispatchEvent(event);
    
    console.log("OptimizedSignalDistributor: Cardiac peak event emitted", { heartRate });
  }

  /**
   * Enable/disable audio for cardiac peaks
   * @param enabled Whether audio should be enabled
   */
  public setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
    console.log(`OptimizedSignalDistributor: Audio ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Start the signal distributor
   */
  public start(): void {
    this.isProcessing = true;
    
    // Start optimization loop if enabled
    if (this.config.adaptChannels && !this.optimizationTimer) {
      this.startOptimizationLoop();
    }
    
    console.log("OptimizedSignalDistributor: Started processing");
  }

  /**
   * Stop the signal distributor
   */
  public stop(): void {
    this.isProcessing = false;
    
    // Stop optimization loop
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }
    
    console.log("OptimizedSignalDistributor: Stopped processing");
  }

  /**
   * Reset all channels and metrics
   */
  public reset(): void {
    // Reset all channels
    for (const channel of this.channels.values()) {
      channel.reset();
    }
    
    // Clear feedback queue
    this.feedbackQueue = [];
    
    // Reset processing metrics
    for (const type of Object.values(VitalSignType)) {
      if (this.channels.has(type)) {
        this.processingMetrics.channelProcessingTimes.set(type, []);
        this.processingMetrics.feedbackCount.set(type, 0);
        this.processingMetrics.successRate.set(type, []);
      }
    }
    
    this.lastProcessedSignal = null;
    console.log("OptimizedSignalDistributor: Reset complete");
  }

  /**
   * Apply feedback from an algorithm to improve channel processing
   * @param feedback Feedback from algorithm
   */
  public applyFeedback(feedback: ChannelFeedback): void {
    if (!this.config.enableFeedback) {
      return;
    }
    
    // Add to feedback queue
    this.feedbackQueue.push(feedback);
    
    // Update feedback count metric
    const type = this.getChannelTypeById(feedback.channelId);
    if (type) {
      const count = this.processingMetrics.feedbackCount.get(type) || 0;
      this.processingMetrics.feedbackCount.set(type, count + 1);
      
      // Update success rate
      const rates = this.processingMetrics.successRate.get(type) || [];
      rates.push(feedback.success ? 1 : 0);
      if (rates.length > 50) {
        rates.shift();
      }
      this.processingMetrics.successRate.set(type, rates);
    }
    
    // Process feedback immediately if not in batch mode
    this.processFeedback(feedback);
  }

  /**
   * Process an individual feedback item
   * @param feedback Feedback to process
   */
  private processFeedback(feedback: ChannelFeedback): void {
    // Find the channel
    const type = this.getChannelTypeById(feedback.channelId);
    if (!type) {
      console.warn("OptimizedSignalDistributor: Feedback for unknown channel", feedback.channelId);
      return;
    }
    
    const channel = this.channels.get(type);
    if (!channel) {
      return;
    }
    
    // Apply feedback to the channel
    channel.applyFeedback(feedback);
  }

  /**
   * Start the optimization loop for continuous channel improvement
   */
  private startOptimizationLoop(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
    }
    
    this.optimizationTimer = setInterval(() => {
      this.runOptimization();
    }, this.config.optimizationInterval);
    
    console.log("OptimizedSignalDistributor: Optimization loop started");
  }

  /**
   * Run optimization step to improve channel processing
   */
  private runOptimization(): void {
    if (!this.isProcessing || !this.lastProcessedSignal) {
      return;
    }
    
    console.log("OptimizedSignalDistributor: Running optimization step");
    
    // Calculate average processing times for each channel
    const averageProcessingTimes: Record<VitalSignType, number> = {} as Record<VitalSignType, number>;
    
    for (const [type, times] of this.processingMetrics.channelProcessingTimes.entries()) {
      if (times.length > 0) {
        averageProcessingTimes[type] = times.reduce((a, b) => a + b, 0) / times.length;
      }
    }
    
    // Calculate success rate for each channel
    const successRates: Record<VitalSignType, number> = {} as Record<VitalSignType, number>;
    
    for (const [type, rates] of this.processingMetrics.successRate.entries()) {
      if (rates.length > 0) {
        successRates[type] = rates.reduce((a, b) => a + b, 0) / rates.length;
      }
    }
    
    console.log("OptimizedSignalDistributor: Optimization metrics", {
      averageProcessingTimes,
      successRates,
      feedbackCounts: Object.fromEntries(this.processingMetrics.feedbackCount.entries())
    });
  }

  /**
   * Get channel type by channel ID
   * @param channelId Channel ID
   * @returns VitalSignType or undefined if not found
   */
  private getChannelTypeById(channelId: string): VitalSignType | undefined {
    for (const [type, channel] of this.channels.entries()) {
      if (channel.getId() === channelId) {
        return type;
      }
    }
    return undefined;
  }

  /**
   * Get a specific channel
   * @param type Type of vital sign channel
   * @returns Channel or undefined if not found
   */
  public getChannel(type: VitalSignType): SpecializedChannel | undefined {
    return this.channels.get(type);
  }

  /**
   * Get empty results object (all zeros)
   * @returns Record with zero values for all channels
   */
  private getEmptyResults(): Record<VitalSignType, number> {
    const results: Record<VitalSignType, number> = {} as Record<VitalSignType, number>;
    
    for (const type of Object.values(VitalSignType)) {
      if (this.channels.has(type)) {
        results[type] = 0;
      }
    }
    
    return results;
  }

  /**
   * Get diagnostics about the distributor and channels
   */
  public getDiagnostics(): any {
    const channelQualities: Record<VitalSignType, number> = {} as Record<VitalSignType, number>;
    
    for (const [type, channel] of this.channels.entries()) {
      channelQualities[type] = channel.getQuality();
    }
    
    return {
      isProcessing: this.isProcessing,
      channelCount: this.channels.size,
      feedbackQueueLength: this.feedbackQueue.length,
      channelQualities,
      averageProcessingTimes: Object.fromEntries(
        Array.from(this.processingMetrics.channelProcessingTimes.entries())
          .map(([key, times]) => [key, times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0])
      ),
      successRates: Object.fromEntries(
        Array.from(this.processingMetrics.successRate.entries())
          .map(([key, rates]) => [key, rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0])
      ),
      feedbackCounts: Object.fromEntries(this.processingMetrics.feedbackCount.entries()),
      configSummary: {
        enableFeedback: this.config.enableFeedback,
        adaptChannels: this.config.adaptChannels,
        optimizationInterval: this.config.optimizationInterval,
        audioEnabled: this.audioEnabled
      }
    };
  }
}
