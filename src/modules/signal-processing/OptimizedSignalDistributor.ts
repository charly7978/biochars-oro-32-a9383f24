
import { OptimizedChannel, SignalProcessingOptions, ChannelConfig } from './types';
import { VitalSignType, ChannelFeedback } from '../../types/signal';
import { CardiacChannel } from './channels/CardiacChannel';
import { SpO2Channel } from './channels/SpO2Channel';
import { BloodPressureChannel } from './channels/BloodPressureChannel';
import { GlucoseChannel } from './channels/GlucoseChannel';
import { LipidsChannel } from './channels/LipidsChannel';
import { OptimizedSignalChannel } from './channels/SpecializedChannel';

export class OptimizedSignalDistributor {
  private channels: Map<string, OptimizedChannel>;
  private isProcessing: boolean = false;
  private lastProcessedValue: number = 0;
  private processingOptions: SignalProcessingOptions;
  
  constructor() {
    this.channels = new Map();
    this.processingOptions = {
      amplificationFactor: 1.5,
      filterStrength: 0.7,
      qualityThreshold: 0.6,
      fingerDetectionSensitivity: 0.5,
      useAdaptiveControl: true,
      qualityEnhancedByPrediction: true
    };
    
    this.initializeDefaultChannels();
  }
  
  private initializeDefaultChannels(): void {
    // Create a default config
    const defaultConfig: ChannelConfig = {
      amplificationFactor: this.processingOptions.amplificationFactor || 1.5,
      filterStrength: this.processingOptions.filterStrength || 0.7,
      qualityThreshold: this.processingOptions.qualityThreshold || 0.6
    };
    
    // Initialize standard channels
    this.addChannel(VitalSignType.CARDIAC, new CardiacChannel(defaultConfig));
    this.addChannel(VitalSignType.SPO2, new SpO2Channel(defaultConfig));
    this.addChannel(VitalSignType.BLOOD_PRESSURE, new BloodPressureChannel(defaultConfig));
    this.addChannel(VitalSignType.GLUCOSE, new GlucoseChannel(defaultConfig));
    this.addChannel(VitalSignType.LIPIDS, new LipidsChannel(defaultConfig));
  }
  
  addChannel(type: string, channel: OptimizedChannel): void {
    this.channels.set(type, channel);
  }
  
  removeChannel(type: string): boolean {
    return this.channels.delete(type);
  }
  
  getChannel(type: string): OptimizedChannel | undefined {
    return this.channels.get(type);
  }
  
  getAllChannels(): Map<string, OptimizedChannel> {
    return this.channels;
  }
  
  processValue(value: number): Map<string, number> {
    if (!this.isProcessing) {
      return new Map();
    }
    
    this.lastProcessedValue = value;
    
    const results = new Map<string, number>();
    
    this.channels.forEach((channel, type) => {
      try {
        // Use helper method for safety
        const processedValue = this.safelyProcessValue(channel, value);
        results.set(type, processedValue);
      } catch (error) {
        console.error(`Error processing value in channel ${type}:`, error);
        results.set(type, 0);
      }
    });
    
    return results;
  }
  
  private safelyProcessValue(channel: OptimizedChannel, value: number): number {
    if (typeof channel.processValue === 'function') {
      return channel.processValue(value);
    }
    return value; // Fallback if method doesn't exist
  }
  
  configure(options: SignalProcessingOptions): void {
    this.processingOptions = {
      ...this.processingOptions,
      ...options
    };
    
    // Update all channels with new configuration
    this.channels.forEach(channel => {
      if (typeof channel.configure === 'function') {
        channel.configure({
          amplificationFactor: this.processingOptions.amplificationFactor,
          filterStrength: this.processingOptions.filterStrength,
          qualityThreshold: this.processingOptions.qualityThreshold
        });
      }
    });
  }
  
  reset(): void {
    this.channels.forEach(channel => {
      if (typeof channel.reset === 'function') {
        channel.reset();
      }
    });
    
    this.lastProcessedValue = 0;
  }
  
  // Add required methods
  start(): void {
    this.isProcessing = true;
  }
  
  stop(): void {
    this.isProcessing = false;
  }
  
  applyFeedback(feedback: ChannelFeedback, channelType: string): void {
    const channel = this.getChannel(channelType);
    if (channel && typeof channel.configure === 'function') {
      // Apply feedback to channel configuration
      channel.configure({
        amplificationFactor: this.processingOptions.amplificationFactor,
        filterStrength: this.processingOptions.filterStrength,
        qualityThreshold: this.processingOptions.qualityThreshold,
        // Add feedback-specific adjustments if needed
      });
    }
  }
  
  getDiagnostics(): any {
    // Return diagnostic info from all channels
    const diagnostics: any = {
      distributorInfo: {
        channelCount: this.channels.size,
        isProcessing: this.isProcessing,
        lastProcessedValue: this.lastProcessedValue
      },
      channelDiagnostics: {}
    };
    
    this.channels.forEach((channel, type) => {
      diagnostics.channelDiagnostics[type] = {
        channelType: type,
        // Add channel-specific diagnostics if available
      };
    });
    
    return diagnostics;
  }
}
