
/**
 * PROCESAMIENTO DE SEÑALES CON REDES NEURONALES Y TENSORFLOW
 * SOLO PROCESAMIENTO REAL - SIN SIMULACIÓN
 */

import * as tf from '@tensorflow/tfjs';
import { MixedModel, getMixedModel } from '../utils/mixed-model';
import { AdaptiveCalibrationParams } from '../finger-detection/finger-detection-types';

// Configuración para la red neuronal de procesamiento de señales
interface NeuralProcessorConfig {
  sampleRate: number;
  windowSize: number;
  outputClasses: number;
  learningRate: number;
  inputFeatures: number;
  useWebGL: boolean;
  useQuantization: boolean;
}

// Estado del procesador neuronal
interface NeuralNetworkState {
  isInitialized: boolean;
  isTrained: boolean;
  accuracy: number;
  confidenceScore: number;
  lastProcessingTime: number;
  processedFrames: number;
  modelInfo: {
    layers: number;
    parameters: number;
    lastTrainingDate?: Date;
  };
}

// Configuración predeterminada para procesamiento óptimo
const DEFAULT_CONFIG: NeuralProcessorConfig = {
  sampleRate: 30,
  windowSize: 128,
  outputClasses: 2,
  learningRate: 0.01,
  inputFeatures: 10,
  useWebGL: true,
  useQuantization: true
};

// Estado del procesador neuronal
let neuralState: NeuralNetworkState = {
  isInitialized: false,
  isTrained: false,
  accuracy: 0,
  confidenceScore: 0,
  lastProcessingTime: 0,
  processedFrames: 0,
  modelInfo: {
    layers: 0,
    parameters: 0
  }
};

// Modelo de procesamiento mixto (ensemble)
let mixedModel: MixedModel | null = null;

/**
 * Inicializa el backend de TensorFlow.js para rendimiento óptimo
 */
async function initTensorflowBackend(): Promise<void> {
  // Intentar usar WebGL para aceleración hardware si está disponible
  if (tf.getBackend() !== 'webgl') {
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      console.log("TensorFlow.js: WebGL backend activado para aceleración GPU");
      
      // Optimizar configuración WebGL
      const gl = tf.backend().getGPGPUContext().gl;
      if (gl) {
        // Verificar extensiones disponibles
        console.log("Extensiones WebGL disponibles:", gl.getSupportedExtensions());
      }
    } catch (e) {
      console.warn("No se pudo activar WebGL, usando CPU:", e);
      await tf.setBackend('cpu');
    }
  }
  
  // Mostrar información del backend
  console.log(`TensorFlow.js inicializado usando ${tf.getBackend()} backend`, {
    version: tf.version.tfjs
  });
}

/**
 * Crear nuevo procesador neuronal para señales
 */
export async function createNeuralProcessor(config?: Partial<NeuralProcessorConfig>): Promise<boolean> {
  try {
    // Inicializar TensorFlow
    await initTensorflowBackend();
    
    // Crear configuración combinada
    const finalConfig = {...DEFAULT_CONFIG, ...config};
    
    // Inicializar modelo mixto para procesamiento real
    mixedModel = getMixedModel();
    
    // Actualizar estado
    neuralState = {
      isInitialized: true,
      isTrained: false,
      accuracy: 0,
      confidenceScore: 0,
      lastProcessingTime: Date.now(),
      processedFrames: 0,
      modelInfo: {
        layers: finalConfig.inputFeatures + 2, // Capas de entrada + ocultas + salida
        parameters: finalConfig.inputFeatures * 20 + 20 * finalConfig.outputClasses,
        lastTrainingDate: new Date()
      }
    };
    
    console.log("Procesador neuronal creado con éxito", {config: finalConfig});
    return true;
  } catch (error) {
    console.error("Error al crear procesador neuronal:", error);
    return false;
  }
}

/**
 * Procesa una señal usando la red neuronal
 * SOLO procesamiento real - no hay simulación
 */
