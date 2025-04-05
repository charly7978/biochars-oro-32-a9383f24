
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Implementación de buffer circular con optimización de memoria
 * Proporciona almacenamiento eficiente para señales con tamaño limitado
 */
import { CircularBufferState } from '../types';
import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Clase para implementar un buffer circular de tamaño fijo con optimización de memoria
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;
  private capacity: number;
  private memoryOptimization: boolean;
  private adaptiveSize: boolean;
  private resizeThreshold: number;
  private memoryPressureThreshold: number;
  
  /**
   * Constructor del buffer circular
   * @param capacity Capacidad máxima del buffer
   * @param memoryOptimization Si se debe optimizar uso de memoria
   * @param adaptiveSize Si el tamaño se debe adaptar automáticamente
   */
  constructor(
    capacity: number = 100, 
    memoryOptimization: boolean = true,
    adaptiveSize: boolean = true
  ) {
    this.capacity = Math.max(1, capacity);
    this.buffer = new Array<T>(this.capacity);
    this.memoryOptimization = memoryOptimization;
    this.adaptiveSize = adaptiveSize;
    
    // Parámetros para ajuste dinámico
    this.resizeThreshold = 0.9; // 90% de capacidad para aumentar
    this.memoryPressureThreshold = 0.8; // 80% de uso de memoria para reducir
  }
  
  /**
   * Añade un elemento al buffer
   */
  public push(item: T): void {
    try {
      // Si el buffer está lleno, reemplaza el elemento más antiguo
      if (this.size === this.capacity) {
        this.buffer[this.head] = item;
        this.head = (this.head + 1) % this.capacity;
        this.tail = (this.tail + 1) % this.capacity;
      } else {
        // Si no está lleno, añade al final
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;
        this.size++;
      }
      
      // Ajuste dinámico de tamaño si está habilitado
      if (this.adaptiveSize && this.size > this.capacity * this.resizeThreshold) {
        this.resizeIfNeeded();
      }
    } catch (error) {
      logError(
        `Error al añadir elemento a buffer circular: ${error}`,
        ErrorLevel.ERROR,
        "CircularBuffer"
      );
    }
  }
  
  /**
   * Obtiene el elemento más antiguo sin eliminarlo
   */
  public peek(): T | undefined {
    if (this.size === 0) return undefined;
    return this.buffer[this.head];
  }
  
  /**
   * Obtiene y elimina el elemento más antiguo
   */
  public pop(): T | undefined {
    if (this.size === 0) return undefined;
    
    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined as unknown as T;
    this.head = (this.head + 1) % this.capacity;
    this.size--;
    
    return item;
  }
  
  /**
   * Obtiene todos los elementos como un array
   */
  public toArray(): T[] {
    const result: T[] = [];
    if (this.size === 0) return result;
    
    let index = this.head;
    for (let i = 0; i < this.size; i++) {
      result.push(this.buffer[index]);
      index = (index + 1) % this.capacity;
    }
    
    return result;
  }
  
  /**
   * Obtiene los últimos N elementos
   */
  public getLastN(n: number): T[] {
    const count = Math.min(n, this.size);
    if (count === 0) return [];
    
    const result: T[] = [];
    let startIndex = (this.tail - count + this.capacity) % this.capacity;
    
    for (let i = 0; i < count; i++) {
      result.push(this.buffer[(startIndex + i) % this.capacity]);
    }
    
    return result;
  }
  
  /**
   * Redimensiona el buffer si es necesario
   */
  private resizeIfNeeded(): void {
    try {
      // Verificar presión de memoria
      const memoryInfo = this.getMemoryInfo();
      
      if (memoryInfo.usagePercentage > this.memoryPressureThreshold * 100) {
        // Reducir tamaño si hay presión de memoria
        this.resize(Math.max(10, Math.floor(this.capacity * 0.7)));
        return;
      }
      
      // Aumentar tamaño si no hay presión de memoria
      this.resize(Math.floor(this.capacity * 1.5));
    } catch (error) {
      logError(
        `Error al redimensionar buffer: ${error}`,
        ErrorLevel.WARNING,
        "CircularBuffer"
      );
    }
  }
  
  /**
   * Redimensiona el buffer a una nueva capacidad
   */
  private resize(newCapacity: number): void {
    if (newCapacity === this.capacity) return;
    
    const oldBuffer = this.toArray();
    this.capacity = newCapacity;
    this.buffer = new Array<T>(this.capacity);
    this.head = 0;
    this.size = Math.min(oldBuffer.length, this.capacity);
    this.tail = this.size % this.capacity;
    
    // Copiar elementos
    for (let i = 0; i < this.size; i++) {
      this.buffer[i] = oldBuffer[i];
    }
    
    logError(
      `Buffer circular redimensionado: ${oldBuffer.length} → ${newCapacity}`,
      ErrorLevel.INFO,
      "CircularBuffer"
    );
  }
  
  /**
   * Limpia el buffer
   */
  public clear(): void {
    this.buffer = new Array<T>(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
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
   * Comprueba si el buffer está vacío
   */
  public isEmpty(): boolean {
    return this.size === 0;
  }
  
  /**
   * Comprueba si el buffer está lleno
   */
  public isFull(): boolean {
    return this.size === this.capacity;
  }
  
  /**
   * Calcula estadísticas de valores numéricos (solo para buffers de números)
   */
  public getStats(): { min: number; max: number; avg: number } | null {
    if (this.size === 0 || typeof this.peek() !== 'number') {
      return null;
    }
    
    try {
      let min = Number.MAX_VALUE;
      let max = Number.MIN_VALUE;
      let sum = 0;
      
      this.toArray().forEach(item => {
        const value = item as unknown as number;
        min = Math.min(min, value);
        max = Math.max(max, value);
        sum += value;
      });
      
      return {
        min,
        max,
        avg: sum / this.size
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Obtiene información de uso de memoria
   */
  private getMemoryInfo(): { usedMemory: number; totalMemory: number; usagePercentage: number } {
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        usedMemory: performance.memory.usedJSHeapSize / (1024 * 1024),
        totalMemory: performance.memory.jsHeapSizeLimit / (1024 * 1024),
        usagePercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
      };
    }
    
    // Valores por defecto si no hay API de memoria disponible
    return {
      usedMemory: 0,
      totalMemory: 1000,
      usagePercentage: 0
    };
  }
  
  /**
   * Obtiene el estado completo del buffer
   */
  public getState(): CircularBufferState {
    const stats = this.getStats();
    const memoryInfo = this.getMemoryInfo();
    
    return {
      size: this.size,
      capacity: this.capacity,
      memoryUsage: memoryInfo.usedMemory,
      avgValue: stats?.avg ?? 0,
      minValue: stats?.min ?? 0,
      maxValue: stats?.max ?? 0
    };
  }
}
