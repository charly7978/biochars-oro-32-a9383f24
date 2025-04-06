
/**
 * Duplication Detection Utilities
 * Practical functions to help identify and fix code duplication issues
 */

import { getCodeDuplicationGuardian, DuplicationIssue } from './duplication-guardian';
import * as path from 'path';

/**
 * Suggested refactoring action
 */
export interface RefactoringAction {
  type: 'extract' | 'merge' | 'delete' | 'move' | 'reuse';
  description: string;
  sourceFile: string;
  targetFile?: string;
  codeToMove?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * File change suggestion
 */
export interface FileChangeGuidance {
  filesToCreate: string[];
  filesToDelete: string[];
  filesToModify: string[];
}

/**
 * Check a file against the registry to find duplication issues
 */
export function analyzeFileForDuplication(
  filePath: string, 
  content: string
): { issues: DuplicationIssue[], suggestedActions: RefactoringAction[] } {
  const guardian = getCodeDuplicationGuardian();
  const issues = guardian.checkFile(filePath, content);
  
  // Generate suggested actions based on issues
  const suggestedActions = generateRefactoringActions(issues);
  
  return { issues, suggestedActions };
}

/**
 * Generate refactoring actions based on detected issues
 */
function generateRefactoringActions(issues: DuplicationIssue[]): RefactoringAction[] {
  const actions: RefactoringAction[] = [];
  
  issues.forEach(issue => {
    switch (issue.type) {
      case 0: // EXACT_CODE_DUPLICATION
        actions.push({
          type: 'extract',
          description: `Extract duplicated code into a shared utility function`,
          sourceFile: issue.locations[0].filePath,
          targetFile: determineTargetUtilityFile(issue.locations[0].filePath),
          codeToMove: issue.locations[0].context,
          difficulty: 'easy'
        });
        break;
        
      case 1: // SIMILAR_FUNCTIONALITY
        actions.push({
          type: 'merge',
          description: `Merge similar functionality from ${issue.locations.length} locations into a single implementation`,
          sourceFile: issue.locations[0].filePath,
          targetFile: determineBestLocation(issue.locations.map(loc => loc.filePath)),
          difficulty: 'medium'
        });
        break;
        
      case 2: // REDUNDANT_IMPORTS
        actions.push({
          type: 'reuse',
          description: 'Consolidate imports and use existing functionality',
          sourceFile: issue.locations[0].filePath,
          difficulty: 'easy'
        });
        break;
        
      case 5: // OVERLAPPING_FUNCTIONS
        actions.push({
          type: 'extract',
          description: 'Extract shared functionality into a base class or utility',
          sourceFile: issue.locations[0].filePath,
          targetFile: determineTargetUtilityFile(issue.locations[0].filePath),
          difficulty: 'hard'
        });
        break;
    }
  });
  
  return actions;
}

/**
 * Determine the best location for a utility file based on the source file
 */
function determineTargetUtilityFile(sourceFile: string): string {
  const dir = path.dirname(sourceFile);
  const moduleMatch = dir.match(/src\/modules\/([^\/]+)/);
  
  if (moduleMatch) {
    // If in a module, create a utils file within that module
    return `${dir}/utils/${path.basename(sourceFile, path.extname(sourceFile))}-utils${path.extname(sourceFile)}`;
  }
  
  // Default to a general utils directory
  return `src/utils/${path.basename(sourceFile, path.extname(sourceFile))}-utils${path.extname(sourceFile)}`;
}

/**
 * Determine the best location from multiple options
 */
function determineBestLocation(filePaths: string[]): string {
  // Simple heuristic: choose the path with the most shared directory structure
  // In a real implementation, this would be more sophisticated
  if (filePaths.length === 0) return '';
  if (filePaths.length === 1) return filePaths[0];
  
  // For now, just return the first path
  return filePaths[0];
}

/**
 * Generate a refactoring plan for a module
 */
export function generateRefactoringPlan(
  moduleName: string
): { 
  issues: DuplicationIssue[], 
  actions: RefactoringAction[],
  fileChanges: FileChangeGuidance 
} {
  const guardian = getCodeDuplicationGuardian();
  
  // In a real implementation, we would analyze all files in the module
  // For this example, we'll just get all issues and filter them
  const allIssues = guardian.getAllIssues();
  const moduleIssues = allIssues.filter(issue => 
    issue.locations.some(loc => loc.filePath.includes(`/modules/${moduleName}/`))
  );
  
  // Generate refactoring actions
  const actions = generateRefactoringActions(moduleIssues);
  
  // Generate file changes guidance
  const fileChanges: FileChangeGuidance = {
    filesToCreate: [],
    filesToDelete: [],
    filesToModify: []
  };
  
  // Determine files to create
  const uniqueTargetFiles = new Set<string>();
  actions.forEach(action => {
    if (action.targetFile && action.type === 'extract' || action.type === 'move') {
      uniqueTargetFiles.add(action.targetFile);
    }
  });
  
  fileChanges.filesToCreate = Array.from(uniqueTargetFiles);
  
  // Determine files to modify
  const uniqueSourceFiles = new Set<string>();
  actions.forEach(action => {
    uniqueSourceFiles.add(action.sourceFile);
  });
  
  fileChanges.filesToModify = Array.from(uniqueSourceFiles);
  
  // For deletions, we would need more sophisticated analysis
  // This is just a placeholder
  fileChanges.filesToDelete = [];
  
  return { issues: moduleIssues, actions, fileChanges };
}

/**
 * Register a module's components for duplication tracking
 */
export function registerModuleComponents(
  modulePath: string, 
  componentNames: string[], 
  moduleExports: Record<string, string[]> = {}
): void {
  const guardian = getCodeDuplicationGuardian();
  
  componentNames.forEach(name => {
    const filePath = `${modulePath}/${name}.ts`;
    const exports = moduleExports[name] || [];
    guardian.registerComponent(name, filePath, exports);
  });
}

/**
 * Automatically register common module structure
 * Useful for initial setup
 */
export function autoRegisterModuleStructure(
  moduleName: string, 
  basePath: string = 'src/modules'
): void {
  // Common files in a typical module
  const commonFiles = [
    'index',
    'types',
    'constants',
    'utils/index',
    'utils/helpers',
    'hooks/index'
  ];
  
  const modulePath = `${basePath}/${moduleName}`;
  
  registerModuleComponents(
    modulePath, 
    commonFiles.map(file => file.includes('/') ? file : `${file}`),
    {
      'index': ['*'] // Index typically exports everything
    }
  );
}
