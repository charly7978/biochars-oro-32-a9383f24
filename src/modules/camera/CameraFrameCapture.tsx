
import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Configura la cámara para un dispositivo específico
 */
export async function configureCameraForDevice(
  videoTrack: MediaStreamTrack,
  isAndroid: boolean,
  isIOS: boolean
): Promise<void> {
  try {
    const capabilities = videoTrack.getCapabilities();
    const settings = videoTrack.getSettings();
    
    logError(`Camera capabilities: ${JSON.stringify(capabilities || {})}, settings: ${JSON.stringify(settings || {})}`, 
      ErrorLevel.INFO, "CameraSetup");

    // Lista de configuraciones ideales
    const advancedConstraints: Record<string, any>[] = [];

    // Configuraciones específicas para Android
    if (isAndroid) {
      if (capabilities?.exposureMode) {
        advancedConstraints.push({ exposureMode: 'continuous' });
      }
      if (capabilities?.focusMode) {
        advancedConstraints.push({ focusMode: 'continuous' });
      }
      if (capabilities?.whiteBalanceMode) {
        advancedConstraints.push({ whiteBalanceMode: 'continuous' });
      }
      if (capabilities?.colorTemperature) {
        advancedConstraints.push({ colorTemperature: 
          Math.floor((capabilities.colorTemperature.max + capabilities.colorTemperature.min) / 2) 
        });
      }
    } 
    // Configuraciones específicas para iOS
    else if (isIOS) {
      if (capabilities?.exposureMode) {
        advancedConstraints.push({ exposureMode: 'continuous' });
      }
      if (capabilities?.focusMode) {
        advancedConstraints.push({ focusMode: 'continuous' });
      }
    } 
    // Configuraciones para desktop
    else {
      if (capabilities?.exposureMode) {
        advancedConstraints.push({ exposureMode: 'continuous' });
      }
      if (capabilities?.focusMode) {
        advancedConstraints.push({ focusMode: 'continuous' });
      }
      if (capabilities?.whiteBalanceMode) {
        advancedConstraints.push({ whiteBalanceMode: 'continuous' });
      }
    }

    // Aplicar restricciones avanzadas si existen
    if (advancedConstraints.length > 0) {
      logError(`Applying advanced constraints: ${JSON.stringify(advancedConstraints)}`, ErrorLevel.INFO, "CameraSetup");
      await videoTrack.applyConstraints({
        advanced: advancedConstraints
      });
    }
  } catch (err) {
    logError(`Error configuring camera: ${err instanceof Error ? err.message : String(err)}`,
      ErrorLevel.WARNING, "CameraSetup");
  }
}

interface ImageCapture {
  grabFrame(): Promise<ImageBitmap>;
}

/**
 * Procesa frames de cámara a una tasa controlada
 */
export function processFramesControlled(
  imageCapture: ImageCapture,
  isActive: boolean,
  frameRate: number,
  onFrameProcessed: (imageData: ImageData) => void
): () => void {
  if (!isActive) return () => {};

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) {
    logError("Failed to get 2D context for frame processing", ErrorLevel.ERROR, "FrameCapture");
    return () => {};
  }

  let lastProcessTime = 0;
  const targetFrameTime = 1000 / frameRate;
  let animationFrameId: number | null = null;
  let processingInProgress = false;
  
  const processFrame = async (timestamp: number) => {
    if (!isActive) return;
    
    // Control frame rate
    const elapsed = timestamp - lastProcessTime;
    if (elapsed < targetFrameTime) {
      animationFrameId = requestAnimationFrame(processFrame);
      return;
    }
    
    // Avoid multiple concurrent processing
    if (processingInProgress) {
      animationFrameId = requestAnimationFrame(processFrame);
      return;
    }
    
    processingInProgress = true;
    lastProcessTime = timestamp;
    
    try {
      // Capturar y procesar frame
      const frameBitmap = await imageCapture.grabFrame();
      
      // Configurar canvas
      if (tempCanvas.width !== frameBitmap.width || tempCanvas.height !== frameBitmap.height) {
        tempCanvas.width = frameBitmap.width;
        tempCanvas.height = frameBitmap.height;
      }
      
      // Dibujar el frame en el canvas
      tempCtx.drawImage(frameBitmap, 0, 0);
      
      // Obtener datos de imagen
      const imageData = tempCtx.getImageData(0, 0, frameBitmap.width, frameBitmap.height);
      
      // Procesar frame
      onFrameProcessed(imageData);
      
      // Liberar recursos
      frameBitmap.close?.();
    } catch (err) {
      logError(`Error processing frame: ${err instanceof Error ? err.message : String(err)}`, 
        ErrorLevel.ERROR, "FrameCapture");
    } finally {
      processingInProgress = false;
      animationFrameId = requestAnimationFrame(processFrame);
    }
  };
  
  // Iniciar el procesamiento
  animationFrameId = requestAnimationFrame(processFrame);
  
  // Función de limpieza para detener el procesamiento
  return () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}
