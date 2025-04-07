
/**
 * Captura de frames de la cámara
 * Proporciona funcionalidades para la captura y procesamiento inicial de imágenes
 */
import { logError, ErrorLevel } from "@/utils/debugUtils";

/**
 * Configura la cámara con los parámetros óptimos según el dispositivo
 */
export const configureCameraForDevice = (
  videoTrack: MediaStreamTrack,
  isAndroid: boolean = false, 
  isIOS: boolean = false
): Promise<void> => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const capabilities = videoTrack.getCapabilities();
      logError(`Capacidades de la cámara: ${JSON.stringify(capabilities)}`, ErrorLevel.INFO, "CameraConfig");
      
      const advancedConstraints: MediaTrackConstraintSet[] = [];
      
      // Configuración según plataforma
      if (isAndroid) {
        logError("Configurando para dispositivo Android", ErrorLevel.INFO, "CameraConfig");
        if (capabilities.torch) {
          logError("Activando linterna en Android", ErrorLevel.INFO, "CameraConfig");
          try {
            await videoTrack.applyConstraints({
              advanced: [{ torch: true }]
            });
          } catch (err) {
            logError(`Error al activar linterna en Android: ${err}`, ErrorLevel.WARNING, "CameraConfig", err);
          }
        } else {
          logError("Linterna no disponible en dispositivo Android", ErrorLevel.WARNING, "CameraConfig");
        }
      } else {
        // Configuración para otras plataformas
        logError(`Configurando para ${isIOS ? 'iOS' : 'otros dispositivos'}`, ErrorLevel.INFO, "CameraConfig");
        
        if (capabilities.exposureMode) {
          const exposureConstraint: MediaTrackConstraintSet = { 
            exposureMode: 'continuous' 
          };
          
          if (capabilities.exposureCompensation?.max) {
            exposureConstraint.exposureCompensation = capabilities.exposureCompensation.max;
          }
          
          advancedConstraints.push(exposureConstraint);
        } else {
          logError("Exposición continua no soportada", ErrorLevel.INFO, "CameraConfig");
        }
        
        if (capabilities.focusMode) {
          advancedConstraints.push({ focusMode: 'continuous' });
        } else {
          logError("Enfoque continuo no soportado", ErrorLevel.INFO, "CameraConfig");
        }
        
        if (capabilities.whiteBalanceMode) {
          advancedConstraints.push({ whiteBalanceMode: 'continuous' });
        } else {
          logError("Balance de blancos continuo no soportado", ErrorLevel.INFO, "CameraConfig");
        }
        
        if (capabilities.brightness && capabilities.brightness.max) {
          const maxBrightness = capabilities.brightness.max;
          advancedConstraints.push({ brightness: maxBrightness * 0.2 });
        }
        
        if (capabilities.contrast && capabilities.contrast.max) {
          const maxContrast = capabilities.contrast.max;
          advancedConstraints.push({ contrast: maxContrast * 0.6 });
        }

        if (advancedConstraints.length > 0) {
          logError(`Aplicando configuraciones avanzadas: ${JSON.stringify(advancedConstraints)}`, ErrorLevel.INFO, "CameraConfig");
          try {
            await videoTrack.applyConstraints({
              advanced: advancedConstraints
            });
          } catch (err) {
            logError(`Error al aplicar configuraciones avanzadas: ${err}`, ErrorLevel.WARNING, "CameraConfig", err);
          }
        }

        // Activar linterna para todas las plataformas si está disponible
        if (capabilities.torch) {
          logError("Activando linterna para mejorar la señal PPG", ErrorLevel.INFO, "CameraConfig");
          try {
            await videoTrack.applyConstraints({
              advanced: [{ torch: true }]
            });
          } catch (err) {
            logError(`Error al activar linterna: ${err}`, ErrorLevel.WARNING, "CameraConfig", err);
          }
        } else {
          logError("La linterna no está disponible en este dispositivo", ErrorLevel.WARNING, "CameraConfig");
        }
      }
      
      resolve();
    } catch (error) {
      logError(`Error crítico al configurar la cámara: ${error}`, ErrorLevel.ERROR, "CameraConfig", error);
      // Resolver de todos modos para no bloquear el flujo
      resolve();
    }
  });
};

