/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Utilidades centralizadas para el procesamiento de señales PPG reales.
 * Solo utiliza datos reales sin simulación.
 */

// Constantes para procesamiento de señales reales
export const SIGNAL_CONSTANTS = {
  MIN_VALID_VALUES: 120,
  MIN_AMPLITUDE: 0.05,
  PERFUSION_INDEX_THRESHOLD: 0.06,
  SMA_WINDOW: 3,
  DEFAULT_BUFFER_SIZE: 300
};

/**
 * Aplica un filtro de media móvil simple a datos reales
 */
export function applySMAFilter(value: number, buffer: number[], windowSize: number = SIGNAL_CONSTANTS.SMA_WINDOW): {
  filteredValue: number;
  updatedBuffer: number[];
} {
  const updatedBuffer = [...buffer, value];
  if (updatedBuffer.length > windowSize) {
    updatedBuffer.shift();
  }
  const filteredValue = updatedBuffer.reduce((a, b) => a + b, 0) / updatedBuffer.length;
  return { filteredValue, updatedBuffer };
}

/**
 * Calcula la desviación estándar de datos reales
 */
export function calculateStandardDeviation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sqDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(avgSqDiff);
}

/**
 * Calcula el componente AC (amplitud pico a pico) de una señal real
 */
export function calculateAC(values: number[]): number {
  if (values.length < 2) return 0; // Need at least two points
  return Math.max(...values) - Math.min(...values);
}

/**
 * Calcula el componente DC (valor promedio) de una señal real
 */
