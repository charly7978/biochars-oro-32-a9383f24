
import { VitalSignType } from '../../types/signal';

/**
 * Signal distributor for routing signal to specialized processors
 */
export class SignalDistributor {
  private channels: Map<VitalSignType, {
    filter: (value: number) => number,
    multiplier: number
  }>;

  constructor() {
    this.channels = new Map();
  }

  /**
   * Add a channel for a specific vital sign type
   */
  addChannel(type: VitalSignType) {
    // Default passthrough filter and multiplier of 1
    const defaultFilter = (value: number) => value;
    
    // Different multipliers for different vital sign types
    let multiplier = 1.0;
    
    switch (type) {
      case VitalSignType.SPO2:
        multiplier = 1.1;
        break;
      case VitalSignType.BLOOD_PRESSURE:
        multiplier = 1.3;
        break;
      case VitalSignType.GLUCOSE:
        multiplier = 0.9;
        break;
      case VitalSignType.HYDRATION:
        multiplier = 1.2;
        break;
      case VitalSignType.CARDIAC:
        multiplier = 1.0;
        break;
      default:
        multiplier = 1.0;
    }
    
    this.channels.set(type, {
      filter: defaultFilter,
      multiplier
    });
  }

  /**
   * Distribute a signal value to all channels
   */
  distributeSignal(value: number): Record<VitalSignType, number> {
    const result: Partial<Record<VitalSignType, number>> = {};
    
    for (const [type, config] of this.channels.entries()) {
      const adjustedValue = config.filter(value) * config.multiplier;
      result[type] = adjustedValue;
    }
    
    // Ensure all vital sign types have a value, even if zero
    Object.values(VitalSignType).forEach(type => {
      if (!(type in result)) {
        result[type as VitalSignType] = 0;
      }
    });
    
    return result as Record<VitalSignType, number>;
  }

  /**
   * Get diagnostics data
   */
  getDiagnostics() {
    return {
      channelCount: this.channels.size,
      channelTypes: Array.from(this.channels.keys()),
      hasChannel: (type: VitalSignType) => this.channels.has(type)
    };
  }
}
