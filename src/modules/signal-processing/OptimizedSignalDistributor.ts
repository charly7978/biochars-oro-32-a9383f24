
/**
 * Signal Distributor
 * Distributes incoming signals to specialized processing channels
 */

import { ChannelConfig, OptimizedSignalChannel } from './channels/SpecializedChannel';
import { CardiacChannel } from './channels/CardiacChannel';
import { SpO2Channel } from './channels/SpO2Channel';
import { BloodPressureChannel } from './channels/BloodPressureChannel';
import { GlucoseChannel } from './channels/GlucoseChannel';
import { LipidsChannel } from './channels/LipidsChannel';
import { VitalSignType } from '../../types/signal';

/**
 * Result from signal distribution
 */
export interface DistributedSignalResult {
  cardiac: number;
  spo2: number;
  bloodPressure: number;
  glucose: number;
  lipids: number;
  timestamp: number;
  rawValue: number;
}

/**
 * Distributor class for optimized signal processing
 * Takes a raw signal and distributes it to specialized channels
 */
export class OptimizedSignalDistributor {
  private channels: Map<VitalSignType, OptimizedSignalChannel> = new Map();
  private enabled: boolean = true;
  private signalCount: number = 0;
  
  constructor(config: ChannelConfig = {}) {
    this.initializeChannels(config);
  }
  
  /**
   * Initialize all specialized channels
   */
  private initializeChannels(config: ChannelConfig): void {
    // Create cardiac channel
    this.addChannel(new CardiacChannel(config) as unknown as OptimizedSignalChannel);
    
    // Create SpO2 channel
    this.addChannel(new SpO2Channel(config) as unknown as OptimizedSignalChannel);
    
    // Create blood pressure channel
    this.addChannel(new BloodPressureChannel(config) as unknown as OptimizedSignalChannel);
    
    // Create glucose channel
    this.addChannel(new GlucoseChannel(config) as unknown as OptimizedSignalChannel);
    
    // Create lipids channel
    this.addChannel(new LipidsChannel(config) as unknown as OptimizedSignalChannel);
  }
  
  /**
   * Add a channel to the distributor
   */
  private addChannel(channel: OptimizedSignalChannel): void {
    this.channels.set(channel.type, channel);
  }
  
  /**
   * Process a signal value and distribute to all channels
   */
  public processSignal(value: number): DistributedSignalResult {
    if (!this.enabled) {
      return this.createEmptyResult(value);
    }
    
    this.signalCount++;
    const timestamp = Date.now();
    
    // Process the raw signal through each channel
    const cardiacValue = this.processChannel(VitalSignType.CARDIAC, value);
    const spo2Value = this.processChannel(VitalSignType.SPO2, value);
    const bloodPressureValue = this.processChannel(VitalSignType.BLOOD_PRESSURE, value);
    const glucoseValue = this.processChannel(VitalSignType.GLUCOSE, value);
    const lipidsValue = this.processChannel(VitalSignType.LIPIDS, value);
    
    // Return combined result
    return {
      cardiac: cardiacValue,
      spo2: spo2Value,
      bloodPressure: bloodPressureValue,
      glucose: glucoseValue,
      lipids: lipidsValue,
      timestamp,
      rawValue: value
    };
  }
  
  /**
   * Process a value through a specific channel
   */
  private processChannel(type: VitalSignType, value: number): number {
    const channel = this.channels.get(type);
    if (!channel) {
      return value;
    }
    
    return channel.processValue(value);
  }
  
  /**
   * Create an empty result when the distributor is disabled
   */
  private createEmptyResult(value: number): DistributedSignalResult {
    return {
      cardiac: value,
      spo2: value,
      bloodPressure: value,
      glucose: value,
      lipids: value,
      timestamp: Date.now(),
      rawValue: value
    };
  }
  
  /**
   * Enable or disable the distributor
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Reset all channels
   */
  public reset(): void {
    this.channels.forEach(channel => {
      channel.reset();
    });
    this.signalCount = 0;
  }
  
  /**
   * Configure all channels
   */
  public configure(config: ChannelConfig): void {
    this.channels.forEach(channel => {
      channel.configure(config);
    });
  }
  
  /**
   * Get the number of signals processed
   */
  public getSignalCount(): number {
    return this.signalCount;
  }
}
