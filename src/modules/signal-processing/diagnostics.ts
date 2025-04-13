/**
 * Diagnostics tools for signal processing
 */
import { SignalDiagnosticInfo } from '../../types/signal';

/**
 * Global diagnostics store
 */
const diagnosticsStore: {
  infos: SignalDiagnosticInfo[];
  maxEntries: number;
} = {
  infos: [],
  maxEntries: 500
};

/**
 * Create diagnostic information for signal processing
 */
export function createDiagnosticInfo(
  stage: string, 
  validationPassed: boolean, 
  metrics?: Record<string, any>
): SignalDiagnosticInfo {
  return {
    processingStage: stage,
    validationPassed,
    timestamp: Date.now(),
    ...(metrics || {})
  };
}

/**
 * Log diagnostic information
 */
export function logDiagnostics(info: SignalDiagnosticInfo): void {
  diagnosticsStore.infos.push(info);
  
  // Keep the size bounded
  if (diagnosticsStore.infos.length > diagnosticsStore.maxEntries) {
    diagnosticsStore.infos = diagnosticsStore.infos.slice(-diagnosticsStore.maxEntries);
  }
}

/**
 * Get all stored diagnostic information
 */
export function getDiagnostics(): SignalDiagnosticInfo[] {
  return [...diagnosticsStore.infos];
}

/**
 * Get the most recent diagnostic information
 */
export function getLatestDiagnostics(count: number = 10): SignalDiagnosticInfo[] {
  return diagnosticsStore.infos.slice(-count);
}

/**
 * Get diagnostic information for a specific stage
 */
export function getDiagnosticsForStage(stage: string): SignalDiagnosticInfo[] {
  return diagnosticsStore.infos.filter(info => info.processingStage.includes(stage));
}

/**
 * Clear all diagnostic information
 */
export function clearDiagnostics(): void {
  diagnosticsStore.infos = [];
}

/**
 * Signal processing diagnostics singleton
 */
class SignalProcessingDiagnostics {
  private readonly maxHistorySize: number;
  
  constructor(maxHistorySize: number = 500) {
    this.maxHistorySize = maxHistorySize;
  }
  
  /**
   * Record diagnostic information
   */
  public recordDiagnosticInfo(info: SignalDiagnosticInfo): void {
    // Add timestamp if not present
    if (!info.timestamp) {
      info.timestamp = Date.now();
    }
    
    logDiagnostics(info);
  }
  
  /**
   * Get all diagnostic information
   */
  public getAllDiagnosticInfo(): SignalDiagnosticInfo[] {
    return getDiagnostics();
  }
  
  /**
   * Get recent diagnostic information
   */
  public getRecentDiagnosticInfo(count: number = 10): SignalDiagnosticInfo[] {
    return getLatestDiagnostics(count);
  }
  
  /**
   * Clear all diagnostic information
   */
  public clearDiagnosticInfo(): void {
    clearDiagnostics();
  }
}

/**
 * Singleton instance
 */
const diagnosticsInstance = new SignalProcessingDiagnostics();

/**
 * Get the diagnostics instance
 */
export function getDiagnosticsInstance(): SignalProcessingDiagnostics {
  return diagnosticsInstance;
}
