
import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Configura la cámara con los parámetros óptimos según el dispositivo
 */
export async function configureCameraForDevice(
  videoTrack: MediaStreamTrack, 
  isAndroid: boolean, 
  isIOS: boolean
): Promise<void> {
  try {
    const capabilities = videoTrack.getCapabilities();
    console.log("Capacidades del video track:", capabilities);
    
    const constraints: MediaTrackConstraintSet = {};
    
    // Configuración común para todos los dispositivos
    if (capabilities.whiteBalanceMode && capabilities.whiteBalanceMode.includes('continuous')) {
      constraints.whiteBalanceMode = 'continuous';
    }
    
    if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
      constraints.exposureMode = 'continuous';
    }
    
    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
      constraints.focusMode = 'continuous';
    }
    
    // Optimizaciones específicas para Android
    if (isAndroid) {
      if (capabilities.exposureTime) {
        constraints.exposureTime = capabilities.exposureTime.max / 2;
      }
      
      if (capabilities.colorTemperature) {
        constraints.colorTemperature = 3500; // Optimizado para iluminación cálida
      }
    }
    
    // Optimizaciones específicas para iOS
    if (isIOS) {
      if (capabilities.exposureTime) {
        constraints.exposureTime = capabilities.exposureTime.max / 3;
      }
    }
    
    // Aplicar restricciones
    if (Object.keys(constraints).length > 0) {
      await videoTrack.applyConstraints({ advanced: [constraints] });
      console.log("Restricciones aplicadas a la cámara:", constraints);
    }
  } catch (err) {
    console.warn("No se pudieron aplicar algunas configuraciones a la cámara:", err);
  }
}

/**
 * Función mejorada para procesar frames de manera controlada
 * con mejor manejo de errores y detección de errores de track
 */
export function processFramesControlled(
  imageCapture: any,
  isActive: boolean,
  targetFps: number = 30,
  onFrameCallback: (imageData: ImageData) => void
): () => void {
  let frameCount = 0;
  let lastProcessTime = 0;
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 5; // Límite para detección de problemas persistentes
  const frameInterval = 1000 / targetFps;
  let isProcessing = true;
  let animationFrameId: number | null = null;
  
  // Función que procesa un frame
  const processFrame = async () => {
    if (!isProcessing || !isActive) {
      return;
    }
    
    const now = performance.now();
    const elapsed = now - lastProcessTime;
    
    // Control de velocidad de cuadros
    if (elapsed < frameInterval) {
      animationFrameId = requestAnimationFrame(processFrame);
      return;
    }
    
    try {
      // Capturar frame
      const imageBitmap = await imageCapture.grabFrame();
      
      // Crear canvas para procesar la imagen
      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Dibujar imagen en el canvas
        ctx.drawImage(imageBitmap, 0, 0);
        
        // Obtener datos de la imagen
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Procesar frame
        if (onFrameCallback) {
          onFrameCallback(imageData);
        }
        
        // Actualizar contadores
        frameCount++;
        lastProcessTime = now;
        consecutiveErrors = 0; // Resetear contador de errores
      }
    } catch (err) {
      consecutiveErrors++;
      
      if (err instanceof DOMException && err.name === 'InvalidStateError') {
        logError(`Error de estado inválido en track (${consecutiveErrors}/${maxConsecutiveErrors})`, 
          ErrorLevel.WARNING, "FrameCapture");
      } else {
        logError(`Error capturando frame: ${err}`, ErrorLevel.ERROR, "FrameCapture");
      }
      
      // Si hay demasiados errores consecutivos, parar el procesamiento
      if (consecutiveErrors >= maxConsecutiveErrors) {
        logError(`Demasiados errores consecutivos (${consecutiveErrors}). Deteniendo procesamiento de frames.`, 
          ErrorLevel.ERROR, "FrameCapture");
        
        // Notificar problema pero no detener completamente para permitir recuperación
        isProcessing = false;
        return;
      }
    } finally {
      // Continuar procesando si aún está activo
      if (isProcessing && isActive) {
        animationFrameId = requestAnimationFrame(processFrame);
      }
    }
  };
  
  // Iniciar procesamiento
  processFrame();
  
  // Función para detener el procesamiento
  return () => {
    isProcessing = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    logError(`Procesamiento de frames detenido (${frameCount} frames procesados)`, 
      ErrorLevel.INFO, "FrameCapture");
  };
}
