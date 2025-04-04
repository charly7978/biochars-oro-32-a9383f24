/**
 * Diagnostics for signal processing
 */
import { SignalDiagnosticInfo } from './types-unified';

// Define subscriber interface
export interface DiagnosticsSubscriber {
  onDiagnosticUpdate: (info: SignalDiagnosticInfo) => void;
}

export class SignalProcessingDiagnostics {
  private static instance: SignalProcessingDiagnostics;
  
  private diagnosticInfo: SignalDiagnosticInfo[] = [];
  private readonly MAX_DIAGNOSTIC_ENTRIES = 100;
  private subscribers: DiagnosticsSubscriber[] = [];
  private enabled = true;
  private stageHistory: Record<string, SignalDiagnosticInfo[]> = {};
  private performanceMetrics: Record<string, { 
    values: number[],
    avg: number, 
    min: number, 
    max: number,
    current: number 
  }> = {};
  
  private constructor() {
    // Private constructor to prevent direct instantiation
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): SignalProcessingDiagnostics {
    if (!SignalProcessingDiagnostics.instance) {
      SignalProcessingDiagnostics.instance = new SignalProcessingDiagnostics();
    }
    return SignalProcessingDiagnostics.instance;
  }
  
  /**
   * Record diagnostic information
   */
  recordDiagnosticInfo(info: Partial<SignalDiagnosticInfo>): void {
    if (!this.enabled) return;
    
    // Add timestamp if not provided
    const fullInfo: SignalDiagnosticInfo = {
      ...info,
      timestamp: info.timestamp || Date.now(),
      processingStage: info.processingStage || 'unknown',
      validationPassed: info.validationPassed !== undefined ? info.validationPassed : true
    } as SignalDiagnosticInfo;
    
    // Add to diagnostic info array
    this.diagnosticInfo.push(fullInfo);
    
    // Keep by stage
    const stage = fullInfo.processingStage;
    if (!this.stageHistory[stage]) {
      this.stageHistory[stage] = [];
    }
    this.stageHistory[stage].push(fullInfo);
    
    // Track performance metrics if processing time provided
    if (fullInfo.processingTimeMs !== undefined) {
      this.updatePerformanceMetrics(stage, fullInfo.processingTimeMs);
    }
    
    // Trim if too large
    if (this.diagnosticInfo.length > this.MAX_DIAGNOSTIC_ENTRIES) {
      this.diagnosticInfo = this.diagnosticInfo.slice(-this.MAX_DIAGNOSTIC_ENTRIES);
    }
    
    // Trim stage history if too large
    if (this.stageHistory[stage].length > this.MAX_DIAGNOSTIC_ENTRIES/2) {
      this.stageHistory[stage] = this.stageHistory[stage].slice(-Math.floor(this.MAX_DIAGNOSTIC_ENTRIES/2));
    }
    
    // Notify subscribers
    this.notifySubscribers(fullInfo);
  }
  
  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(stage: string, time: number): void {
    if (!this.performanceMetrics[stage]) {
      this.performanceMetrics[stage] = {
        values: [],
        avg: time,
        min: time,
        max: time,
        current: time
      };
    }
    
    const metrics = this.performanceMetrics[stage];
    metrics.values.push(time);
    if (metrics.values.length > 20) {
      metrics.values.shift();
    }
    
    metrics.current = time;
    metrics.min = Math.min(metrics.min, time);
    metrics.max = Math.max(metrics.max, time);
    metrics.avg = metrics.values.reduce((sum, val) => sum + val, 0) / metrics.values.length;
  }
  
  /**
   * Get all diagnostic info
   */
  getDiagnosticInfo(): SignalDiagnosticInfo[] {
    return [...this.diagnosticInfo];
  }
  
  /**
   * Get diagnostic history
   */
  getDiagnosticHistory(): SignalDiagnosticInfo[] {
    return [...this.diagnosticInfo];
  }
  
  /**
   * Get stage history
   */
  getStageHistory(stage: string): SignalDiagnosticInfo[] {
    return this.stageHistory[stage] ? [...this.stageHistory[stage]] : [];
  }
  
  /**
   * Get latest diagnostic
   */
  getLatestDiagnostic(): SignalDiagnosticInfo | null {
    if (this.diagnosticInfo.length === 0) {
      return null;
    }
    
    return this.diagnosticInfo[this.diagnosticInfo.length - 1];
  }
  
  /**
   * Clear diagnostics
   */
  clearDiagnostics(): void {
    this.diagnosticInfo = [];
    this.stageHistory = {};
  }
  
  /**
   * Clear diagnostic data
   */
  clearDiagnosticData(): void {
    this.clearDiagnostics();
    this.performanceMetrics = {};
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Record<string, { avg: number, min: number, max: number, current: number }> {
    const result: Record<string, { avg: number, min: number, max: number, current: number }> = {};
    
    Object.keys(this.performanceMetrics).forEach(key => {
      const metrics = this.performanceMetrics[key];
      result[key] = {
        avg: metrics.avg,
        min: metrics.min,
        max: metrics.max,
        current: metrics.current
      };
    });
    
    return result;
  }
  
  /**
   * Get summary
   */
  getSummary(): {
    totalEntries: number,
    validationPassRate: number,
    avgProcessingTime: number,
    errorsByCode: Record<string, number>
  } {
    if (this.diagnosticInfo.length === 0) {
      return {
        totalEntries: 0,
        validationPassRate: 0,
        avgProcessingTime: 0,
        errorsByCode: {}
      };
    }
    
    const validEntries = this.diagnosticInfo.filter(info => info.validationPassed).length;
    const validationPassRate = validEntries / this.diagnosticInfo.length;
    
    const entriesWithTime = this.diagnosticInfo.filter(info => info.processingTimeMs !== undefined);
    const avgProcessingTime = entriesWithTime.length > 0 
      ? entriesWithTime.reduce((sum, info) => sum + (info.processingTimeMs || 0), 0) / entriesWithTime.length
      : 0;
    
    // Count errors by code
    const errorsByCode: Record<string, number> = {};
    this.diagnosticInfo.forEach(info => {
      if (info.errorCode) {
        errorsByCode[info.errorCode] = (errorsByCode[info.errorCode] || 0) + 1;
      }
    });
    
    return {
      totalEntries: this.diagnosticInfo.length,
      validationPassRate,
      avgProcessingTime,
      errorsByCode
    };
  }
  
  /**
   * Subscribe to diagnostic updates
   */
  subscribe(subscriber: DiagnosticsSubscriber): void {
    this.subscribers.push(subscriber);
  }
  
  /**
   * Unsubscribe from diagnostic updates
   */
  unsubscribe(subscriber: DiagnosticsSubscriber): void {
    this.subscribers = this.subscribers.filter(sub => sub !== subscriber);
  }
  
  /**
   * Notify subscribers of diagnostic update
   */
  private notifySubscribers(info: SignalDiagnosticInfo): void {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.onDiagnosticUpdate(info);
      } catch (error) {
        console.error('Error notifying diagnostics subscriber', error);
      }
    });
  }
  
  /**
   * Enable or disable diagnostics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

/**
 * Get the diagnostics instance
 */
export function getDiagnostics(): SignalProcessingDiagnostics {
  return SignalProcessingDiagnostics.getInstance();
}
