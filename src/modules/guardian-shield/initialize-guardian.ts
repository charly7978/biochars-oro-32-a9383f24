
/**
 * Guardian Shield Initialization
 * Central initialization for all guardian systems
 */

import { getGuardianShield } from './index';

/**
 * Initialize all Guardian Shield systems
 */
export function initializeGuardianShield(): void {
  console.log("Initializing Guardian Shield systems...");
  
  // Get guardian instance
  const guardian = getGuardianShield();
  
  // Enable all protections
  guardian.enableTypescriptWatchdog(true);
  guardian.enableDuplicationGuardian(true);
  
  console.log("Guardian Shield initialized successfully");
  console.log("Code duplication prevention active");
  
  // Generate initial report
  const initialReport = guardian.generateReport();
  console.log("Initial system report:", {
    timestamp: new Date(initialReport.timestamp).toISOString(),
    duplicationIssuesCount: initialReport.duplicationIssues.totalIssues,
    criticalIssuesCount: initialReport.duplicationIssues.bySeverity.critical,
    registeredModules: initialReport.duplicationIssues.moduleCount
  });
}

/**
 * Export the initialize function as default
 * This allows easy import and execution
 */
export default initializeGuardianShield;