export function calculateDC(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Normaliza valores reales al rango [0,1]
 */
export function normalizeValues(values: number[]): number[] {
  if (values.length < 2) return values; // Avoid division by zero or NaN
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  // Handle cases where range is very small or zero to avoid division by zero or large numbers
  if (range < 1e-6) { // Use a small epsilon
      // Return an array of zeros or the mean value, depending on desired behavior for flat signals
      // Returning zeros is simple, but might lose information if the signal is just very stable.
      // Alternative: return Array(values.length).fill(0.5) or similar.
      return values.map(() => 0); 
  }
  return values.map(v => (v - min) / range);
}


/**
 * Encuentra picos y valles en una señal real (implementación de shared-signal-utils)
 */
export function findPeaksAndValleys(values: number[]): { peakIndices: number[]; valleyIndices: number[] } {
  const peakIndices: number[] = [];
  const valleyIndices: number[] = [];
  const lookaround = 2; // How many points to look around on each side

  if (values.length <= 2 * lookaround) {
      return { peakIndices, valleyIndices }; // Not enough data to find peaks/valleys reliably
  }

  for (let i = lookaround; i < values.length - lookaround; i++) {
    const v = values[i];
    let isPeak = true;
    let isValley = true;

    // Check neighbors for peak condition
    for (let j = 1; j <= lookaround; j++) {
      if (v < values[i - j] || v < values[i + j]) {
        isPeak = false;
        break;
      }
    }
     // Add stricter condition for peak: must be significantly larger than neighbors
    if (isPeak) {
       if (v <= values[i-1] && v <= values[i+1]) isPeak = false; // Ensure it's strictly greater than immediate neighbors
    }


    // Check neighbors for valley condition
    for (let j = 1; j <= lookaround; j++) {
      if (v > values[i - j] || v > values[i + j]) {
        isValley = false;
        break;
      }
    }
     // Add stricter condition for valley: must be significantly smaller than neighbors
     if (isValley) {
         if (v >= values[i-1] && v >= values[i+1]) isValley = false; // Ensure it's strictly smaller than immediate neighbors
     }

    if (isPeak) {
      peakIndices.push(i);
    } else if (isValley) { // Use else if because a point cannot be both peak and valley
      valleyIndices.push(i);
    }
  }
  return { peakIndices, valleyIndices };
}

/**
 * Calcula la amplitud entre picos y valles de señales reales (implementación de shared-signal-utils con recorte)
 */
export function calculateAmplitude(
  values: number[],
  peakIndices: number[],
  valleyIndices: number[]
): number {
  if (peakIndices.length === 0 || valleyIndices.length === 0 || values.length === 0) return 0;

  const amps: number[] = [];
  // More robust pairing: Iterate through peaks and find the nearest preceding valley within a reasonable distance
  let lastValleyIdx = -1;
   for (const peakIdx of peakIndices) {
      let bestValleyIdx = -1;
      let minDistance = values.length; // Initialize with a large distance

       // Find the closest *preceding* valley
      for (const valleyIdx of valleyIndices) {
         if (valleyIdx < peakIdx) {
             const distance = peakIdx - valleyIdx;
             if (distance < minDistance) {
                 minDistance = distance;
                 bestValleyIdx = valleyIdx;
             }
         }
      }

       // Ensure the valley is reasonably close and hasn't been used for a previous peak in this pass
      // A simple distance check might suffice, e.g., minDistance < (average RR interval estimate if available)
      // For now, just ensure a valley was found before the peak
      if (bestValleyIdx !== -1 && bestValleyIdx > lastValleyIdx) {
           const amp = values[peakIdx] - values[bestValleyIdx];
           if (amp > 0) { // Amplitude must be positive
               amps.push(amp);
               lastValleyIdx = bestValleyIdx; // Mark valley as 'used' for this simple pairing
           }
      }
  }


  if (amps.length < 3) { // Require a minimum number of valid amplitudes for stable calculation
      return amps.length > 0 ? amps.reduce((a, b) => a + b, 0) / amps.length : 0;
  }


  // Calcular media robusta (trimmed mean) con datos reales
  amps.sort((a, b) => a - b);
  const trimPercent = 0.1; // Trim 10% from each end
  const startIndex = Math.floor(amps.length * trimPercent);
  const endIndex = Math.ceil(amps.length * (1 - trimPercent)); // Exclusive index
  
  // Ensure endIndex doesn't exceed length and startIndex is valid
   const finalEndIndex = Math.min(amps.length, endIndex);
   const finalStartIndex = Math.max(0, startIndex);

   if (finalEndIndex <= finalStartIndex) {
      // Fallback if trimming leaves no data
       return amps.reduce((a, b) => a + b, 0) / amps.length;
   }

  const trimmedAmps = amps.slice(finalStartIndex, finalEndIndex);

  return trimmedAmps.length > 0
    ? trimmedAmps.reduce((a, b) => a + b, 0) / trimmedAmps.length
    : amps.reduce((a, b) => a + b, 0) / amps.length; // Fallback if trimming fails
}


/**
 * Filtro Kalman para señales reales (de shared-signal-utils)
 */
export class KalmanFilter {
  private R: number = 0.01; // Measurement noise covariance - Can be tuned
  private Q: number = 0.1;  // Process noise covariance - Represents uncertainty in the model
  private P: number = 1.0;  // Estimation error covariance
  private X: number = 0.0;  // State estimate
  private K: number = 0.0;  // Kalman gain

  /**
   * Aplica el filtro Kalman a mediciones reales
   */
  filter(measurement: number): number {
    // Prediction step
    // In this simple case, we assume the state doesn't change, X_predicted = X_previous
    // P_predicted = P_previous + Q
    this.P = this.P + this.Q;

    // Update step
    // K = P_predicted / (P_predicted + R)
    this.K = this.P / (this.P + this.R);
    // X_updated = X_predicted + K * (measurement - X_predicted)
    this.X = this.X + this.K * (measurement - this.X);
    // P_updated = (1 - K) * P_predicted
    this.P = (1 - this.K) * this.P;

    return this.X;
  }

  /**
   * Reinicia el filtro a un estado inicial.
   * @param initialState Opcional: valor inicial para el estado. Default es 0.
   * @param initialCovariance Opcional: covarianza inicial. Default es 1.
   */
  reset(initialState: number = 0.0, initialCovariance: number = 1.0): void {
    this.X = initialState;
    this.P = initialCovariance;
    this.K = 0.0; // Reset Kalman gain as well
  }

   /**
    * Configura los parámetros del filtro Kalman.
    * @param R Measurement noise covariance.
    * @param Q Process noise covariance.
    */
   configure(R: number, Q: number): void {
       if (R > 0 && Q > 0) {
           this.R = R;
           this.Q = Q;
       } else {
           console.warn("KalmanFilter: R and Q must be positive. Keeping previous values.");
       }
   }
}


/**
 * Evaluador de calidad para señales reales (de shared-signal-utils)
 */
export function evaluateSignalQuality(
  values: number[],
  minSamples: number = 30, // Minimum samples needed for quality assessment
  amplitudeThreshold: number = SIGNAL_CONSTANTS.MIN_AMPLITUDE,
  stabilityWindow: number = 10 // Window size for stability check
): number {
  if (values.length < minSamples) return 0; // Not enough data

  const recentValues = values.slice(-minSamples);

  // 1. Amplitude Check
  const min = Math.min(...recentValues);
  const max = Math.max(...recentValues);
  const range = max - min;
  if (range < amplitudeThreshold) return 10; // Very low amplitude signal -> Low quality

  // 2. Variability Check (Coefficient of Variation)
  const mean = calculateDC(recentValues);
  if (mean === 0) return 15; // Avoid division by zero, likely low quality if mean is 0
  const stdDev = calculateStandardDeviation(recentValues);
  const cv = stdDev / mean;
  let variabilityScore = 0;
  if (cv < 0.02) variabilityScore = 30; // Too stable, possibly noise or flat signal
  else if (cv > 0.5) variabilityScore = 40; // Too variable, likely noisy
  else variabilityScore = 85; // Good variability

  // 3. Peak Regularity Check
  const { peakIndices } = findPeaksAndValleys(recentValues);
  let peakRegularityScore = 30; // Default low score if not enough peaks
  if (peakIndices.length >= 4) { // Need at least 4 peaks for regularity check
    const peakDiffs = [];
    for (let i = 1; i < peakIndices.length; i++) {
      peakDiffs.push(peakIndices[i] - peakIndices[i - 1]);
    }
    if (peakDiffs.length > 0) {
       const avgDiff = calculateDC(peakDiffs);
       if (avgDiff > 0) {
           const diffStdDev = calculateStandardDeviation(peakDiffs);
           const diffCv = diffStdDev / avgDiff; // Coefficient of variation for intervals
           // Higher score for lower variation (more regular)
           peakRegularityScore = Math.max(0, 100 - diffCv * 200); // Scaled score
       }
    }
  }

   // 4. Baseline Stability Check
   let baselineStabilityScore = 50; // Default score
   if (values.length >= stabilityWindow * 2) {
       const recentBaseline = calculateDC(values.slice(-stabilityWindow));
       const olderBaseline = calculateDC(values.slice(-2 * stabilityWindow, -stabilityWindow));
       if (olderBaseline !== 0) {
          const baselineShift = Math.abs(recentBaseline - olderBaseline) / Math.abs(olderBaseline);
          // Higher score for lower shift (more stable)
           baselineStabilityScore = Math.max(0, 100 - baselineShift * 500);
       }
   }


  // Combine scores (adjust weights as needed)
  const qualityScore = 
      (range > amplitudeThreshold ? 1 : 0.1) * // Basic amplitude check acts as a gate
      ( (peakRegularityScore * 0.4) + 
        (variabilityScore * 0.3) +
        (baselineStabilityScore * 0.3) );

  return Math.max(0, Math.min(100, Math.round(qualityScore))); // Clamp between 0 and 100
}

/**
 * Amplifica la señal real de forma adaptativa basada en su amplitud (de vitalSignsUtils).
 * Sin uso de datos simulados.
 * NOTA: Esta función es más simple que la de SignalAmplifier.ts, se mantiene por compatibilidad si es necesaria.
 */
export function amplifySignalBasic(value: number, recentValues: number[]): number {
  if (recentValues.length < 3) return value; // Need some history

  // Calcular la amplitud reciente de datos reales
  const recentMin = Math.min(...recentValues);
  const recentMax = Math.max(...recentValues);
  const recentRange = recentMax - recentMin;

  // Factor de amplificación simple para señales reales
  let amplificationFactor = 1.0;
  if (recentRange < 0.1) {
    amplificationFactor = 2.5;
  } else if (recentRange < 0.3) {
    amplificationFactor = 1.8;
  } else if (recentRange < 0.5) {
    amplificationFactor = 1.4;
  }

  // Amplificar usando solo datos reales
  const mean = calculateDC(recentValues); // Use existing DC function
  const centeredValue = value - mean;
  const amplifiedValue = (centeredValue * amplificationFactor) + mean;

  return amplifiedValue;
} 