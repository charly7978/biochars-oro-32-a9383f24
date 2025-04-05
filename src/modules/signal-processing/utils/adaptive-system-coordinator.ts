
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * System coordinator for adaptive signal processing systems
 */
import { logError, ErrorLevel } from '@/utils/debugUtils';

// Define message types for the adaptive system
export enum MessageType {
  CONFIG_UPDATE = 'config_update',
  RECALIBRATION_REQUEST = 'recalibration_request',
  QUALITY_UPDATE = 'quality_update',
  SENSITIVITY_UPDATE = 'sensitivity_update',
  THRESHOLD_UPDATE = 'threshold_update',
  RESET_REQUEST = 'reset_request',
  DIAGNOSTICS_REQUEST = 'diagnostics_request'
}

// Define adaptive system message interface
export interface AdaptiveSystemMessage {
  type: MessageType;
  timestamp: number;
  source: string;
  data?: any;
  target?: string;
}

/**
 * Coordinator for adaptive system components
 */
export class AdaptiveSystemCoordinator {
  private systemState: Record<string, any> = {
    quality: 0,
    sensitivity: 1.0,
    thresholds: {},
    calibrationState: 'uncalibrated',
    lastUpdated: Date.now(),
  };
  
  private messageHandlers: Map<MessageType, ((message: AdaptiveSystemMessage) => void)[]> = new Map();
  private components: Set<string> = new Set();
  
  /**
   * Register a component with the coordinator
   */
  public registerComponent(componentId: string): void {
    this.components.add(componentId);
    console.log(`AdaptiveSystem: Component registered: ${componentId}`);
  }
  
  /**
   * Subscribe to message types
   */
  public subscribe(
    messageType: MessageType, 
    handler: (message: AdaptiveSystemMessage) => void
  ): () => void {
    const handlers = this.messageHandlers.get(messageType) || [];
    handlers.push(handler);
    this.messageHandlers.set(messageType, handlers);
    
    return () => {
      const currentHandlers = this.messageHandlers.get(messageType) || [];
      this.messageHandlers.set(
        messageType,
        currentHandlers.filter(h => h !== handler)
      );
    };
  }
  
  /**
   * Send message to the adaptive system
   */
  public sendMessage(message: AdaptiveSystemMessage): void {
    const handlers = this.messageHandlers.get(message.type) || [];
    
    // Broadcast to all handlers
    handlers.forEach(handler => {
      try {
        // Only send to target if specified
        if (message.target && message.target !== handler.name) {
          return;
        }
        
        handler(message);
      } catch (error) {
        logError(
          `Error handling adaptive system message: ${error}`,
          ErrorLevel.ERROR,
          'AdaptiveSystem',
          { messageType: message.type, error }
        );
      }
    });
    
    // Update system state based on message
    this.updateSystemState(message);
  }
  
  /**
   * Update system state based on message
   */
  private updateSystemState(message: AdaptiveSystemMessage): void {
    this.systemState.lastUpdated = Date.now();
    
    switch (message.type) {
      case MessageType.CONFIG_UPDATE:
        if (message.data) {
          this.systemState = {
            ...this.systemState,
            ...message.data
          };
        }
        break;
        
      case MessageType.QUALITY_UPDATE:
        if (message.data && typeof message.data.quality === 'number') {
          this.systemState.quality = message.data.quality;
        }
        break;
        
      case MessageType.SENSITIVITY_UPDATE:
        if (message.data && typeof message.data.sensitivity === 'number') {
          this.systemState.sensitivity = message.data.sensitivity;
        }
        break;
        
      case MessageType.THRESHOLD_UPDATE:
        if (message.data && message.data.thresholds) {
          this.systemState.thresholds = {
            ...this.systemState.thresholds,
            ...message.data.thresholds
          };
        }
        break;
        
      case MessageType.RESET_REQUEST:
        // Reset to default state
        this.systemState = {
          quality: 0,
          sensitivity: 1.0,
          thresholds: {},
          calibrationState: 'uncalibrated',
          lastUpdated: Date.now(),
        };
        
        // Log the reset
        logError(
          'Adaptive system reset requested',
          ErrorLevel.INFO,
          'AdaptiveSystem',
          { timestamp: new Date().toISOString() }
        );
        break;
        
      case MessageType.DIAGNOSTICS_REQUEST:
        // Just log the current state
        logError(
          'Adaptive system diagnostics requested',
          ErrorLevel.INFO,
          'AdaptiveSystem',
          { 
            state: this.systemState,
            components: Array.from(this.components),
            messageHandlers: Array.from(this.messageHandlers.keys()).map(key => key.toString())
          }
        );
        break;
    }
  }
  
  /**
   * Process a value through the adaptive system
   */
  public processValue(value: number, metadata?: any): number {
    // Apply sensitivity scaling
    const sensitivity = this.systemState.sensitivity || 1.0;
    return value * sensitivity;
  }
  
  /**
   * Get current system state
   */
  public getSystemState(): Record<string, any> {
    return { ...this.systemState };
  }
  
  /**
   * Update system configuration
   */
  public updateConfig(config: Record<string, any>): void {
    this.systemState = {
      ...this.systemState,
      ...config,
      lastUpdated: Date.now()
    };
  }
}

/**
 * Get or create the adaptive system coordinator
 */
export function getAdaptiveSystemCoordinator(): AdaptiveSystemCoordinator {
  // Use global to create a singleton
  const globalAny = global as any;
  
  if (!globalAny.__adaptiveSystemCoordinator) {
    globalAny.__adaptiveSystemCoordinator = new AdaptiveSystemCoordinator();
  }
  
  return globalAny.__adaptiveSystemCoordinator;
}
