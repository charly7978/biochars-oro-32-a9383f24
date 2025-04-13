
/**
 * Error Monitoring Service
 * Centralized error tracking, reporting and analytics
 */
import { TypeScriptWatchdog, TypeScriptError, TypeScriptErrorType } from './typescript-watchdog';
import { errorRecovery, RecoveryStrategy } from './error-recovery-service';
import { logDiagnostics } from '../signal-processing/diagnostics';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error source categories
 */
export enum ErrorSource {
  TYPESCRIPT = 'typescript',
  SIGNAL_PROCESSING = 'signal_processing',
  VITAL_SIGNS = 'vital_signs',
  DATA_TRANSFORMATION = 'data_transformation',
  CALIBRATION = 'calibration',
  USER_INPUT = 'user_input',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

/**
 * Error report structure
 */
export interface ErrorReport {
  id: string;
  errorCode: string;
  message: string;
  timestamp: number;
  source: ErrorSource;
  severity: ErrorSeverity;
  componentName?: string;
  stackTrace?: string;
  context?: Record<string, any>;
  recoveryAttempted?: boolean;
  recoverySuccessful?: boolean;
  recoveryStrategy?: string;
}

/**
 * Error frequency data
 */
interface ErrorFrequency {
  count: number;
  firstSeen: number;
  lastSeen: number;
  recoveryAttempts: number;
  recoverySuccess: number;
}

/**
 * Health metrics
 */
interface SystemHealthMetrics {
  totalErrorCount: number;
  criticalErrorCount: number;
  recoverySuccessRate: number;
  topErrorSources: Record<string, number>;
  mostFrequentErrors: Array<{
    errorCode: string;
    count: number;
    recoveryRate: number;
  }>;
  recentErrors: ErrorReport[];
}

/**
 * Error Monitor Service
 * Centralized error tracking and analysis
 */
export class ErrorMonitor {
  private static errorReports: ErrorReport[] = [];
  private static errorFrequency: Map<string, ErrorFrequency> = new Map();
  private static maxStoredErrors = 100;
  private static notificationCallbacks: Array<(error: ErrorReport) => void> = [];
  
  /**
   * Report an error to the monitor
   */
  public static reportError(
    error: Error | TypeScriptError | any,
    source: ErrorSource,
    options?: {
      severity?: ErrorSeverity;
      componentName?: string;
      context?: Record<string, any>;
      recoveryInfo?: {
        attempted: boolean;
        successful: boolean;
        strategy?: string;
      };
    }
  ): string {
    try {
      const now = Date.now();
      
      // Generate error code if not available
      const errorCode = this.getErrorCode(error, source);
      
      // Generate unique error ID
      const errorId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // Extract message
      let message: string;
      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error.message === 'string') {
        message = error.message;
      } else if (error && typeof error === 'object') {
        message = JSON.stringify(error);
      } else {
        message = String(error);
      }
      
      // Determine severity
      let severity = options?.severity || ErrorSeverity.MEDIUM;
      if (error && typeof error.severity === 'string') {
        severity = error.severity;
      }
      
      // Extract stack trace
      const stackTrace = error instanceof Error ? error.stack : undefined;
      
      // Create error report
      const report: ErrorReport = {
        id: errorId,
        errorCode,
        message,
        timestamp: now,
        source,
        severity,
        componentName: options?.componentName || 'unknown',
        stackTrace,
        context: options?.context,
        recoveryAttempted: options?.recoveryInfo?.attempted || false,
        recoverySuccessful: options?.recoveryInfo?.successful || false,
        recoveryStrategy: options?.recoveryInfo?.strategy
      };
      
      // Store report
      this.storeErrorReport(report);
      
      // Track frequency
      this.trackErrorFrequency(errorCode, now, report.recoveryAttempted, report.recoverySuccessful);
      
      // Log critical errors to diagnostics
      if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
        logDiagnostics('errors', 
          `${severity.toUpperCase()} ERROR: ${message}`,
          severity === ErrorSeverity.CRITICAL ? 'error' : 'warning',
          {
            errorCode,
            componentName: options?.componentName,
            source
          }
        );
      }
      
      // Trigger notifications for critical errors
      if (severity === ErrorSeverity.CRITICAL) {
        this.notifySubscribers(report);
      }
      
