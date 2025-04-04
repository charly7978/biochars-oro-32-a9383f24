/**
 * Peak detection and diagnostics data collection
 */

// Store diagnostics data
let diagnosticsData: any[] = [];
let qualityScores: number[] = [];
let processingTimes: number[] = [];
let peakIntervals: number[] = [];
let anomalyEvents: any[] = [];

/**
 * Get collected diagnostics data
 */
export function getDiagnosticsData() {
  return [...diagnosticsData];
}

/**
 * Get average diagnostics metrics
 */
export function getAverageDiagnostics() {
  const avgProcessTime = processingTimes.length > 0 ? 
    processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;
  
  const avgQualityScore = qualityScores.length > 0 ? 
    qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 0;
  
  // Calculate peak regularity if we have enough intervals
  let peakRegularity = 0;
  let anomalyPercentage = 0;
  let highPriorityPercentage = 0;
  let avgSignalStrength = 0;
  
  if (peakIntervals.length > 3) {
    const avgInterval = peakIntervals.reduce((a, b) => a + b, 0) / peakIntervals.length;
    const deviations = peakIntervals.map(interval => Math.abs(interval - avgInterval) / avgInterval);
    peakRegularity = 1 - (deviations.reduce((a, b) => a + b, 0) / deviations.length);
  }
  
  if (diagnosticsData.length > 0) {
    const highPriorityCount = diagnosticsData.filter(d => d.priority === 'high').length;
    highPriorityPercentage = (highPriorityCount / diagnosticsData.length) * 100;
    
    const signalStrengths = diagnosticsData.filter(d => d.signalStrength).map(d => d.signalStrength);
    if (signalStrengths.length > 0) {
      avgSignalStrength = signalStrengths.reduce((a, b) => a + b, 0) / signalStrengths.length;
    }
  }
  
  anomalyPercentage = anomalyEvents.length > 0 ? 
    (anomalyEvents.length / Math.max(1, diagnosticsData.length)) * 100 : 0;
  
  return {
    avgProcessTime,
    avgQualityScore,
    peakRegularity,
    anomalyPercentage,
    highPriorityPercentage,
    avgSignalStrength
  };
}

/**
 * Get detailed quality statistics
 */
export function getDetailedQualityStats() {
  // Categorize quality scores
  const excellent = qualityScores.filter(score => score > 0.8).length;
  const good = qualityScores.filter(score => score > 0.6 && score <= 0.8).length;
  const moderate = qualityScores.filter(score => score > 0.4 && score <= 0.6).length;
  const weak = qualityScores.filter(score => score <= 0.4).length;
  
  const total = qualityScores.length || 1;
  
  // Calculate quality distribution as percentages
  const qualityDistribution = {
    excellent: (excellent / total) * 100,
    good: (good / total) * 100,
    moderate: (moderate / total) * 100,
    weak: (weak / total) * 100
  };
  
  // Determine quality trend
  let qualityTrend = "stable";
  if (qualityScores.length > 10) {
    const recent = qualityScores.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const previous = qualityScores.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    
    if (recent > previous * 1.1) qualityTrend = "improving";
    else if (recent < previous * 0.9) qualityTrend = "degrading";
  }
  
  // Most recent quality score
  const lastQualityScore = qualityScores.length > 0 ? 
    qualityScores[qualityScores.length - 1] * 100 : 0;
  
  return {
    qualityDistribution,
    qualityTrend,
    sampleSize: total,
    lastQualityScore,
    anomalyEvents: anomalyEvents.slice(-5) // Last 5 anomalies
  };
}

/**
 * Record diagnostic data
 */
export function recordDiagnostic(data: any) {
  diagnosticsData.push({
    ...data,
    timestamp: Date.now()
  });
  
  // Keep diagnostics data size reasonable
  if (diagnosticsData.length > 1000) {
    diagnosticsData.shift();
  }
}

/**
 * Record signal quality
 */
export function recordQuality(score: number) {
  qualityScores.push(score);
  
  // Keep quality scores size reasonable
  if (qualityScores.length > 1000) {
    qualityScores.shift();
  }
}

/**
 * Record processing time
 */
export function recordProcessingTime(timeMs: number) {
  processingTimes.push(timeMs);
  
  // Keep processing times size reasonable
  if (processingTimes.length > 1000) {
    processingTimes.shift();
  }
}

/**
 * Record peak interval
 */
export function recordPeakInterval(intervalMs: number) {
  peakIntervals.push(intervalMs);
  
  // Keep peak intervals size reasonable
  if (peakIntervals.length > 200) {
    peakIntervals.shift();
  }
}

/**
 * Record anomaly event
 */
export function recordAnomalyEvent(event: any) {
  anomalyEvents.push({
    ...event,
    timestamp: Date.now()
  });
  
  // Keep anomaly events size reasonable
  if (anomalyEvents.length > 50) {
    anomalyEvents.shift();
  }
}
