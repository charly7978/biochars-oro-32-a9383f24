/**
 * Module for peak detection diagnostics
 * Stores statistics about signal quality and peak detection
 */

// Historical data for diagnostics
const qualityValues: number[] = [];
const qualityDistribution: Record<string, number> = {
  excellent: 0,
  good: 0,
  moderate: 0,
  poor: 0
};

// Signal diagnostics (for debugging)
let diagnosticsData: Array<{
  timestamp: number;
  value: number;
  isPeak: boolean;
  quality: number;
  processingPriority: 'high' | 'medium' | 'low';
  processTime: number;
}> = [];

// Trend data
const qualityTrend: Array<{ timestamp: number, quality: number }> = [];

/**
 * Record peak detection for diagnostics
 */
export function recordPeakDetection(
  value: number,
  isPeak: boolean,
  quality: number,
  processingPriority: 'high' | 'medium' | 'low' = 'medium',
  processTime: number = 0
): void {
  // Record quality for distribution
  qualityValues.push(quality);
  if (qualityValues.length > 300) {
    qualityValues.shift();
  }

  // Update quality distribution
  if (quality > 0.8) {
    qualityDistribution.excellent++;
  } else if (quality > 0.6) {
    qualityDistribution.good++;
  } else if (quality > 0.4) {
    qualityDistribution.moderate++;
  } else {
    qualityDistribution.poor++;
  }

  // Keep the distribution numbers reasonable
  const totalCounts = qualityDistribution.excellent + 
                      qualityDistribution.good + 
                      qualityDistribution.moderate + 
                      qualityDistribution.poor;
  
  if (totalCounts > 1000) {
    const factor = 0.9; // Decay factor
    qualityDistribution.excellent = Math.floor(qualityDistribution.excellent * factor);
    qualityDistribution.good = Math.floor(qualityDistribution.good * factor);
    qualityDistribution.moderate = Math.floor(qualityDistribution.moderate * factor);
    qualityDistribution.poor = Math.floor(qualityDistribution.poor * factor);
  }

  // Record trend data every 10 seconds
  const now = Date.now();
  if (qualityTrend.length === 0 || now - qualityTrend[qualityTrend.length - 1].timestamp > 10000) {
    // Calculate average quality over the last period
    const recentQualities = qualityValues.slice(-30);
    const avgQuality = recentQualities.length > 0 
      ? recentQualities.reduce((sum, q) => sum + q, 0) / recentQualities.length 
      : 0;
    
    qualityTrend.push({ timestamp: now, quality: avgQuality });
    
    // Keep trend data for the last hour
    if (qualityTrend.length > 360) { // 360 points at 10-second intervals = 1 hour
      qualityTrend.shift();
    }
  }

  // Add detailed diagnostics entry
  diagnosticsData.push({
    timestamp: now,
    value,
    isPeak,
    quality,
    processingPriority,
    processTime
  });

  // Keep diagnostics data for the last minute only
  if (diagnosticsData.length > 300) { // ~60 seconds at 5 Hz
    diagnosticsData.shift();
  }
}

/**
 * Get detailed quality stats for diagnostic purposes
 */
export function getDetailedQualityStats() {
  return {
    qualityDistribution,
    qualityTrend: qualityTrend.slice(-20) // Return last 20 trend points
  };
}

/**
 * Get diagnostics data for debugging
 */
export function getDiagnosticsData() {
  return diagnosticsData;
}

/**
 * Clear diagnostics data
 */
export function clearDiagnosticsData() {
  diagnosticsData = [];
  while (qualityValues.length > 0) qualityValues.pop();
  while (qualityTrend.length > 0) qualityTrend.pop();
  
  qualityDistribution.excellent = 0;
  qualityDistribution.good = 0;
  qualityDistribution.moderate = 0;
  qualityDistribution.poor = 0;
}
