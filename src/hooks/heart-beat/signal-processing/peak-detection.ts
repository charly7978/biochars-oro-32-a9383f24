/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

// Diagnostics data storage
const diagnosticsData: Array<{ 
  timestamp: number,
  quality: number,
  processingPriority: 'high' | 'medium' | 'low',
  processTime: number
}> = [];

// Quality statistics storage
const qualityStats = {
  qualityDistribution: { high: 0, medium: 0, low: 0 },
  qualityTrend: [] as number[]
};

/**
 * Get detailed quality statistics
 */
export function getDetailedQualityStats() {
  return { ...qualityStats };
}

/**
 * Clear diagnostics data
 */
export function clearDiagnosticsData() {
  diagnosticsData.length = 0;
  qualityStats.qualityDistribution = { high: 0, medium: 0, low: 0 };
  qualityStats.qualityTrend = [];
}

/**
 * Add diagnostics data
 */
export function addDiagnosticsData(
  quality: number,
  processingPriority: 'high' | 'medium' | 'low',
  processTime: number
) {
  diagnosticsData.push({
    timestamp: Date.now(),
    quality,
    processingPriority,
    processTime
  });
  
  // Keep diagnostics data manageable
  if (diagnosticsData.length > 100) {
    diagnosticsData.shift();
  }
  
  // Update quality distribution
  if (quality >= 70) {
    qualityStats.qualityDistribution.high++;
  } else if (quality >= 40) {
    qualityStats.qualityDistribution.medium++;
  } else {
    qualityStats.qualityDistribution.low++;
  }
  
  // Update quality trend
  qualityStats.qualityTrend.push(quality);
  if (qualityStats.qualityTrend.length > 30) {
    qualityStats.qualityTrend.shift();
  }
}

/**
 * Get diagnostics data
 */
export function getDiagnosticsData() {
  return [...diagnosticsData];
}
