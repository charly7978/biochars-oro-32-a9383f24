
/**
 * Signal distributor for the modular vital signs processor
 * Manages and routes signals to specialized processors
 */

import { VitalSignType } from '../../types/signal';

export class SignalDistributor {
  private channels: Map<VitalSignType, number> = new Map();
  private baseGain: number = 1.0;
  
  constructor() {
    console.log("SignalDistributor: Initialized");
  }
  
  /**
   * Add a channel for signal distribution
   */
  addChannel(type: VitalSignType): void {
    this.channels.set(type, 1.0); // Default gain
    console.log(`SignalDistributor: Added channel ${type}`);
  }
  
  /**
   * Set gain for a specific channel
   */
  setChannelGain(type: VitalSignType, gain: number): void {
    if (!this.channels.has(type)) {
      this.addChannel(type);
    }
    this.channels.set(type, gain);
  }
  
  /**
   * Set base gain for all channels
   */
  setBaseGain(gain: number): void {
    this.baseGain = gain;
  }
  
  /**
   * Distribute a signal value to all channels
   */
  distributeSignal(value: number): Record<VitalSignType, number> {
    const results: Partial<Record<VitalSignType, number>> = {};
    
    // Apply base gain and channel-specific gain
    for (const [type, gain] of this.channels.entries()) {
      results[type] = value * this.baseGain * gain;
    }
    
    return results as Record<VitalSignType, number>;
  }
  
  /**
   * Start the distributor
   */
  start(): void {
    console.log("SignalDistributor: Started");
  }
  
  /**
   * Stop the distributor
   */
  stop(): void {
    console.log("SignalDistributor: Stopped");
  }
  
  /**
   * Reset the distributor
   */
  reset(): void {
    for (const type of this.channels.keys()) {
      this.channels.set(type, 1.0); // Reset to default gain
    }
    console.log("SignalDistributor: Reset");
  }
  
  /**
   * Get diagnostics information
   */
  getDiagnostics(): any {
    const channelInfo: Record<string, number> = {};
    for (const [type, gain] of this.channels.entries()) {
      channelInfo[type] = gain;
    }
    
    return {
      channelCount: this.channels.size,
      baseGain: this.baseGain,
      channels: channelInfo
    };
  }
}