/**
 * Extrae datos de un frame de la cámara para procesamiento
 */
export const extractFrameData = (
  frame: ImageBitmap, 
  canvas: HTMLCanvasElement, 
  ctx: CanvasRenderingContext2D,
  targetWidth: number = 320,
  targetHeight: number = 240
): ImageData | null => {
  try {
    // Ajustar tamaño del canvas si es necesario
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    
    // Dibujar el frame en el canvas con el tamaño objetivo
    ctx.drawImage(
      frame, 
      0, 0, frame.width, frame.height, 
      0, 0, targetWidth, targetHeight
    );
    
    // Obtener los datos de imagen para procesamiento
    return ctx.getImageData(0, 0, targetWidth, targetHeight);
  } catch (error) {
    logError(`Error al extraer datos del frame: ${error}`, ErrorLevel.ERROR, "FrameExtraction", error);
    return null;
  }
};

/**
 * Procesa frames de la cámara a una tasa controlada
 */
export const processFramesControlled = (
  imageCapture: any, // Use 'any' here to avoid type issues while ensuring global definition works
  isMonitoring: boolean,
  targetFrameRate: number,
  processCallback: (imageData: ImageData) => void
): () => void => {
  let lastProcessTime = 0;
  const targetFrameInterval = 1000 / targetFrameRate;
  let frameCount = 0;
  let lastFpsUpdateTime = Date.now();
  let processingFps = 0;
  let requestId: number | null = null;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;
  
  // Canvas para procesamiento de frames
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d', {willReadFrequently: true});
  
  if (!tempCtx) {
    logError("No se pudo obtener el contexto 2D para procesamiento de frames", ErrorLevel.ERROR, "FrameProcessing");
    return () => {};
  }
  
  // Log start of frame processing
  logError(`Iniciando procesamiento de frames a ${targetFrameRate} FPS`, ErrorLevel.INFO, "FrameProcessing");
  
  const processImage = async () => {
    if (!isMonitoring) return;
    
    const now = Date.now();
    const timeSinceLastProcess = now - lastProcessTime;
    
    // Control de tasa de frames
    if (timeSinceLastProcess >= targetFrameInterval) {
      try {
        const frame = await imageCapture.grabFrame();
        
        const imageData = extractFrameData(frame, tempCanvas, tempCtx);
        if (imageData) {
          processCallback(imageData);
          // Reset error count on success
          consecutiveErrors = 0;
        }
        
        frameCount++;
        lastProcessTime = now;
        
        // Log de rendimiento cada segundo
        if (now - lastFpsUpdateTime > 1000) {
          processingFps = frameCount;
          frameCount = 0;
          lastFpsUpdateTime = now;
          logError(`Rendimiento de procesamiento: ${processingFps} FPS`, ErrorLevel.INFO, "FrameProcessing");
        }
      } catch (error) {
        consecutiveErrors++;
        const errorLevel = consecutiveErrors >= MAX_CONSECUTIVE_ERRORS ? ErrorLevel.ERROR : ErrorLevel.WARNING;
        logError(`Error capturando frame (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${error}`, errorLevel, "FrameProcessing", error);
        
        // If we've had too many consecutive errors, introduce a small delay
        // to avoid overwhelming the system
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          await new Promise(resolve => setTimeout(resolve, 500));
          consecutiveErrors = Math.max(0, consecutiveErrors - 1);
        }
      }
    }
    
    if (isMonitoring) {
      requestId = requestAnimationFrame(processImage);
    }
  };
  
  // Iniciar procesamiento
  requestId = requestAnimationFrame(processImage);
  
  // Retornar función para cancelar el procesamiento
  return () => {
    if (requestId !== null) {
      cancelAnimationFrame(requestId);
      requestId = null;
      logError("Procesamiento de frames detenido", ErrorLevel.INFO, "FrameProcessing");
    }
  };
};
