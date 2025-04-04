
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Error prediction and monitoring system
 */

import { logError, ErrorLevel } from '../debugUtils';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useCallback } from 'react';
import { trackDeviceError } from '../deviceErrorTracker';

// Define signature pattern types for error prediction
type ErrorPatternSignature = {
  source: string;
  type: string;
  frequency: number;
  timeWindow: number;
  messagePattern?: RegExp;
  severity: ErrorLevel;
};

// Define error threshold configuration
interface ErrorThresholdConfig {
  source: string;
  errorType: string;
  timeWindowMs: number;
  maxErrorCount: number;
  action: 'warn' | 'alert' | 'mitigate' | 'prevent';
  mitigationFunction?: () => Promise<void>;
}

// System health states
export enum SystemHealthState {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded', 
  WARNING = 'warning',
  CRITICAL = 'critical'
}

// Detected issue type
export interface DetectedIssue {
  id: string;
  timestamp: number;
  source: string;
  type: string;
  description: string;
  suggestedAction?: string;
  severity: ErrorLevel;
  resolved: boolean;
}

// Internal tracking for error frequency
class ErrorFrequencyTracker {
  private errorCounts: Record<string, Array<number>> = {};
  
  constructor(private readonly maxTimeWindowMs: number = 60000) {}
  
  public trackError(source: string, type: string): number {
    const key = `${source}:${type}`;
    const now = Date.now();
    
    if (!this.errorCounts[key]) {
      this.errorCounts[key] = [];
    }
    
    // Add current timestamp
    this.errorCounts[key].push(now);
    
    // Remove timestamps outside the time window
    this.errorCounts[key] = this.errorCounts[key].filter(
      timestamp => now - timestamp < this.maxTimeWindowMs
    );
    
    // Return current frequency
    return this.errorCounts[key].length;
  }
  
  public getErrorFrequency(source: string, type: string): number {
    const key = `${source}:${type}`;
    const now = Date.now();
    
    if (!this.errorCounts[key]) {
      return 0;
    }
    
    // Remove timestamps outside the time window first
    this.errorCounts[key] = this.errorCounts[key].filter(
      timestamp => now - timestamp < this.maxTimeWindowMs
    );
    
    return this.errorCounts[key].length;
  }
  
  public reset(): void {
    this.errorCounts = {};
  }
}

// Static instances for global monitoring
const frequencyTracker = new ErrorFrequencyTracker();
const detectedIssues: DetectedIssue[] = [];
const knownPatterns: ErrorPatternSignature[] = [
  {
    source: 'camera',
    type: 'permission',
    frequency: 3,
    timeWindow: 30000,
    messagePattern: /permission|denied|not allowed/i,
    severity: ErrorLevel.WARNING
  },
  {
    source: 'signal-quality',
    type: 'weak-signal',
    frequency: 10,
    timeWindow: 10000,
    severity: ErrorLevel.INFO
  },
  {
    source: 'camera',
    type: 'disconnected',
    frequency: 2,
    timeWindow: 5000,
    messagePattern: /disconnected|unavailable/i,
    severity: ErrorLevel.ERROR
  }
];

// Global health state
let currentHealthState: SystemHealthState = SystemHealthState.HEALTHY;

/**
 * Register an error and check if it matches known patterns
 */
export function monitorError(
  message: string,
  source: string,
  type: string,
  level: ErrorLevel = ErrorLevel.ERROR
): void {
  // Track error frequency
  const frequency = frequencyTracker.trackError(source, type);
  
  // Check against known patterns
  for (const pattern of knownPatterns) {
    if (
      pattern.source === source &&
      pattern.type === type &&
      frequency >= pattern.frequency &&
      (!pattern.messagePattern || pattern.messagePattern.test(message))
    ) {
      // Match found - create issue if not already existing
      const existingIssue = detectedIssues.find(issue => 
        issue.source === source && 
        issue.type === type && 
        !issue.resolved && 
        Date.now() - issue.timestamp < pattern.timeWindow
      );
      
      if (!existingIssue) {
        const issueId = `${Date.now()}-${source}-${type}`;
        const newIssue: DetectedIssue = {
          id: issueId,
          timestamp: Date.now(),
          source,
          type,
          description: `Detected pattern: ${frequency} ${type} errors from ${source} in the last ${pattern.timeWindow / 1000}s`,
          severity: pattern.severity,
          resolved: false
        };
        
        detectedIssues.push(newIssue);
        
        // Log the detected issue
        logError(
          `Error pattern detected: ${newIssue.description}`,
          pattern.severity,
          'ErrorMonitor'
        );
        
        // Update system health state
        updateSystemHealth();
      }
    }
  }
  
  // Track the error itself
  trackDeviceError(message, type, source);
}

/**
 * Update overall system health based on unresolved issues
 */
