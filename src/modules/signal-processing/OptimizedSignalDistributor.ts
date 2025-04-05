/**
 * Optimized signal distributor
 * Manages specialized signal channels for different vital sign measurements
 */
import { ProcessedSignal, OptimizedSignalChannel, VitalSignType, ChannelFeedback } from '../../types/signal';
import { v4 as uuidv4 } from 'uuid';

// Import specialized channel implementations
import { GlucoseChannel } from './channels/GlucoseChannel';
import { HydrationChannel } from './channels/HydrationChannel'; // Changed from LipidsChannel
import { BloodPressureChannel } from './channels/BloodPressureChannel';
import { SpO2Channel } from './channels/SpO2Channel';
import { CardiacChannel } from './channels/CardiacChannel';

/**
 * Configuration for the signal distributor
 */
export interface SignalDistributorConfig {
  enableFeedback: boolean;
  adaptChannels: boolean;
  optimizationInterval: number;
  channels?: {
    [key in VitalSignType]?: {
      initialAmplification: number;
      initialFilterStrength: number;
      frequencyBandMin: number;
      frequencyBandMax: number;
    }
  };
}

/**
 * Manages optimized signal channels for different vital signs
 */
export class OptimizedSignalDistributor {
  private readonly id: string;
  private channels: Map<VitalSignType, OptimizedSignalChannel> = new Map();
  private isRunning: boolean = false;
  
  // Feedback and adaptation
  private readonly enableFeedback: boolean;
  private readonly adaptChannels: boolean;
  private readonly optimizationInterval: number;
  private optimizationTimer: NodeJS.Timeout | null = null;
  private feedbackQueue: ChannelFeedback[] = [];
  
  // Default channel configuration
  private readonly defaultConfig = {
    [VitalSignType.GLUCOSE]: {
      initialAmplification: 1.1,
      initialFilterStrength: 0.8,
      frequencyBandMin: 0.05,
      frequencyBandMax: 0.4
    },
    [VitalSignType.HYDRATION]: { // Changed from LIPIDS
      initialAmplification: 1.2,
      initialFilterStrength: 0.7,
      frequencyBandMin: 0.07,
      frequencyBandMax: 0.5
    },
    [VitalSignType.BLOOD_PRESSURE]: {
      initialAmplification: 1.0,
      initialFilterStrength: 0.7,
      frequencyBandMin: 0.04,
      frequencyBandMax: 0.35
    },
    [VitalSignType.SPO2]: {
      initialAmplification: 1.05,
      initialFilterStrength: 0.6,
      frequencyBandMin: 0.06,
      frequencyBandMax: 0.45
    },
    [VitalSignType.CARDIAC]: {
      initialAmplification: 1.0,
      initialFilterStrength: 0.5,
      frequencyBandMin: 0.08,
      frequencyBandMax: 0.6
    }
  };
  
  /**
   * Constructor for OptimizedSignalDistributor
   * @param config Configuration for the distributor
   */
  constructor(config: SignalDistributorConfig) {
    this.id = `signal-distributor-${uuidv4().substring(0, 8)}`;
    
    // Set configuration
    this.enableFeedback = config.enableFeedback;
    this.adaptChannels = config.adaptChannels;
    this.optimizationInterval = config.optimizationInterval;
    
    // Create channels with merged configuration (defaults + custom)
    this.initializeChannels(config);
    
    console.log(`OptimizedSignalDistributor: Initialized with ${this.channels.size} channels`);
  }
  
