
/**
 * Code Duplication Guardian
 * Advanced system to prevent, detect and fix code duplication issues
 */

import { DuplicationDetector, CodePattern } from './duplication-detector';
import { TypeScriptWatchdog } from './typescript-watchdog';
import * as path from 'path';

/**
 * Types of code duplication issues
 */
export enum DuplicationType {
  EXACT_CODE_DUPLICATION,
  SIMILAR_FUNCTIONALITY,
  REDUNDANT_IMPORTS,
  DUPLICATE_DECLARATIONS,
  SIMILAR_COMPONENT_STRUCTURE,
  OVERLAPPING_FUNCTIONS
}

/**
 * Severity level for duplication issues
 */
export type DuplicationSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Issue location information
 */
export interface CodeLocation {
  filePath: string;
  startLine?: number;
  endLine?: number;
  context?: string;
}

/**
 * Duplication issue description
 */
export interface DuplicationIssue {
  id: string;
  type: DuplicationType;
  severity: DuplicationSeverity;
  description: string;
  locations: CodeLocation[];
  similarityScore: number;
  suggestion?: string;
  detected: number; // timestamp
  affectedComponents?: string[];
  isSolved?: boolean;
}

/**
 * Module information for registry
 */
export interface ModuleInfo {
  name: string;
  path: string;
  exports: string[];
  dependencies: string[];
  lastUpdated: number;
  fingerprint: string; // Hash of the file content
  functionality: string; // Brief description of module functionality
}

/**
 * Component Registry Interface
 */
export interface ComponentRegistry {
  registerComponent(name: string, filePath: string, exports: string[]): void;
  getComponent(name: string): ModuleInfo | null;
  checkDuplications(filePath: string, content: string): DuplicationIssue[];
  getAllComponents(): ModuleInfo[];
}

/**
 * Central registry implementation for components and modules
 */
export class ModuleRegistry implements ComponentRegistry {
  private modules: Map<string, ModuleInfo> = new Map();
  private duplicationDetector: DuplicationDetector;
  private patterns: Map<string, CodePattern> = new Map();
  
  // Mapping of functionality to module paths
  private functionalityMap: Map<string, string[]> = new Map();
  
  constructor() {
    this.duplicationDetector = new DuplicationDetector();
    this.initializePatterns();
  }
  
  /**
   * Initialize built-in code patterns for detection
   */
  private initializePatterns(): void {
    // Common signal processing patterns
    this.registerPattern({
      id: 'signal-processing-filter',
      pattern: `function applyFilter(values) {
        let sum = 0;
        for (let i = 0; i < values.length; i++) {
          sum += values[i];
        }
        return sum / values.length;
      }`,
      category: 'signal-processing',
      alternativeReference: 'modules/signal-processing/utils/filter-utils.ts',
      description: 'Basic signal filtering function'
    });
    
    // Common component patterns
    this.registerPattern({
      id: 'react-useEffect-cleanup',
      pattern: `useEffect(() => {
        // setup code
        return () => {
          // cleanup code
        };
      }, [dependencies]);`,
      category: 'react-hooks',
      description: 'React useEffect with cleanup pattern'
    });
    
    // State management patterns
    this.registerPattern({
      id: 'useState-with-callback',
      pattern: `const [state, setState] = useState(initial);
      const updateState = useCallback((newValue) => {
        setState(prev => ({ ...prev, ...newValue }));
      }, []);`,
      category: 'state-management',
      description: 'Common state update pattern with useCallback'
    });
  }
  
  /**
   * Register a component in the central registry
   */
  public registerComponent(name: string, filePath: string, exports: string[]): void {
    // Generate a simple fingerprint of the file
    const fingerprint = this.generateFingerprint(filePath);
    
    // Extract functionality based on file content or name
    const functionality = this.inferFunctionality(filePath, name);
    
    const module: ModuleInfo = {
      name,
      path: filePath,
      exports,
      dependencies: this.extractDependencies(filePath),
      lastUpdated: Date.now(),
      fingerprint,
      functionality
    };
    
    this.modules.set(name, module);
    
    // Update functionality map
    if (functionality) {
      const existingPaths = this.functionalityMap.get(functionality) || [];
      if (!existingPaths.includes(filePath)) {
        existingPaths.push(filePath);
        this.functionalityMap.set(functionality, existingPaths);
      }
    }
    
    console.log(`ModuleRegistry: Registered component '${name}' at ${filePath}`);
  }
  
  /**
   * Get a registered component by name
   */
  public getComponent(name: string): ModuleInfo | null {
    return this.modules.get(name) || null;
  }
  