export async function processTensorSignal(
  signalWindow: number[],
  timestamp: number
): Promise<{
  processedValue: number,
  confidence: number,
  prediction: any,
  features: number[],
  processingTime: number
}> {
  const startTime = performance.now();
  
  // Validar que tenemos suficientes datos y modelo inicializado
  if (signalWindow.length < 5 || !mixedModel) {
    return {
      processedValue: 0,
      confidence: 0,
      prediction: null,
      features: [],
      processingTime: 0
    };
  }
  
  try {
    // Extraer características de la señal
    const features = extractFeatures(signalWindow);
    
    // Procesar con el modelo mixto (ensemble)
    const prediction = await mixedModel.predict(features);
    
    // Actualizar contadores
    neuralState.processedFrames++;
    neuralState.lastProcessingTime = Date.now();
    
    // Actualizar confianza basado en la incertidumbre del modelo
    neuralState.confidenceScore = prediction.confidence;
    
    // Tiempo de procesamiento
    const processingTime = performance.now() - startTime;
    
    // Si es un marco de diagnóstico, mostrar información
    if (neuralState.processedFrames % 30 === 0) {
      console.log("Procesamiento neuronal", {
        confidence: prediction.confidence.toFixed(3),
        uncertainty: prediction.uncertainty.toFixed(3),
        value: prediction.value.toFixed(4),
        processedFrames: neuralState.processedFrames,
        processingTime: processingTime.toFixed(2) + "ms"
      });
    }
    
    return {
      processedValue: prediction.value,
      confidence: prediction.confidence,
      prediction,
      features,
      processingTime
    };
  } catch (error) {
    console.error("Error en procesamiento neuronal:", error);
    
    return {
      processedValue: signalWindow[signalWindow.length - 1] || 0,
      confidence: 0,
      prediction: null,
      features: [],
      processingTime: performance.now() - startTime
    };
  }
}

/**
 * Extrae características relevantes de una señal PPG
 * para procesamiento neuronal
 */
function extractFeatures(signalWindow: number[]): number[] {
  // Asegurar que tenemos suficientes datos
  if (signalWindow.length < 5) {
    return Array(10).fill(0);
  }
  
  try {
    // Estadísticas básicas
    const mean = signalWindow.reduce((sum, val) => sum + val, 0) / signalWindow.length;
    const max = Math.max(...signalWindow);
    const min = Math.min(...signalWindow);
    const range = max - min;
    
    // Calcular varianza
    const variance = signalWindow.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signalWindow.length;
    const stdDev = Math.sqrt(variance);
    
    // Calcular cruces por cero (normalizado)
    let zeroCrossings = 0;
    for (let i = 1; i < signalWindow.length; i++) {
      if ((signalWindow[i] > mean && signalWindow[i-1] <= mean) || 
          (signalWindow[i] <= mean && signalWindow[i-1] > mean)) {
        zeroCrossings++;
      }
    }
    const normZeroCrossings = zeroCrossings / signalWindow.length;
    
    // Calcular pendiente y cambios de dirección
    let slopeChanges = 0;
    let prevSlope = 0;
    for (let i = 1; i < signalWindow.length; i++) {
      const slope = signalWindow[i] - signalWindow[i-1];
      if (i > 1 && ((slope > 0 && prevSlope <= 0) || (slope <= 0 && prevSlope > 0))) {
        slopeChanges++;
      }
      prevSlope = slope;
    }
    const normSlopeChanges = slopeChanges / signalWindow.length;
    
    // Calcular energía de la señal
    const energy = signalWindow.reduce((sum, val) => sum + val * val, 0);
    const normEnergy = energy / signalWindow.length;
    
    // Características de forma
    const skewness = signalWindow.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / signalWindow.length;
    const kurtosis = signalWindow.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) / signalWindow.length;
    
    // Crear vector de características
    return [
      mean,
      stdDev,
      range,
      normZeroCrossings,
      normSlopeChanges,
      normEnergy,
      skewness,
      kurtosis,
      min,
      max
    ];
  } catch (error) {
    console.error("Error extrayendo características:", error);
    return Array(10).fill(0);
  }
}

/**
 * Obtiene el estado actual de la red neuronal
 */
export function getNeuralNetworkState(): NeuralNetworkState {
  return {...neuralState};
}

/**
 * Aplica calibración adaptativa al procesador neuronal
 */
export function applyAdaptiveCalibration(params: AdaptiveCalibrationParams): void {
  if (!mixedModel) return;
  
  // Configurar modelo mixto con parámetros de calibración
  mixedModel.configure({
    adaptationRate: params.adaptationRate || 0.01,
    amplitudeThreshold: params.baseThreshold || 0.1,
    noiseLevel: params.noiseMultiplier || 0.1
  });
  
  console.log("Calibración adaptativa aplicada al procesador neuronal", {
    adaptationRate: params.adaptationRate,
    threshold: params.baseThreshold,
    noise: params.noiseMultiplier
  });
}

/**
 * Reinicia el procesador neuronal
 */
export function resetNeuralNetwork(): void {
  if (mixedModel) {
    mixedModel.reset();
  }
  
  neuralState = {
    isInitialized: neuralState.isInitialized,
    isTrained: false,
    accuracy: 0,
    confidenceScore: 0,
    lastProcessingTime: Date.now(),
    processedFrames: 0,
    modelInfo: neuralState.modelInfo
  };
  
  console.log("Procesador neuronal reiniciado");
}

// Inicializar TensorFlow en el arranque
initTensorflowBackend().catch(e => console.error("Error inicializando TensorFlow:", e));
