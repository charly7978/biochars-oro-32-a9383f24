/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Implementación de buffer circular optimizado
 * Proporciona almacenamiento eficiente para señales
 */
import { CircularBufferState } from '../types';
import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Buffer circular para valores
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;
  private readonly capacity: number;
  private readonly useTypeChecking: boolean;
  private readonly useAverageTracking: boolean;
  private sumValue: number = 0;
  private minValue: number = 0;
  private maxValue: number = 0;
  
  /**
   * Constructor del buffer circular
   */
  constructor(
    capacity: number, 
    useTypeChecking: boolean = false,
    useAverageTracking: boolean = false
  ) {
    this.capacity = Math.max(1, capacity);
    this.buffer = new Array<T>(this.capacity);
    this.useTypeChecking = useTypeChecking;
    this.useAverageTracking = useAverageTracking;
  }
  
  /**
   * Añade un valor al buffer
   */
  public push(value: T): void {
    try {
      if (this.useTypeChecking && typeof value !== typeof this.buffer[0] && this.size > 0) {
        throw new Error(`Tipo de dato inválido: ${typeof value}, se esperaba ${typeof this.buffer[0]}`);
      }
      
      this.buffer[this.head] = value;
      
      if (this.useAverageTracking && typeof value === 'number') {
        this.sumValue += value;
        this.minValue = this.size === 0 ? value : Math.min(this.minValue, value);
        this.maxValue = this.size === 0 ? value : Math.max(this.maxValue, value);
      }
      
      this.head = (this.head + 1) % this.capacity;
      
      if (this.size === this.capacity) {
        this.tail = (this.tail + 1) % this.capacity;
        
        if (this.useAverageTracking && typeof value === 'number') {
          const oldValue = this.buffer[this.tail];
          if (typeof oldValue === 'number') {
            this.sumValue -= oldValue;
          }
        }
      } else {
        this.size++;
      }
    } catch (error) {
      logError(
        `Error al añadir valor al buffer circular: ${error}`,
        ErrorLevel.WARNING,
        "CircularBuffer"
      );
    }
  }
  
  /**
   * Elimina y retorna el valor más antiguo del buffer
   */
  public pop(): T | undefined {
    if (this.size === 0) {
      return undefined;
    }
    
    const value = this.buffer[this.tail];
    this.buffer[this.tail] = undefined as any;
    
    if (this.useAverageTracking && typeof value === 'number') {
      this.sumValue -= value;
    }
    
    this.tail = (this.tail + 1) % this.capacity;
    this.size--;
    
    return value;
  }
  
  /**
   * Obtiene el valor en un índice específico
   */
  public get(index: number): T | undefined {
    if (index < 0 || index >= this.size) {
      return undefined;
    }
    
    const actualIndex = (this.tail + index) % this.capacity;
    return this.buffer[actualIndex];
  }
  
  /**
   * Retorna el buffer como un array
   */
  public toArray(): T[] {
    const result: T[] = [];
    
    for (let i = 0; i < this.size; i++) {
      result.push(this.get(i) as T);
    }
    
    return result;
  }
  
  /**
   * Limpia el buffer
   */
  public clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
    this.sumValue = 0;
    this.minValue = 0;
    this.maxValue = 0;
    this.buffer = new Array<T>(this.capacity);
  }
  
  /**
   * Obtiene el tamaño actual del buffer
   */
  public getSize(): number {
    return this.size;
  }
  
  /**
   * Obtiene la capacidad máxima del buffer
   */
  public getCapacity(): number {
    return this.capacity;
  }
  
  /**
   * Obtiene el valor promedio de los elementos en el buffer
   */
  public getAverage(): number {
    return this.useAverageTracking && this.size > 0 ? this.sumValue / this.size : 0;
  }
  
  /**
   * Obtiene el valor mínimo en el buffer
   */
  public getMinValue(): number {
    return this.minValue;
  }
  
  /**
   * Obtiene el valor máximo en el buffer
   */
  public getMaxValue(): number {
    return this.maxValue;
  }
  
  /**
   * Obtiene información sobre el consumo de memoria
   */
  private getMemoryUsage(): { usedBytes: number, totalBytes: number } {
    try {
      // Estimación aproximada de memoria
      const bytesPerItem = 8; // Estimación para números (puede variar para otros tipos)
      const usedBytes = this.size * bytesPerItem;
      const totalBytes = this.capacity * bytesPerItem;
      
      return { usedBytes, totalBytes };
    } catch (error) {
      return { usedBytes: 0, totalBytes: 0 };
    }
  }
  
  /**
   * Obtiene el estado actual del buffer
   */
  public getState(): CircularBufferState {
    try {
      const memory = this.getMemoryUsage();
      
      return {
        size: this.size,
        capacity: this.capacity,
        memoryUsage: memory.usedBytes,
        avgValue: this.useAverageTracking && this.size > 0 ? this.sumValue / this.size : 0,
        minValue: this.useAverageTracking ? this.minValue : 0,
        maxValue: this.useAverageTracking ? this.maxValue : 0
      };
    } catch (error) {
      return {
        size: this.size,
        capacity: this.capacity,
        memoryUsage: 0,
        avgValue: 0,
        minValue: 0,
        maxValue: 0
      };
    }
  }
  
  /**
   * Returns the current buffer
   */
  public getBuffer(): T[] {
    return this.buffer;
  }
}