  /**
   * Get all components with similar functionality
   */
  public getComponentsByFunctionality(functionality: string): ModuleInfo[] {
    const paths = this.functionalityMap.get(functionality) || [];
    return paths
      .map(path => {
        for (const [name, info] of this.modules.entries()) {
          if (info.path === path) {
            return info;
          }
        }
        return null;
      })
      .filter(info => info !== null) as ModuleInfo[];
  }
  
  /**
   * Register a code pattern for duplication detection
   */
  public registerPattern(pattern: CodePattern): void {
    this.patterns.set(pattern.id, pattern);
    this.duplicationDetector.registerPattern(pattern);
  }
  
  /**
   * Check file for duplications against known patterns and components
   */
  public checkDuplications(filePath: string, content: string): DuplicationIssue[] {
    const issues: DuplicationIssue[] = [];
    
    // Check against known patterns
    const result = this.duplicationDetector.checkDuplication(content);
    if (result.isDuplicate && result.matchedPattern) {
      const issue: DuplicationIssue = {
        id: `dup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: DuplicationType.SIMILAR_FUNCTIONALITY,
        severity: result.similarityScore > 0.9 ? 'high' : 'medium',
        description: `Similar code found that matches pattern '${result.matchedPattern.id}'`,
        locations: [
          {
            filePath,
            context: content.substring(0, 100) + '...'
          },
          {
            filePath: result.matchedPattern.alternativeReference || 'unknown',
            context: result.matchedPattern.description || 'Pattern match'
          }
        ],
        similarityScore: result.similarityScore,
        suggestion: result.suggestion || `Consider using the existing implementation instead`,
        detected: Date.now()
      };
      
      issues.push(issue);
    }
    
    // Check for similar functionality across modules
    const possibleFunctionality = this.inferFunctionality(filePath, path.basename(filePath, path.extname(filePath)));
    if (possibleFunctionality) {
      const similarComponents = this.getComponentsByFunctionality(possibleFunctionality);
      
      if (similarComponents.length > 0) {
        const issue: DuplicationIssue = {
          id: `dup-func-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: DuplicationType.SIMILAR_FUNCTIONALITY,
          severity: 'medium',
          description: `Multiple components with similar functionality '${possibleFunctionality}' detected`,
          locations: [
            {
              filePath,
              context: `New file with ${possibleFunctionality} functionality`
            },
            ...similarComponents.map(comp => ({
              filePath: comp.path,
              context: `Existing ${comp.name} with ${possibleFunctionality} functionality`
            }))
          ],
          similarityScore: 0.7, // Estimated based on functionality match
          suggestion: `Consider consolidating functionality with existing components or use composition`,
          detected: Date.now(),
          affectedComponents: similarComponents.map(comp => comp.name)
        };
        
        issues.push(issue);
      }
    }
    
