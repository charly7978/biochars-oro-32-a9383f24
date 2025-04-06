
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Optimized Signal Distributor
 * Central hub for signal validation and distribution to specialized channels
 */
import { OptimizedSignalChannel, ChannelFeedback, VitalSignType } from '../../types/signal';
import { getSignalBus, SignalType, SignalPriority, ProcessedPPGSignal, createValidatedSignal } from './SignalBus';
import { validateSignalData } from './signal-validator';

/**
 * Optimized Signal Distributor
 * Central validator for all signal processing
 * Ensures unidirectional data flow through the system
 */
export class OptimizedSignalDistributor {
  private channels: Map<VitalSignType, OptimizedSignalChannel> = new Map();
  private isRunning: boolean = false;
  private signalBus = getSignalBus();
  private signalCounter: number = 0;
  private distributorId: string = `distributor-${Date.now().toString(36)}`;
  private unsubscribeFn: (() => void) | null = null;
  
  /**
   * Constructor
   */
  constructor() {
    console.log('OptimizedSignalDistributor: Initializing central validator and distributor');
  }
  
  /**
   * Register a channel for a specific vital sign
   */
  public registerChannel(type: VitalSignType, channel: OptimizedSignalChannel): void {
    this.channels.set(type, channel);
    console.log(`OptimizedSignalDistributor: Registered channel for ${type}`);
  }
  
  /**
   * Start the distributor
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Subscribe to PPG signals
    this.unsubscribeFn = this.signalBus.subscribe<ProcessedPPGSignal>(
      SignalType.PPG_SIGNAL,
      this.handlePPGSignal.bind(this)
    );
    
    console.log('OptimizedSignalDistributor: Started processing signals');
  }
  
  /**
   * Stop the distributor
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    // Unsubscribe from signal bus
    if (this.unsubscribeFn) {
      this.unsubscribeFn();
      this.unsubscribeFn = null;
    }
    
    console.log('OptimizedSignalDistributor: Stopped processing signals');
  }
  
  /**
   * Reset the distributor and all channels
   */
  public reset(): void {
    this.stop();
    
    // Reset all channels
    this.channels.forEach((channel, type) => {
      console.log(`OptimizedSignalDistributor: Resetting channel for ${type}`);
      channel.reset();
    });
    
    this.signalCounter = 0;
    console.log('OptimizedSignalDistributor: Reset complete');
  }
  
  /**
   * Handle incoming PPG signals
   */
  private handlePPGSignal(signal: ProcessedPPGSignal): void {
    if (!this.isRunning) {
      return;
    }
    
    try {
      // Validate the signal
      const validationResult = validateSignalData([signal.filteredValue]);
      
      if (!validationResult.isValid) {
        console.log('OptimizedSignalDistributor: Invalid signal rejected', validationResult.reason);
        return;
      }
      
      // Generate a validation ID
      const validationId = `v-${this.distributorId}-${this.signalCounter++}`;
      
      // Create a validated signal
      const validatedSignal = createValidatedSignal(signal, validationId);
      
      // Publish the validated signal
      this.signalBus.publish(validatedSignal);
      
      // Process signal for each channel
      this.channels.forEach((channel, type) => {
        try {
          // Optimize the signal for this specific channel
          const optimizedValue = this.optimizeSignalForChannel(signal, type);
          
          // Process the optimized value through the channel
          channel.processValue(optimizedValue);
        } catch (err) {
          console.error(`OptimizedSignalDistributor: Error in channel ${type}:`, err);
        }
      });
    } catch (err) {
      console.error('OptimizedSignalDistributor: Error processing signal:', err);
    }
  }
  
  /**
   * Process a signal directly (legacy method)
   */
  public processSignal(signal: ProcessedPPGSignal): Record<VitalSignType, number> {
    if (!this.isRunning) {
      return this.createEmptyResult();
    }
    
    // Validate the signal
    const validationResult = validateSignalData([signal.filteredValue]);
    
    if (!validationResult.isValid || !signal.fingerDetected) {
      return this.createEmptyResult();
    }
    
    const result: Record<VitalSignType, number> = {} as Record<VitalSignType, number>;
    
    // Process signal for each channel
    this.channels.forEach((channel, type) => {
      try {
        // Optimize the signal for this specific channel
        const optimizedValue = this.optimizeSignalForChannel(signal, type);
        
        // Process the optimized value through the channel
        result[type] = channel.processValue(optimizedValue);
      } catch (err) {
        console.error(`OptimizedSignalDistributor: Error in channel ${type}:`, err);
        result[type] = 0;
      }
    });
    
    return result;
  }
  
  /**
   * Create an empty result object
   */
  private createEmptyResult(): Record<VitalSignType, number> {
    const result: Record<VitalSignType, number> = {} as Record<VitalSignType, number>;
    
    Object.values(VitalSignType).forEach(type => {
      result[type as VitalSignType] = 0;
    });
    
    return result;
  }
  
  /**
   * Apply feedback from a channel
   */
  public applyFeedback(feedback: ChannelFeedback): void {
    if (!this.isRunning) {
      return;
    }
    
    console.log(`OptimizedSignalDistributor: Received feedback for ${feedback.channelType}`, {
      qualityFactor: feedback.qualityFactor,
      optimizationHint: feedback.optimizationHint
    });
    
    // Store feedback for future optimizations
    // Note: Implementation details would go here
  }
  
  /**
   * Get diagnostics information
   */
  public getDiagnostics(): any {
    const channelDiagnostics: Record<string, any> = {};
    
    this.channels.forEach((channel, type) => {
      if (typeof channel.getDiagnostics === 'function') {
        channelDiagnostics[type] = channel.getDiagnostics();
      }
    });
    
    return {
      isRunning: this.isRunning,
      channelCount: this.channels.size,
      processedSignals: this.signalCounter,
      channelDiagnostics
    };
  }
  
  /**
   * Optimize a signal for a specific channel
   */
  private optimizeSignalForChannel(signal: ProcessedPPGSignal, channelType: VitalSignType): number {
    // Apply channel-specific optimizations to the signal
    switch (channelType) {
      case VitalSignType.GLUCOSE:
        // Glucose channel needs smoothed signal
        return signal.filteredValue;
        
      case VitalSignType.LIPIDS:
        // Lipids channel can use raw signal with normalization
        return signal.rawValue;
        
      case VitalSignType.BLOOD_PRESSURE:
        // Blood pressure channel needs amplified signal
        return signal.amplifiedValue * 1.2;
        
      case VitalSignType.SPO2:
        // SpO2 channel uses filtered value 
        return signal.filteredValue;
        
      case VitalSignType.CARDIAC:
        // Cardiac channel uses amplified signal
        return signal.amplifiedValue;
        
      case VitalSignType.HYDRATION:
        // Hydration channel uses filtered value with slight amplification
        return signal.filteredValue * 1.1;
        
      default:
        // Default to filtered value
        return signal.filteredValue;
    }
  }
}
