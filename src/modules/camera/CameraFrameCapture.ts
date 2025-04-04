
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
    
    // Verificar si el track sigue activo
    if (videoTrack.readyState !== 'live') {
      throw new Error("Video track no está activo durante la configuración");
    }
    
    const constraints: MediaTrackConstraintSet = {};
    
    // Configuración común para todos los dispositivos
    if (capabilities?.whiteBalanceMode && capabilities.whiteBalanceMode.includes('continuous')) {
      constraints.whiteBalanceMode = 'continuous';
    }
    
    if (capabilities?.exposureMode && capabilities.exposureMode.includes('continuous')) {
      constraints.exposureMode = 'continuous';
    }
    
    if (capabilities?.focusMode && capabilities.focusMode.includes('continuous')) {
      constraints.focusMode = 'continuous';
    }
    
    // Optimizaciones específicas para Android
    if (isAndroid) {
      // Activar linterna si está disponible
      if (capabilities?.torch) {
        constraints.torch = true;
      }
      
      // Ajustar exposición para Android
      if (capabilities?.exposureTime) {
        // Valores más bajos para dispositivos Android
        constraints.exposureTime = capabilities.exposureTime.max / 3;
      }
    }
    
    // Optimizaciones específicas para iOS
    if (isIOS) {
      // Activar linterna si está disponible
      if (capabilities?.torch) {
        constraints.torch = true;
      }
      
      // Configuraciones específicas para iOS
      if (capabilities?.exposureTime) {
        constraints.exposureTime = capabilities.exposureTime.max / 4;
      }
    }
    
    // Aplicar restricciones
    if (Object.keys(constraints).length > 0) {
      await videoTrack.applyConstraints({ advanced: [constraints] });
      console.log("Restricciones aplicadas a la cámara:", constraints);
    }
  } catch (err) {
    logError(
      `No se pudieron aplicar algunas configuraciones a la cámara: ${err instanceof Error ? err.message : String(err)}`, 
      ErrorLevel.WARNING, 
      "CameraFrameCapture"
    );
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
  let successiveFrames = 0;
  const maxConsecutiveErrors = 5; // Límite para detección de problemas persistentes
  const frameInterval = 1000 / targetFps;
  let isProcessing = true;
  let animationFrameId: number | null = null;
  let lastErrorTime = 0;
  
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
      // Verificar si imageCapture está disponible
      if (!imageCapture) {
        throw new Error("ImageCapture no está disponible");
      }
      
      // Capturar frame
      const imageBitmap = await imageCapture.grabFrame();
      
      // Crear canvas para procesar la imagen
      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("No se pudo obtener contexto 2D");
      }
      
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
      successiveFrames++;
      lastProcessTime = now;
      consecutiveErrors = 0; // Resetear contador de errores
      
      // Log de rendimiento cada 100 frames
      if (frameCount % 100 === 0) {
        const fps = 1000 / elapsed;
        logError(
          `Procesamiento estable: ${frameCount} frames, ${fps.toFixed(1)} FPS, ${successiveFrames} frames consecutivos`, 
          ErrorLevel.DEBUG, 
          "FrameCapture"
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const now = Date.now();
      
      // Incrementar contador de errores consecutivos
      consecutiveErrors++;
      successiveFrames = 0;
      
      // Limitar frecuencia de logs para no saturar
      if (now - lastErrorTime > 1000) {
        if (err instanceof DOMException && err.name === 'InvalidStateError') {
          logError(
            `Error de estado inválido en track (${consecutiveErrors}/${maxConsecutiveErrors}): ${errorMessage}`, 
            ErrorLevel.WARNING, 
            "FrameCapture"
          );
        } else {
          logError(
            `Error capturando frame (${consecutiveErrors}/${maxConsecutiveErrors}): ${errorMessage}`, 
            ErrorLevel.ERROR, 
            "FrameCapture"
          );
        }
        lastErrorTime = now;
      }
      
      // Si hay demasiados errores consecutivos, aplicar backoff
      if (consecutiveErrors >= maxConsecutiveErrors) {
        logError(
          `Demasiados errores consecutivos (${consecutiveErrors}). Aplicando backoff.`, 
          ErrorLevel.ERROR, 
          "FrameCapture"
        );
        
        // Pausa breve antes de reintentar
        setTimeout(() => {
          if (isProcessing && isActive) {
            animationFrameId = requestAnimationFrame(processFrame);
          }
        }, 500);
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
    logError(
      `Procesamiento de frames detenido (${frameCount} frames procesados)`, 
      ErrorLevel.INFO, 
      "FrameCapture"
    );
  };
}