function updateSystemHealth(): void {
  const unresolvedIssues = detectedIssues.filter(issue => !issue.resolved);
  
  if (unresolvedIssues.length === 0) {
    currentHealthState = SystemHealthState.HEALTHY;
    return;
  }
  
  // Check for critical issues
  if (unresolvedIssues.some(issue => issue.severity === ErrorLevel.CRITICAL)) {
    currentHealthState = SystemHealthState.CRITICAL;
    return;
  }
  
  // Check for error level issues
  if (unresolvedIssues.some(issue => issue.severity === ErrorLevel.ERROR)) {
    currentHealthState = SystemHealthState.DEGRADED;
    return;
  }
  
  // Check for warning level issues
  if (unresolvedIssues.some(issue => issue.severity === ErrorLevel.WARNING)) {
    currentHealthState = SystemHealthState.WARNING;
    return;
  }
  
  // Default to healthy if just info issues
  currentHealthState = SystemHealthState.HEALTHY;
}

/**
 * Resolve a detected issue
 */
export function resolveIssue(issueId: string): boolean {
  const issue = detectedIssues.find(i => i.id === issueId);
  
  if (issue) {
    issue.resolved = true;
    updateSystemHealth();
    return true;
  }
  
  return false;
}

/**
 * Get current system health state
 */
export function getSystemHealth(): SystemHealthState {
  return currentHealthState;
}

/**
 * Get all detected issues
 */
export function getDetectedIssues(includeResolved: boolean = false): DetectedIssue[] {
  return includeResolved 
    ? [...detectedIssues]
    : detectedIssues.filter(issue => !issue.resolved);
}

/**
 * Reset monitoring system
 */
export function resetErrorMonitoring(): void {
  frequencyTracker.reset();
  detectedIssues.length = 0;
  currentHealthState = SystemHealthState.HEALTHY;
}

/**
 * Hook for using error monitor with toast notifications
 */
export function useErrorMonitor(options: {
  notifyOnIssue?: boolean;
  notifyOnHealthChange?: boolean;
  pollingIntervalMs?: number;
} = {}) {
  const { toast } = useToast();
  const [issues, setIssues] = useState<DetectedIssue[]>([]);
  const [healthState, setHealthState] = useState<SystemHealthState>(SystemHealthState.HEALTHY);
  const lastHealthState = useRef<SystemHealthState>(SystemHealthState.HEALTHY);
  const lastIssueCount = useRef<number>(0);
  
  const {
    notifyOnIssue = true,
    notifyOnHealthChange = true,
    pollingIntervalMs = 5000
  } = options;
  
  // Poll for changes in issues and health state
  useEffect(() => {
    const intervalId = setInterval(() => {
      const currentIssues = getDetectedIssues(false);
      const currentHealth = getSystemHealth();
      
      // Update state only if changed
      if (JSON.stringify(currentIssues) !== JSON.stringify(issues)) {
        setIssues([...currentIssues]);
      }
      
      if (currentHealth !== healthState) {
        setHealthState(currentHealth);
      }
      
      // Check for notifications
      if (notifyOnIssue && currentIssues.length > lastIssueCount.current) {
        // Find new issues
        const newIssues = currentIssues.filter(issue => 
          !issues.some(existingIssue => existingIssue.id === issue.id)
        );
        
        // Notify about new issues
        for (const issue of newIssues) {
          toast({
            title: `${issue.severity.toUpperCase()}: ${issue.source}`,
            description: issue.description,
            variant: issue.severity === ErrorLevel.ERROR || issue.severity === ErrorLevel.CRITICAL 
              ? "destructive" 
              : "default",
            duration: 5000,
          });
        }
      }
      
      // Check for health state changes
      if (notifyOnHealthChange && currentHealth !== lastHealthState.current) {
        // Ignore changes to healthy state to reduce noise
        if (currentHealth !== SystemHealthState.HEALTHY) {
          toast({
            title: "System Health Changed",
            description: `Health state changed from ${lastHealthState.current} to ${currentHealth}`,
            variant: currentHealth === SystemHealthState.CRITICAL ? "destructive" : "default",
            duration: 4000,
          });
        }
      }
      
      // Update refs
      lastIssueCount.current = currentIssues.length;
      lastHealthState.current = currentHealth;
      
    }, pollingIntervalMs);
    
    return () => clearInterval(intervalId);
  }, [issues, healthState, toast, notifyOnIssue, notifyOnHealthChange, pollingIntervalMs]);
  
  const resolveIssueById = useCallback((issueId: string) => {
    const result = resolveIssue(issueId);
    if (result) {
      setIssues(getDetectedIssues(false));
      setHealthState(getSystemHealth());
    }
    return result;
  }, []);
  
  const monitorErrorWithContext = useCallback((
    message: string,
    source: string,
    type: string,
    level: ErrorLevel = ErrorLevel.ERROR
  ) => {
    monitorError(message, source, type, level);
    // No need to update state here, polling will handle it
  }, []);
  
  const resetMonitoring = useCallback(() => {
    resetErrorMonitoring();
    setIssues([]);
    setHealthState(SystemHealthState.HEALTHY);
  }, []);
  
  return {
    issues,
    healthState,
    monitorError: monitorErrorWithContext,
    resolveIssue: resolveIssueById,
    reset: resetMonitoring
  };
}
