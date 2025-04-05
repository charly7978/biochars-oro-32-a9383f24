
/**
 * Signal distributor for routing PPG signals to specialized processors
 */

import { VitalSignType } from '../../types/signal';

interface ChannelConfig {
  gain: number;
  frequencyRange: [number, number];
  enabled: boolean;
}

export class SignalDistributor {
  private channels: Map<VitalSignType, ChannelConfig> = new Map();
  private lastValues: Map<VitalSignType, number> = new Map();
  
  constructor() {
    console.log("SignalDistributor: Initialized");
  }

  /**
   * Add a signal processing channel
   */
  public addChannel(type: VitalSignType, config?: Partial<ChannelConfig>): void {
    const defaultConfig: ChannelConfig = {
      gain: 1.0,
      frequencyRange: [0.5, 10],
      enabled: true
    };

    this.channels.set(type, {
      ...defaultConfig,
      ...config
    });

    this.lastValues.set(type, 0);
    console.log(`SignalDistributor: Added channel for ${type}`);
  }

  /**
   * Remove a signal processing channel
   */
  public removeChannel(type: VitalSignType): void {
    this.channels.delete(type);
    this.lastValues.delete(type);
    console.log(`SignalDistributor: Removed channel for ${type}`);
  }

  /**
   * Enable a specific channel
   */
  public enableChannel(type: VitalSignType): void {
    const channel = this.channels.get(type);
    if (channel) {
      channel.enabled = true;
      this.channels.set(type, channel);
    }
  }

  /**
   * Disable a specific channel
   */
  public disableChannel(type: VitalSignType): void {
    const channel = this.channels.get(type);
    if (channel) {
      channel.enabled = false;
      this.channels.set(type, channel);
    }
  }

  /**
   * Distribute a signal value to all channels
   */
  public distributeSignal(value: number): Record<VitalSignType, number> {
    const result: Record<VitalSignType, number> = {} as Record<VitalSignType, number>;
    
    // Process each channel
    this.channels.forEach((config, type) => {
      if (config.enabled) {
        // Apply channel-specific processing
        const processedValue = value * config.gain;
        this.lastValues.set(type, processedValue);
        result[type] = processedValue;
      } else {
        result[type] = 0;
      }
    });

    return result;
  }

  /**
   * Get diagnostics information
   */
  public getDiagnostics(): any {
    const channelInfo: Record<string, any> = {};
    
    this.channels.forEach((config, type) => {
      channelInfo[type] = {
        enabled: config.enabled,
        gain: config.gain,
        frequencyRange: config.frequencyRange,
        lastValue: this.lastValues.get(type) || 0
      };
    });

    return {
      channelCount: this.channels.size,
      channels: channelInfo
    };
  }
}
