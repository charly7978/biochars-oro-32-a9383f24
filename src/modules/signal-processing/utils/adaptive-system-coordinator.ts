/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Coordinador del sistema adaptativo
 * Maneja la comunicación y coordinación entre diferentes componentes
 */

import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Tipos de mensajes soportados
 */
export enum MessageType {
  FINGER_DETECTED = 'finger-detected',
  SIGNAL_QUALITY_UPDATE = 'signal-quality-update',
  OPTIMIZATION_REQUEST = 'optimization-request',
  OPTIMIZATION_RESULT = 'optimization-result',
  ERROR = 'error',
  DIAGNOSTIC = 'diagnostic'
}

/**
 * Interfaz para mensajes del sistema adaptativo
 */
export interface AdaptiveSystemMessage {
  type: MessageType;
  source: string;
  data: any;
  timestamp: number;
}

/**
 * Interfaz para el coordinador del sistema adaptativo
 */
export interface AdaptiveSystemCoordinator {
  sendMessage(message: AdaptiveSystemMessage): void;
  registerComponent(componentName: string, messageTypes: MessageType[]): void;
  unregisterComponent(componentName: string): void;
  processMessage(message: AdaptiveSystemMessage): void;
  configure(config: any): void;
  reset(): void;
}

/**
 * Implementación del coordinador del sistema adaptativo
 */
class AdaptiveSystemCoordinatorImpl implements AdaptiveSystemCoordinator {
  private components: Record<string, MessageType[]> = {};
  private config: any = {};
  
  /**
   * Envía un mensaje a todos los componentes registrados
   */
  public sendMessage(message: AdaptiveSystemMessage): void {
    try {
      message.timestamp = Date.now();
      
      for (const componentName in this.components) {
        if (this.components.hasOwnProperty(componentName)) {
          const supportedTypes = this.components[componentName];
          
          if (supportedTypes.includes(message.type)) {
            this.processMessage({ ...message, destination: componentName });
          }
        }
      }
    } catch (error) {
      logError(
        `Error al enviar mensaje: ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystemCoordinator"
      );
    }
  }
  
  /**
   * Registra un componente en el sistema
   */
  public registerComponent(componentName: string, messageTypes: MessageType[]): void {
    try {
      this.components[componentName] = messageTypes;
      logError(
        `Componente registrado: ${componentName} - Tipos: ${messageTypes.join(', ')}`,
        ErrorLevel.INFO,
        "AdaptiveSystemCoordinator"
      );
    } catch (error) {
      logError(
        `Error al registrar componente: ${componentName} - ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystemCoordinator"
      );
    }
  }
  
  /**
   * Elimina un componente del sistema
   */
  public unregisterComponent(componentName: string): void {
    try {
      delete this.components[componentName];
      logError(
        `Componente eliminado: ${componentName}`,
        ErrorLevel.INFO,
        "AdaptiveSystemCoordinator"
      );
    } catch (error) {
      logError(
        `Error al eliminar componente: ${componentName} - ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystemCoordinator"
      );
    }
  }
  
  /**
   * Procesa un mensaje específico para un componente
   */
  public processMessage(message: AdaptiveSystemMessage): void {
    try {
      if (!message.destination) {
        logError(
          `Mensaje sin destino: ${message.type} from ${message.source}`,
          ErrorLevel.WARNING,
          "AdaptiveSystemCoordinator"
        );
        return;
      }
      
      // Simular procesamiento (reemplazar con lógica real)
      logError(
        `Mensaje procesado: ${message.type} from ${message.source} to ${message.destination}`,
        ErrorLevel.DEBUG,
        "AdaptiveSystemCoordinator"
      );
      
      // Aquí se podría invocar una función específica del componente
      // o actualizar el estado del componente directamente
      
    } catch (error) {
      logError(
        `Error al procesar mensaje: ${message.type} - ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystemCoordinator"
      );
    }
  }
  
  /**
   * Configura el coordinador con opciones personalizadas
   */
  public configure(config: any): void {
    try {
      this.config = { ...this.config, ...config };
      logError(
        `Sistema adaptativo configurado: ${JSON.stringify(this.config)}`,
        ErrorLevel.INFO,
        "AdaptiveSystemCoordinator"
      );
    } catch (error) {
      logError(
        `Error al configurar sistema adaptativo: ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystemCoordinator"
      );
    }
  }
  
  /**
   * Reinicia el coordinador y todos sus componentes
   */
  public reset(): void {
    try {
      this.components = {};
      this.config = {};
      logError(
        "Sistema adaptativo reiniciado",
        ErrorLevel.INFO,
        "AdaptiveSystemCoordinator"
      );
    } catch (error) {
      logError(
        `Error al reiniciar sistema adaptativo: ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystemCoordinator"
      );
    }
  }
}

// Singleton instance
let adaptiveSystemCoordinator: AdaptiveSystemCoordinator | null = null;

/**
 * Obtiene la instancia del coordinador del sistema adaptativo
 */
export function getAdaptiveSystemCoordinator(): AdaptiveSystemCoordinator {
  if (!adaptiveSystemCoordinator) {
    adaptiveSystemCoordinator = new AdaptiveSystemCoordinatorImpl();
  }
  return adaptiveSystemCoordinator;
}

export type { AdaptiveSystemCoordinator };