  /**
   * Initialize specialized signal channels
   */
  private initializeChannels(config: SignalDistributorConfig): void {
    // Merge custom config with defaults
    const mergedConfig = { ...this.defaultConfig };
    if (config.channels) {
      Object.entries(config.channels).forEach(([type, settings]) => {
        const vitalType = type as VitalSignType;
        if (vitalType in mergedConfig) {
          mergedConfig[vitalType] = { ...mergedConfig[vitalType], ...settings };
        }
      });
    }
    
    // Create glucose channel
    const glucoseConfig = mergedConfig[VitalSignType.GLUCOSE];
    const glucoseChannel = new GlucoseChannel({
      initialAmplification: glucoseConfig.initialAmplification,
      initialFilterStrength: glucoseConfig.initialFilterStrength,
      frequencyBandMin: glucoseConfig.frequencyBandMin,
      frequencyBandMax: glucoseConfig.frequencyBandMax
    });
    this.channels.set(VitalSignType.GLUCOSE, glucoseChannel as unknown as OptimizedSignalChannel);
    
    // Create hydration channel (replaced lipids)
    const hydrationConfig = mergedConfig[VitalSignType.HYDRATION]; // Changed from LIPIDS
    const hydrationChannel = new HydrationChannel({ // Changed from LipidsChannel
      initialAmplification: hydrationConfig.initialAmplification,
      initialFilterStrength: hydrationConfig.initialFilterStrength,
      frequencyBandMin: hydrationConfig.frequencyBandMin,
      frequencyBandMax: hydrationConfig.frequencyBandMax
    });
    this.channels.set(VitalSignType.HYDRATION, hydrationChannel as unknown as OptimizedSignalChannel); // Changed from LIPIDS
    
    // Create blood pressure channel
    const bpConfig = mergedConfig[VitalSignType.BLOOD_PRESSURE];
    const bpChannel = new BloodPressureChannel({
      initialAmplification: bpConfig.initialAmplification,
      initialFilterStrength: bpConfig.initialFilterStrength,
      frequencyBandMin: bpConfig.frequencyBandMin,
      frequencyBandMax: bpConfig.frequencyBandMax
    });
    this.channels.set(VitalSignType.BLOOD_PRESSURE, bpChannel as unknown as OptimizedSignalChannel);
    
    // Create SpO2 channel
    const spo2Config = mergedConfig[VitalSignType.SPO2];
    const spo2Channel = new SpO2Channel({
      initialAmplification: spo2Config.initialAmplification,
      initialFilterStrength: spo2Config.initialFilterStrength,
      frequencyBandMin: spo2Config.frequencyBandMin,
      frequencyBandMax: spo2Config.frequencyBandMax
    });
    this.channels.set(VitalSignType.SPO2, spo2Channel as unknown as OptimizedSignalChannel);
    
    // Create cardiac channel
    const cardiacConfig = mergedConfig[VitalSignType.CARDIAC];
    const cardiacChannel = new CardiacChannel({
      initialAmplification: cardiacConfig.initialAmplification,
      initialFilterStrength: cardiacConfig.initialFilterStrength,
      frequencyBandMin: cardiacConfig.frequencyBandMin,
      frequencyBandMax: cardiacConfig.frequencyBandMax
    });
    this.channels.set(VitalSignType.CARDIAC, cardiacChannel as unknown as OptimizedSignalChannel);
  }
  
  /**
   * Start the signal distributor
   */
  public start(): void {
    this.isRunning = true;
    if (this.adaptChannels && !this.optimizationTimer) {
      this.optimizationTimer = setInterval(() => this.optimizeChannels(), this.optimizationInterval);
      console.log('OptimizedSignalDistributor: Started optimization loop');
    }
    console.log('OptimizedSignalDistributor: Started');
  }
  
  /**
   * Stop the signal distributor
   */
  public stop(): void {
    this.isRunning = false;
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
      console.log('OptimizedSignalDistributor: Stopped optimization loop');
    }
    console.log('OptimizedSignalDistributor: Stopped');
  }
  
  /**
   * Process a signal and distribute it to all channels
   * @param signal Processed PPG signal
   * @returns Object with processed values for each channel
   */
  public processSignal(signal: ProcessedSignal): Record<VitalSignType, number> {
    const results: Record<VitalSignType, number> = {} as Record<VitalSignType, number>;
    for (const [type, channel] of this.channels.entries()) {
      results[type] = channel.processValue(signal.filteredValue);
    }
    return results;
  }
  
  /**
   * Apply feedback from an algorithm to improve channel processing
   * @param feedback Feedback from algorithm
   */
  public applyFeedback(feedback: ChannelFeedback): void {
    if (!this.enableFeedback) {
      console.warn('OptimizedSignalDistributor: Feedback is disabled');
      return;
    }
    const channel = this.channels.get(feedback.channelId as VitalSignType);
    if (channel) {
      channel.applyFeedback(feedback);
    } else {
      console.warn(`OptimizedSignalDistributor: No channel found for feedback ID ${feedback.channelId}`);
    }
    this.feedbackQueue.push(feedback);
  }
  
  /**
   * Get a specific channel
   * @param type Type of vital sign channel
   * @returns Channel or undefined if not found
   */
  public getChannel(type: VitalSignType): OptimizedSignalChannel | undefined {
    return this.channels.get(type);
  }
  
  /**
   * Reset all channels
   */
  public reset(): void {
    this.channels.forEach(channel => channel.reset());
    this.feedbackQueue = [];
    console.log('OptimizedSignalDistributor: All channels reset');
  }
  
  /**
   * Optimize channels based on collected feedback
   */
  private optimizeChannels(): void {
    if (!this.adaptChannels) {
      console.warn('OptimizedSignalDistributor: Channel adaptation is disabled');
      return;
    }
    if (this.feedbackQueue.length === 0) {
      console.log('OptimizedSignalDistributor: No feedback to process');
      return;
    }
    
    // Basic optimization logic (can be expanded)
    this.channels.forEach(channel => {
      const feedback = this.feedbackQueue.find(fb => fb.channelId === channel.id);
      if (feedback) {
        channel.applyFeedback(feedback);
        console.log(`OptimizedSignalDistributor: Optimized channel ${channel.id} with feedback`);
      }
    });
    
    this.feedbackQueue = [];
    console.log('OptimizedSignalDistributor: Channels optimized');
  }
}