    return issues;
  }
  
  /**
   * Get all registered components
   */
  public getAllComponents(): ModuleInfo[] {
    return Array.from(this.modules.values());
  }
  
  /**
   * Extract dependencies from a file
   */
  private extractDependencies(filePath: string): string[] {
    // In a real implementation, we would parse the file and extract import statements
    // For this example, we'll return an empty array
    return [];
  }
  
  /**
   * Generate a simple fingerprint for a file
   */
  private generateFingerprint(filePath: string): string {
    // In a real implementation, we would read the file and generate a hash
    // For this example, we'll return a random string
    return `fp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Infer functionality from file path and name
   */
  private inferFunctionality(filePath: string, name: string): string {
    // Try to infer functionality from path and name
    const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase();
    const dirParts = path.dirname(filePath).toLowerCase().split('/');
    
    // Check for common functionality indicators in the path
    if (filePath.includes('signal-processing')) return 'signal-processing';
    if (filePath.includes('vital-signs')) return 'vital-signs';
    if (filePath.includes('/hooks/')) return 'react-hooks';
    if (filePath.includes('/components/')) return 'react-components';
    if (filePath.includes('/utils/')) return 'utilities';
    if (filePath.includes('/validators/')) return 'validation';
    if (filePath.includes('/processors/')) return 'data-processing';
    
    // Check for functionality in the filename
    if (fileName.includes('processor')) return 'processor';
    if (fileName.includes('filter')) return 'filtering';
    if (fileName.includes('detector')) return 'detection';
    if (fileName.includes('extractor')) return 'extraction';
    if (fileName.includes('validator')) return 'validation';
    if (fileName.includes('channel')) return 'signal-channel';
    if (fileName.includes('hook')) return 'react-hook';
    
    // Default to a generic functionality
    return dirParts[dirParts.length - 1] || 'unknown';
  }
}

/**
 * Code Duplication Guardian
 * Main class for managing code duplication prevention
 */
export class CodeDuplicationGuardian {
  private static instance: CodeDuplicationGuardian;
  private moduleRegistry: ModuleRegistry;
  private issues: Map<string, DuplicationIssue> = new Map();
  private enabled: boolean = true;
  
  private constructor() {
    this.moduleRegistry = new ModuleRegistry();
    console.log("CodeDuplicationGuardian initialized");
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): CodeDuplicationGuardian {
    if (!CodeDuplicationGuardian.instance) {
      CodeDuplicationGuardian.instance = new CodeDuplicationGuardian();
    }
    return CodeDuplicationGuardian.instance;
  }
  
  /**
   * Register a component for tracking
   */
  public registerComponent(name: string, filePath: string, exports: string[] = []): void {
    if (!this.enabled) return;
    this.moduleRegistry.registerComponent(name, filePath, exports);
  }
  
  /**
   * Check if a file would cause duplication issues
   */
  public checkFile(filePath: string, content: string): DuplicationIssue[] {
    if (!this.enabled) return [];
    
    const newIssues = this.moduleRegistry.checkDuplications(filePath, content);
    
    // Store new issues
    newIssues.forEach(issue => {
      this.issues.set(issue.id, issue);
    });
    
    return newIssues;
  }
  
  /**
   * Get all known issues
   */
  public getAllIssues(): DuplicationIssue[] {
    return Array.from(this.issues.values());
  }
  
  /**
   * Get issues by severity
   */
  public getIssuesBySeverity(severity: DuplicationSeverity): DuplicationIssue[] {
    return Array.from(this.issues.values())
      .filter(issue => issue.severity === severity);
  }
  
  /**
   * Get issues for a specific file
   */
  public getIssuesForFile(filePath: string): DuplicationIssue[] {
    return Array.from(this.issues.values())
      .filter(issue => issue.locations.some(loc => loc.filePath === filePath));
  }
  
  /**
   * Mark an issue as solved
   */
  public markIssueAsSolved(issueId: string): boolean {
    const issue = this.issues.get(issueId);
    if (issue) {
      issue.isSolved = true;
      return true;
    }
    return false;
  }
  
  /**
   * Get all components with a particular functionality
   */
  public findSimilarComponents(functionality: string): ModuleInfo[] {
    return this.moduleRegistry.getComponentsByFunctionality(functionality);
  }
  
  /**
   * Enable or disable the guardian
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`CodeDuplicationGuardian ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Generate a report of all duplication issues
   */
  public generateReport(): {
    totalIssues: number;
    bySeverity: Record<DuplicationSeverity, number>;
    byType: Record<DuplicationType, number>;
    criticalIssues: DuplicationIssue[];
    moduleCount: number;
  } {
    const allIssues = this.getAllIssues();
    
    // Count issues by severity
    const bySeverity: Record<DuplicationSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    // Count issues by type
    const byType: Record<DuplicationType, number> = {
      [DuplicationType.EXACT_CODE_DUPLICATION]: 0,
      [DuplicationType.SIMILAR_FUNCTIONALITY]: 0,
      [DuplicationType.REDUNDANT_IMPORTS]: 0,
      [DuplicationType.DUPLICATE_DECLARATIONS]: 0,
      [DuplicationType.SIMILAR_COMPONENT_STRUCTURE]: 0,
      [DuplicationType.OVERLAPPING_FUNCTIONS]: 0
    };
    
    // Count issues by severity and type
    allIssues.forEach(issue => {
      bySeverity[issue.severity]++;
      byType[issue.type]++;
    });
    
    return {
      totalIssues: allIssues.length,
      bySeverity,
      byType,
      criticalIssues: allIssues.filter(issue => issue.severity === 'critical'),
      moduleCount: this.moduleRegistry.getAllComponents().length
    };
  }
}

/**
 * Get the singleton instance of CodeDuplicationGuardian
 */
export function getCodeDuplicationGuardian(): CodeDuplicationGuardian {
  return CodeDuplicationGuardian.getInstance();
}

/**
 * Register a component with the guardian
 * Convenience function for quick registration
 */
export function registerComponent(name: string, filePath: string, exports: string[] = []): void {
  const guardian = getCodeDuplicationGuardian();
  guardian.registerComponent(name, filePath, exports);
}

/**
 * Check a file for potential duplication issues
 * Convenience function for quick checking
 */
export function checkForDuplications(filePath: string, content: string): DuplicationIssue[] {
  const guardian = getCodeDuplicationGuardian();
  return guardian.checkFile(filePath, content);
}
