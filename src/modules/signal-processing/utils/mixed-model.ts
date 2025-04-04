
/**
 * Mixed model utility for signal processing and prediction
 */

// Configuration
const modelConfig = {
  historySize: 20,
  predictionHorizon: 3,
  adaptationRate: 0.1,
  useAdaptiveFiltering: true
};

// State
let signalHistory: number[] = [];
const coefficients = {
  ar: [0.8, -0.2, 0.1],  // AR(3) coefficients
  ma: [0.6, 0.3, 0.1]    // MA(3) coefficients
};
let noiseVariance = 0.01;
let predictionErrors: number[] = [];
const maxErrorsTracked = 10;

/**
 * Process signal and make prediction using mixed model
 */
export function processMixedModel(value: number): {
  filtered: number;
  predicted: number;
  confidence: number;
} {
  // Add to history
  signalHistory.push(value);
  if (signalHistory.length > modelConfig.historySize) {
    signalHistory.shift();
  }
  
  // Not enough data
  if (signalHistory.length < 5) {
    return {
      filtered: value,
      predicted: value,
      confidence: 0
    };
  }
  
  // Apply filtering
  const filtered = applyFilter(value);
  
  // Make prediction
  const predicted = makePrediction();
  
  // Update model parameters adaptively
  if (modelConfig.useAdaptiveFiltering) {
    updateModel(value, predicted);
  }
  
  // Calculate prediction confidence
  const confidence = calculateConfidence();
  
  return {
    filtered,
    predicted,
    confidence
  };
}

/**
 * Apply filtering to signal
 */
function applyFilter(value: number): number {
  if (signalHistory.length < 3) {
    return value;
  }
  
  // AR component
  let arComponent = 0;
  for (let i = 0; i < Math.min(coefficients.ar.length, signalHistory.length - 1); i++) {
    arComponent += coefficients.ar[i] * signalHistory[signalHistory.length - 2 - i];
  }
  
  // MA component (simplified)
  const error = value - arComponent;
  let maComponent = 0;
  for (let i = 0; i < Math.min(coefficients.ma.length, predictionErrors.length); i++) {
    maComponent += coefficients.ma[i] * predictionErrors[i];
  }
  
  // Update errors
  predictionErrors.unshift(error);
  if (predictionErrors.length > maxErrorsTracked) {
    predictionErrors.pop();
  }
  
  // Combine components
  return arComponent + maComponent;
}

/**
 * Make prediction for future values
 */
function makePrediction(): number {
  if (signalHistory.length < 3) {
    return signalHistory[signalHistory.length - 1];
  }
  
  // AR component for prediction
  let prediction = 0;
  for (let i = 0; i < Math.min(coefficients.ar.length, signalHistory.length); i++) {
    prediction += coefficients.ar[i] * signalHistory[signalHistory.length - 1 - i];
  }
  
  // MA component for prediction
  for (let i = 0; i < Math.min(coefficients.ma.length, predictionErrors.length); i++) {
    prediction += coefficients.ma[i] * predictionErrors[i];
  }
  
  return prediction;
}

/**
 * Update model parameters based on prediction error
 */
function updateModel(actual: number, predicted: number): void {
  const error = actual - predicted;
  const adaptationRate = modelConfig.adaptationRate;
  
  // Update AR coefficients
  for (let i = 0; i < coefficients.ar.length; i++) {
    if (i < signalHistory.length - 1) {
      const x = signalHistory[signalHistory.length - 2 - i];
      coefficients.ar[i] += adaptationRate * error * x;
    }
  }
  
  // Update MA coefficients
  for (let i = 0; i < coefficients.ma.length; i++) {
    if (i < predictionErrors.length) {
      coefficients.ma[i] += adaptationRate * error * predictionErrors[i] * 0.1;
    }
  }
  
  // Update noise variance estimate
  noiseVariance = (1 - adaptationRate) * noiseVariance + adaptationRate * error * error;
}

/**
 * Calculate prediction confidence
 */
function calculateConfidence(): number {
  if (predictionErrors.length < 3) {
    return 0;
  }
  
  // Calculate normalized RMSE of recent predictions
  const squaredErrors = predictionErrors.slice(0, 5).map(e => e * e);
  const mse = squaredErrors.reduce((sum, val) => sum + val, 0) / squaredErrors.length;
  const rmse = Math.sqrt(mse);
  
  // Calculate signal strength
  const recent = signalHistory.slice(-5);
  const range = Math.max(...recent) - Math.min(...recent);
  
  // Normalize RMSE by signal range
  const normalizedRmse = range > 0.001 ? rmse / range : 100;
  
  // Convert to confidence score (0-1)
  const confidence = Math.max(0, Math.min(1, 1 - normalizedRmse));
  
  return confidence;
}

/**
 * Reset mixed model
 */
export function resetMixedModel(): void {
  signalHistory = [];
  predictionErrors = [];
  noiseVariance = 0.01;
  
  // Reset coefficients to defaults
  coefficients.ar = [0.8, -0.2, 0.1];
  coefficients.ma = [0.6, 0.3, 0.1];
}

/**
 * Configure mixed model
 */
export function configureMixedModel(config: Partial<typeof modelConfig>): void {
  Object.assign(modelConfig, config);
}

/**
 * Get model state
 */
export function getMixedModelState(): {
  coefficients: typeof coefficients;
  noiseVariance: number;
  historySize: number;
  predictionErrorCount: number;
} {
  return {
    coefficients: {...coefficients},
    noiseVariance,
    historySize: signalHistory.length,
    predictionErrorCount: predictionErrors.length
  };
}
