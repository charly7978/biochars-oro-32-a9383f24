
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Utilidades para depuración agresiva y rastreo de errores
 */

import { useToast } from "@/hooks/use-toast";

// Define error levels
export enum ErrorLevel {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical"
}

// Interface for error tracking
export interface ErrorEvent {
  timestamp: number;
  message: string;
  level: ErrorLevel;
  source: string;
  data?: any;
  stack?: string;
}

// Global error buffer
const errorBuffer: ErrorEvent[] = [];
const MAX_ERROR_BUFFER = 100;

// Flag to control verbose logging
let verboseLoggingEnabled = false;

/**
 * Log an error or diagnostic event
 */
export function logError(
  message: string,
  level: ErrorLevel = ErrorLevel.ERROR,
  source: string = "Unknown",
  data?: any
): void {
  const errorEvent: ErrorEvent = {
    timestamp: Date.now(),
    message,
    level,
    source,
    data
  };
  
  // Always add to buffer for retrieval
  errorBuffer.push(errorEvent);
  if (errorBuffer.length > MAX_ERROR_BUFFER) {
    errorBuffer.shift();
  }
  
  // Console logging based on level
  const consoleStyles = getConsoleStylesForLevel(level);
  
  // Format timestamp
  const formattedTime = new Date(errorEvent.timestamp).toISOString();
  
  // Always log errors and critical issues
  if (level === ErrorLevel.ERROR || level === ErrorLevel.CRITICAL || verboseLoggingEnabled) {
    console.group(`%c${level.toUpperCase()} [${formattedTime}] - ${source}`, consoleStyles);
    console.log(message);
    if (data) {
      console.log("Additional data:", data);
    }
    console.groupEnd();
  }
  
  // For critical errors, add stack trace
  if (level === ErrorLevel.CRITICAL) {
    const stack = new Error().stack;
    errorEvent.stack = stack;
    console.error("Stack trace:", stack);
  }
}

/**
 * Get console styling based on error level
 */
function getConsoleStylesForLevel(level: ErrorLevel): string {
  switch (level) {
    case ErrorLevel.INFO:
      return "color: #3498db; font-weight: bold;";
    case ErrorLevel.WARNING:
      return "color: #f39c12; font-weight: bold;";
    case ErrorLevel.ERROR:
      return "color: #e74c3c; font-weight: bold;";
    case ErrorLevel.CRITICAL:
      return "color: #ffffff; background-color: #c0392b; font-weight: bold; padding: 2px 5px; border-radius: 3px;";
    default:
      return "color: #2c3e50;";
  }
}

/**
 * Enable or disable verbose logging
 */
export function setVerboseLogging(enabled: boolean): void {
  verboseLoggingEnabled = enabled;
  logError(
    `Verbose logging ${enabled ? 'enabled' : 'disabled'}`,
    ErrorLevel.INFO,
    "DebugUtils"
  );
}

/**
 * Get all errors in the buffer
 */
export function getErrorBuffer(): ErrorEvent[] {
  return [...errorBuffer];
}

/**
 * Clear the error buffer
 */
export function clearErrorBuffer(): void {
  errorBuffer.length = 0;
  logError("Error buffer cleared", ErrorLevel.INFO, "DebugUtils");
}

/**
 * Map error level to toast variant
 */
function mapErrorLevelToToastVariant(level: ErrorLevel): "default" | "destructive" {
  switch (level) {
    case ErrorLevel.WARNING:
      return "default"; // Changed from "warning" to "default"
    case ErrorLevel.ERROR:
    case ErrorLevel.CRITICAL:
      return "destructive";
    default:
      return "default";
  }
}

/**
 * Hook for using error tracking with toast notifications
 */
export function useErrorTracking() {
  const { toast } = useToast();
  
  const trackError = (
    message: string,
    level: ErrorLevel = ErrorLevel.ERROR,
    source: string = "Unknown",
    data?: any,
    showToast: boolean = true
  ) => {
    logError(message, level, source, data);
    
    if (showToast) {
      // Only show toast for warnings, errors and critical issues
      if (level !== ErrorLevel.INFO) {
        toast({
          title: level.toUpperCase(),
          description: `${source}: ${message}`,
          variant: mapErrorLevelToToastVariant(level),
          duration: level === ErrorLevel.CRITICAL ? 5000 : 3000,
        });
      }
    }
  };
  
  return {
    trackError,
    getErrors: getErrorBuffer,
    clearErrors: clearErrorBuffer,
    setVerboseLogging
  };
}

/**
 * Performance monitoring utility
 */
export function monitorPerformance<T>(
  fn: () => T,
  name: string,
  thresholdMs: number = 100
): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    if (duration > thresholdMs) {
      logError(
        `Performance warning: ${name} took ${duration.toFixed(2)}ms (threshold: ${thresholdMs}ms)`,
        ErrorLevel.WARNING,
        "PerformanceMonitor",
        { duration, threshold: thresholdMs }
      );
    }
  }
}

/**
 * Wrap a function with error tracking
 */
export function withErrorTracking<T extends (...args: any[]) => any>(
  fn: T,
  source: string
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    try {
      return fn(...args);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logError(
        `Error in ${source}: ${errorMessage}`,
        ErrorLevel.ERROR,
        source,
        { args, error, stack: errorStack }
      );
      
      throw error;
    }
  };
}