      return errorId;
    } catch (monitorError) {
      console.error("Error in error monitoring system:", monitorError);
      return "error-monitor-failure";
    }
  }
  
  /**
   * Store error report
   */
  private static storeErrorReport(report: ErrorReport): void {
    this.errorReports.unshift(report);
    
    // Trim if exceeded max size
    if (this.errorReports.length > this.maxStoredErrors) {
      this.errorReports = this.errorReports.slice(0, this.maxStoredErrors);
    }
  }
  
  /**
   * Track error frequency
   */
  private static trackErrorFrequency(
    errorCode: string, 
    timestamp: number,
    recoveryAttempted: boolean,
    recoverySuccessful: boolean
  ): void {
    const existing = this.errorFrequency.get(errorCode);
    
    if (existing) {
      existing.count++;
      existing.lastSeen = timestamp;
      if (recoveryAttempted) {
        existing.recoveryAttempts++;
        if (recoverySuccessful) {
          existing.recoverySuccess++;
        }
      }
    } else {
      this.errorFrequency.set(errorCode, {
        count: 1,
        firstSeen: timestamp,
        lastSeen: timestamp,
        recoveryAttempts: recoveryAttempted ? 1 : 0,
        recoverySuccess: recoverySuccessful ? 1 : 0
      });
    }
  }
  
  /**
   * Get error code from various error types
   */
  private static getErrorCode(error: any, source: ErrorSource): string {
    if (error && error.code) {
      return error.code;
    }
    
    if (error instanceof Error) {
      return `${source}_${error.name}`.toUpperCase();
    }
    
    if (error && typeof error === 'object' && error.type && typeof error.type === 'number') {
      // Handle TypeScript errors
      return `TS_${TypeScriptErrorType[error.type] || 'UNKNOWN'}`;
    }
    
    return `${source}_UNKNOWN_ERROR`.toUpperCase();
  }
  
  /**
   * Get recent errors
   */
  public static getRecentErrors(limit: number = 10): ErrorReport[] {
    return this.errorReports.slice(0, limit);
  }
  
  /**
   * Get all errors of a specific source
   */
  public static getErrorsBySource(source: ErrorSource, limit: number = 20): ErrorReport[] {
    return this.errorReports
      .filter(report => report.source === source)
      .slice(0, limit);
  }
  
  /**
   * Get all errors from a specific component
   */
  public static getErrorsByComponent(componentName: string, limit: number = 20): ErrorReport[] {
    return this.errorReports
      .filter(report => report.componentName === componentName)
      .slice(0, limit);
  }
  
  /**
   * Get critical errors
   */
  public static getCriticalErrors(limit: number = 20): ErrorReport[] {
    return this.errorReports
      .filter(report => report.severity === ErrorSeverity.CRITICAL)
      .slice(0, limit);
  }
  
  /**
   * Get most frequent errors
   */
  public static getMostFrequentErrors(limit: number = 10): Array<{ 
    errorCode: string; 
    count: number;
    recoveryAttempts: number;
    recoverySuccess: number;
    firstSeen: number;
    lastSeen: number;
    recoveryRate: number;
  }> {
    return Array.from(this.errorFrequency.entries())
      .map(([errorCode, data]) => ({
        errorCode,
        ...data,
        recoveryRate: data.recoveryAttempts > 0 
          ? (data.recoverySuccess / data.recoveryAttempts) * 100
          : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
  
  /**
   * Get system health metrics
   */
  public static getSystemHealthMetrics(): SystemHealthMetrics {
    // Count by source
    const sourceCount: Record<string, number> = {};
    this.errorReports.forEach(report => {
      sourceCount[report.source] = (sourceCount[report.source] || 0) + 1;
    });
    
    // Count critical errors
    const criticalCount = this.errorReports.filter(
      report => report.severity === ErrorSeverity.CRITICAL
    ).length;
    
    // Calculate recovery success rate
    let totalRecoveryAttempts = 0;
    let totalRecoverySuccess = 0;
    
    for (const data of this.errorFrequency.values()) {
      totalRecoveryAttempts += data.recoveryAttempts;
      totalRecoverySuccess += data.recoverySuccess;
    }
    
    const recoveryRate = totalRecoveryAttempts > 0
      ? (totalRecoverySuccess / totalRecoveryAttempts) * 100
      : 100; // Default to 100% if no recovery attempts
    
    return {
      totalErrorCount: this.errorReports.length,
      criticalErrorCount: criticalCount,
      recoverySuccessRate: recoveryRate,
      topErrorSources: sourceCount,
      mostFrequentErrors: this.getMostFrequentErrors(5).map(item => ({
        errorCode: item.errorCode,
        count: item.count,
        recoveryRate: item.recoveryRate
      })),
      recentErrors: this.errorReports.slice(0, 5)
    };
  }
  
  /**
   * Clear error history
   */
  public static clearErrorHistory(): void {
    this.errorReports = [];
    this.errorFrequency.clear();
  }
  
  /**
   * Subscribe to error notifications
   */
  public static subscribeToErrors(callback: (error: ErrorReport) => void): () => void {
    this.notificationCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Notify all subscribers
   */
  private static notifySubscribers(error: ErrorReport): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error("Error in error notification callback:", err);
      }
    });
  }
  
  /**
   * Generate an error report for current system state
   */
  public static generateSystemErrorReport(): {
    typescriptErrors: ReturnType<typeof TypeScriptWatchdog.getErrorStats>;
    recoveryStats: ReturnType<typeof errorRecovery.getErrorStats>;
    systemHealth: SystemHealthMetrics;
  } {
    return {
      typescriptErrors: TypeScriptWatchdog.getErrorStats(),
      recoveryStats: errorRecovery.getErrorStats(),
      systemHealth: this.getSystemHealthMetrics()
    };
  }
}

// Export singleton
export const errorMonitor = ErrorMonitor;
