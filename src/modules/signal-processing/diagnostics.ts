
/**
 * Signal processing diagnostics module
 */

/**
 * Interface for diagnostic events
 */
export interface DiagnosticEvent {
  timestamp: number;
  category: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  data?: any;
}

/**
 * Core diagnostics service
 */
export class SignalProcessingDiagnostics {
  private events: DiagnosticEvent[] = [];
  private subscribers: DiagnosticsSubscriber[] = [];
  private maxEvents: number;
  
  constructor(maxEvents: number = 1000) {
    this.maxEvents = maxEvents;
  }
  
  /**
   * Log a diagnostic event
   */
  public logEvent(event: Omit<DiagnosticEvent, 'timestamp'>): void {
    const fullEvent: DiagnosticEvent = {
      ...event,
      timestamp: Date.now()
    };
    
    this.events.push(fullEvent);
    
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Notify subscribers
    this.subscribers.forEach(sub => sub.onDiagnosticEvent(fullEvent));
  }
  
  /**
   * Get all events
   */
  public getEvents(): DiagnosticEvent[] {
    return [...this.events];
  }
  
  /**
   * Clear all events
   */
  public clearEvents(): void {
    this.events = [];
  }
  
  /**
   * Add a subscriber
   */
  public subscribe(subscriber: DiagnosticsSubscriber): void {
    this.subscribers.push(subscriber);
  }
  
  /**
   * Remove a subscriber
   */
  public unsubscribe(subscriber: DiagnosticsSubscriber): void {
    this.subscribers = this.subscribers.filter(sub => sub !== subscriber);
  }
}

/**
 * Interface for diagnostics subscribers
 */
export interface DiagnosticsSubscriber {
  onDiagnosticEvent(event: DiagnosticEvent): void;
}

/**
 * Singleton instance
 */
const diagnosticsInstance = new SignalProcessingDiagnostics();

export { diagnosticsInstance };
