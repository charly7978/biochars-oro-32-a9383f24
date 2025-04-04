
/**
 * Diagnostics for signal processing
 */
import { SignalDiagnosticInfo } from '../../types/signal';

export class SignalProcessingDiagnostics {
  private diagnosticInfo: SignalDiagnosticInfo[] = [];
  private readonly MAX_DIAGNOSTIC_ENTRIES = 100;
  
  recordDiagnosticInfo(info: Partial<SignalDiagnosticInfo>): void {
    // Add timestamp if not provided
    if (!info.timestamp) {
      info.timestamp = Date.now();
    }
    
    // Add to diagnostic info array
    this.diagnosticInfo.push(info as SignalDiagnosticInfo);
    
    // Trim if too large
    if (this.diagnosticInfo.length > this.MAX_DIAGNOSTIC_ENTRIES) {
      this.diagnosticInfo = this.diagnosticInfo.slice(-this.MAX_DIAGNOSTIC_ENTRIES);
    }
  }
  
  getDiagnosticInfo(): SignalDiagnosticInfo[] {
    return [...this.diagnosticInfo];
  }
  
  getLatestDiagnostic(): SignalDiagnosticInfo | null {
    if (this.diagnosticInfo.length === 0) {
      return null;
    }
    
    return this.diagnosticInfo[this.diagnosticInfo.length - 1];
  }
  
  clearDiagnostics(): void {
    this.diagnosticInfo = [];
  }
  
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
}

// Singleton instance for app-wide use
let diagnosticsInstance: SignalProcessingDiagnostics | null = null;

export function getDiagnostics(): SignalProcessingDiagnostics {
  if (!diagnosticsInstance) {
    diagnosticsInstance = new SignalProcessingDiagnostics();
  }
  
  return diagnosticsInstance;
}
