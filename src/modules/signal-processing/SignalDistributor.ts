
import { VitalSignType } from '../../types/signal';

/**
 * Simple signal distributor implementation
 * Used by ModularVitalSignsProcessor
 */
export class SignalDistributor {
  private channels: VitalSignType[] = [];

  /**
   * Add a channel to the distributor
   */
  public addChannel(channelType: VitalSignType): void {
    if (!this.channels.includes(channelType)) {
      this.channels.push(channelType);
    }
  }

  /**
   * Distribute a signal value to all registered channels
   */
  public distributeSignal(value: number): Record<VitalSignType, number> {
    const result: Record<VitalSignType, number> = {} as Record<VitalSignType, number>;

    // Distribute the same value to all channels
    this.channels.forEach(channel => {
      result[channel] = value;
    });

    return result;
  }

  /**
   * Get diagnostics information
   */
  public getDiagnostics(): any {
    return {
      activeChannels: this.channels,
      distribution: "direct" // Direct distribution mode (no simulation)
    };
  }
}
