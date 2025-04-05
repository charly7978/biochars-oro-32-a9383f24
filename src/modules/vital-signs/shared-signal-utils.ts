
/**
 * Shared utility functions for vital signs processing
 * Provides consistent validation and transformation across all processors
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  diagnosticInfo?: Record<string, any>;
}

/**
 * Value range definition for validation
 */
export interface ValueRange {
  min: number;
  max: number;
  unit: string;
  label: string;
}

/**
 * Physiological ranges for vital signs
 */
export const PHYSIOLOGICAL_RANGES = {
  SPO2: { min: 80, max: 100, unit: '%', label: 'SpO2' },
  HEART_RATE: { min: 30, max: 220, unit: 'bpm', label: 'Heart Rate' },
  SYSTOLIC: { min: 70, max: 200, unit: 'mmHg', label: 'Systolic Pressure' },
  DIASTOLIC: { min: 40, max: 130, unit: 'mmHg', label: 'Diastolic Pressure' },
  GLUCOSE: { min: 50, max: 400, unit: 'mg/dL', label: 'Blood Glucose' },
  CHOLESTEROL: { min: 100, max: 300, unit: 'mg/dL', label: 'Total Cholesterol' },
  HYDRATION: { min: 45, max: 100, unit: '%', label: 'Hydration' }
};

/**
 * Validate a value against physiological range
 */
export function validatePhysiologicalValue(
  value: number, 
  range: ValueRange,
  tolerance: number = 0  // Allow slight out of range with tolerance
): ValidationResult {
  if (isNaN(value) || value === null || value === undefined) {
    return {
      isValid: false,
      errorCode: 'INVALID_VALUE',
      errorMessage: `${range.label} value is not a valid number`,
      diagnosticInfo: { receivedValue: value }
    };
  }
  
  const effectiveMin = range.min - tolerance;
  const effectiveMax = range.max + tolerance;
  
  if (value < effectiveMin || value > effectiveMax) {
    return {
      isValid: false,
      errorCode: 'OUT_OF_RANGE',
      errorMessage: `${range.label} value ${value}${range.unit} is outside physiological range ${range.min}${range.unit}-${range.max}${range.unit}`,
      diagnosticInfo: {
        value,
        range: `${range.min}${range.unit}-${range.max}${range.unit}`,
        tolerance
      }
    };
  }
  
  return { isValid: true };
}

/**
 * Apply a simple moving average filter to a signal
 */
export function applySMAFilter(value: number, buffer: number[], windowSize: number = 5): number {
  if (!buffer || buffer.length === 0) return value;
  
  const effectiveWindow = Math.min(windowSize, buffer.length);
  const relevantValues = buffer.slice(-effectiveWindow);
  const sum = relevantValues.reduce((a, b) => a + b, 0);
  
  return sum / effectiveWindow;
}

/**
 * Apply an exponential moving average filter to a signal
 */
export function applyEMAFilter(value: number, buffer: number[], alpha: number = 0.3): number {
  if (!buffer || buffer.length === 0) return value;
  
  const lastValue = buffer[buffer.length - 1];
  return alpha * value + (1 - alpha) * lastValue;
}

/**
 * Calculate signal quality based on variance and amplitude
 */
export function calculateSignalQuality(buffer: number[], minVariance: number = 0.001, maxVariance: number = 1.0): number {
  if (!buffer || buffer.length < 3) return 0;
  
  // Calculate mean, variance and amplitude
  const mean = buffer.reduce((a, b) => a + b, 0) / buffer.length;
  const variance = buffer.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / buffer.length;
  const amplitude = Math.max(...buffer) - Math.min(...buffer);
  
  // Low variance (flat signal) or extremely high variance (noise) both indicate poor quality
  if (variance < minVariance || variance > maxVariance) {
    return Math.max(0, Math.min(100, (variance < minVariance ? variance / minVariance : maxVariance / variance) * 50));
  }
  
  // Amplitude factor - neither too small nor too large
  const amplitudeFactor = Math.min(amplitude, 0.5) / 0.5;
  
  // Buffer size factor - more data points means higher confidence
  const bufferSizeFactor = Math.min(buffer.length / 30, 1);
  
  // Combine factors for overall quality
  const quality = (amplitudeFactor * 0.6 + bufferSizeFactor * 0.4) * 100;
  
  return Math.max(0, Math.min(100, quality));
}
