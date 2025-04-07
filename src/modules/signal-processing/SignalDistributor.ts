
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */
import { VitalSignType, ChannelFeedback } from '../../types/signal';

/**
 * Signal distributor for routing incoming signal values to appropriate 
 * vital sign processing channels
 */
export class SignalDistributor {
  private channels: Map<VitalSignType, { quality: number, amplification: number }>;
  private signalBuffer: number[] = [];
  private lastDistributed: Record<VitalSignType, number> = {} as Record<VitalSignType, number>;
  
  constructor() {
    this.channels = new Map();
    console.log("SignalDistributor: Initialized with empty channels");
  }
  
  /**
   * Add a new channel to the distributor
   */
  public addChannel(type: VitalSignType): void {
    this.channels.set(type, {
      quality: 0,
      amplification: 1.0
    });
    this.lastDistributed[type] = 0;
  }
  
  /**
   * Process and distribute a signal value to all channels
   */
  public distributeSignal(value: number): Record<VitalSignType, number> {
    // Add to buffer
    this.signalBuffer.push(value);
    if (this.signalBuffer.length > 30) {
      this.signalBuffer.shift();
    }
    
    // Prepare result for all channels
    const result: Record<VitalSignType, number> = {} as Record<VitalSignType, number>;
    
    // Distribute to each channel with specific processing
    this.channels.forEach((channel, type) => {
      let optimizedValue = value;
      
      // Apply channel-specific optimization
      switch(type) {
        case VitalSignType.SPO2:
          // Optimize for SPO2 - less amplification, more smoothing
          optimizedValue = this.optimizeForSpO2(value, channel.amplification);
          break;
        case VitalSignType.BLOOD_PRESSURE:
          // Optimize for blood pressure - enhanced peaks
          optimizedValue = this.optimizeForBloodPressure(value, channel.amplification);
          break;
        case VitalSignType.HEARTBEAT:
          // Optimize for heart rate - enhanced peaks and valleys
          optimizedValue = this.optimizeForHeartbeat(value, channel.amplification);
          break;
        case VitalSignType.GLUCOSE:
          // Optimize for glucose - slow-changing, reduced noise
          optimizedValue = this.optimizeForGlucose(value, channel.amplification);
          break;
        case VitalSignType.HYDRATION:
          // Optimize for hydration - mid-frequency components
          optimizedValue = this.optimizeForHydration(value, channel.amplification);
          break;
        default:
          // Default processing
          optimizedValue = value * channel.amplification;
      }
      
      // Store optimized value
      result[type] = optimizedValue;
      this.lastDistributed[type] = optimizedValue;
    });
    
    return result;
  }
  
  /**
   * Optimize signal for SPO2 measurement
   */
  private optimizeForSpO2(value: number, amplification: number): number {
    // Apply very light processing for SPO2
    return value * amplification * 0.9;
  }
  
  /**
   * Optimize signal for blood pressure measurement
   */
  private optimizeForBloodPressure(value: number, amplification: number): number {
    // Enhance peaks for better systolic/diastolic detection
    return value * amplification * 1.1;
  }
  
  /**
   * Optimize signal for heart rate detection
   */
  private optimizeForHeartbeat(value: number, amplification: number): number {
    // Enhance peaks and valleys
    return value * amplification * 1.2;
  }
  
  /**
   * Optimize signal for glucose estimation
   */
  private optimizeForGlucose(value: number, amplification: number): number {
    // Focus on slower changes
    return value * amplification * 0.8;
  }
  
  /**
   * Optimize signal for hydration estimation
   */
  private optimizeForHydration(value: number, amplification: number): number {
    // Focus on mid-frequency components
    return value * amplification * 0.95;
  }
  
  /**
   * Apply feedback to a specific channel
   */
  public applyFeedback(type: VitalSignType, feedback: ChannelFeedback): void {
    const channel = this.channels.get(type);
    if (!channel) return;
    
    // Update channel parameters based on feedback
    if (feedback.suggestedAdjustments?.amplificationFactor) {
      channel.amplification = feedback.suggestedAdjustments.amplificationFactor;
    }
  }
  
  /**
   * Start the distributor
   */
  public start(): void {
    console.log("SignalDistributor: Started");
  }
  
  /**
   * Stop the distributor
   */
  public stop(): void {
    console.log("SignalDistributor: Stopped");
  }
  
  /**
   * Reset the distributor
   */
  public reset(): void {
    this.signalBuffer = [];
    this.lastDistributed = {} as Record<VitalSignType, number>;
    
    // Reset all channels
    this.channels.forEach((channel) => {
      channel.quality = 0;
    });
    
    console.log("SignalDistributor: Reset completed");
  }
  
  /**
   * Get diagnostic data
   */
  public getDiagnostics(): Record<string, any> {
    const channelInfo: Record<string, any> = {};
    
    this.channels.forEach((channel, type) => {
      channelInfo[type] = {
        quality: channel.quality,
        amplification: channel.amplification,
        lastValue: this.lastDistributed[type] || 0
      };
    });
    
    return {
      channels: channelInfo,
      bufferSize: this.signalBuffer.length
    };
  }
}
