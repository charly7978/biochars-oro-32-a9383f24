/**
 * Optimized Signal Distributor
 * Distributes incoming signals to specialized channels efficiently
 */
import { ProcessorType } from './types';
import { BloodPressureChannel } from './channels/BloodPressureChannel';
import { CardiacChannel } from './channels/CardiacChannel';
import { GlucoseChannel } from './channels/GlucoseChannel';
import { HydrationChannel } from './channels/HydrationChannel';
import { LipidsChannel } from './channels/LipidsChannel';
import { SpO2Channel } from './channels/SpO2Channel';
import { ChannelConfig } from './channels/SpecializedChannel';

export class OptimizedSignalDistributor {
  private channels: Map<ProcessorType, any> = new Map();
  private bufferSize: number = 100;
  
  /**
   * Initialize all specialized channels
   */
  constructor(bufferSize: number = 100) {
    this.bufferSize = bufferSize;
    this.initializeChannels();
  }
  
  /**
   * Initialize all specialized channels
   */
  private initializeChannels(): void {
    // Create and initialize all channels with appropriate configurations
    this.createCardiacChannel();
    this.createSpO2Channel();
    this.createBloodPressureChannel();
    this.createGlucoseChannel();
    this.createLipidsChannel();
    this.createHydrationChannel();
  }
  
  /**
   * Create and initialize the cardiac channel
   */
  private createCardiacChannel(): void {
    const config: ChannelConfig = {
      name: "cardiac",
      type: ProcessorType.HEARTBEAT,
      bufferSize: this.bufferSize,
      filterStrength: 0.6
    };
    
    this.channels.set(ProcessorType.HEARTBEAT, new CardiacChannel(config));
  }
  
  /**
   * Create and initialize the SpO2 channel
   */
  private createSpO2Channel(): void {
    const config: ChannelConfig = {
      name: "spo2",
      type: ProcessorType.SPO2,
      bufferSize: this.bufferSize,
      filterStrength: 0.5
    };
    
    this.channels.set(ProcessorType.SPO2, new SpO2Channel(config));
  }
  
  /**
   * Create and initialize the blood pressure channel
   */
  private createBloodPressureChannel(): void {
    const config: ChannelConfig = {
      name: "blood-pressure",
      type: ProcessorType.PRESSURE,
      bufferSize: this.bufferSize,
      filterStrength: 0.55
    };
    
    this.channels.set(ProcessorType.PRESSURE, new BloodPressureChannel(config));
  }
  
  /**
   * Create and initialize the glucose channel
   */
  private createGlucoseChannel(): void {
    const config: ChannelConfig = {
      name: "glucose",
      type: ProcessorType.GLUCOSE,
      bufferSize: this.bufferSize,
      filterStrength: 0.7
    };
    
    this.channels.set(ProcessorType.GLUCOSE, new GlucoseChannel(config));
  }
  
  /**
   * Create and initialize the lipids channel
   */
  private createLipidsChannel(): void {
    const config: ChannelConfig = {
      name: "lipids",
      type: ProcessorType.LIPIDS,
      bufferSize: this.bufferSize,
      filterStrength: 0.65
    };
    
    this.channels.set(ProcessorType.LIPIDS, new LipidsChannel(config));
  }
  
  /**
   * Create and initialize the hydration channel
   */
  private createHydrationChannel(): void {
    const config: ChannelConfig = {
      name: "hydration",
      type: ProcessorType.HYDRATION,
      bufferSize: this.bufferSize,
      filterStrength: 0.6
    };
    
    this.channels.set(ProcessorType.HYDRATION, new HydrationChannel(config));
  }
  
  /**
   * Distribute incoming signal to the appropriate channel
   */
  public distributeSignal(type: ProcessorType, value: number): number {
    const channel = this.channels.get(type);
    if (!channel) {
      console.warn(`No channel found for type: ${type}`);
      return value;
    }
    
    return channel.processSignal(value);
  }
  
  /**
   * Apply feedback from vital sign algorithms to adjust signal processing
   */
  public applyFeedback(type: ProcessorType, feedback: any): void {
    const channel = this.channels.get(type);
    if (!channel || typeof channel.applyFeedback !== 'function') {
      console.warn(`No channel or applyFeedback method found for type: ${type}`);
      return;
    }
    
    channel.applyFeedback(feedback);
  }
  
  /**
   * Get the quality of a specific channel
   */
  public getChannelQuality(type: ProcessorType): number {
    const channel = this.channels.get(type);
    if (!channel || typeof channel.getQuality !== 'function') {
      console.warn(`No channel or getQuality method found for type: ${type}`);
      return 0;
    }
    
    return channel.getQuality();
  }
  
  /**
   * Reset a specific channel
   */
  public resetChannel(type: ProcessorType): void {
    const channel = this.channels.get(type);
    if (!channel || typeof channel.reset !== 'function') {
      console.warn(`No channel or reset method found for type: ${type}`);
      return;
    }
    
    channel.reset();
  }
  
  /**
   * Reset all channels
   */
  public resetAllChannels(): void {
    for (const channel of this.channels.values()) {
      if (typeof channel.reset === 'function') {
        channel.reset();
      }
    }
  }
}
