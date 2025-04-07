
/**
 * Sistema de filtros adaptativos para optimización móvil
 * Mejora el rendimiento del procesamiento de señales en dispositivos con recursos limitados
 */

export class AdaptiveFilters {
  private static instance: AdaptiveFilters;
  private readonly bufferSize: number = 30;
  private readonly adaptationRate: number = 0.05;
  
  // Coeficientes de filtro dinámicos
  private coefficients: number[] = [];
  private signalBuffer: number[] = [];
  
  private constructor() {
    // Inicializar coeficientes con valores predeterminados
    this.coefficients = Array(5).fill(0).map((_, i) => 
      i === 0 ? 0.4 : i === 1 ? 0.3 : i === 2 ? 0.15 : i === 3 ? 0.1 : 0.05
    );
  }
  
  public static getInstance(): AdaptiveFilters {
    if (!AdaptiveFilters.instance) {
      AdaptiveFilters.instance = new AdaptiveFilters();
    }
    return AdaptiveFilters.instance;
  }
  
  /**
   * Aplica el filtro adaptativo a un valor de señal
   * @param value Valor de señal actual
   * @returns Valor filtrado
   */
  public applyFilter(value: number): number {
    // Añadir valor al buffer
    this.signalBuffer.unshift(value);
    if (this.signalBuffer.length > this.bufferSize) {
      this.signalBuffer.pop();
    }
    
    // Si el buffer no está lo suficientemente lleno, devolver el valor original
    if (this.signalBuffer.length < this.coefficients.length) {
      return value;
    }
    
    // Aplicar filtro con coeficientes actuales
    let filteredValue = 0;
    for (let i = 0; i < this.coefficients.length; i++) {
      filteredValue += this.coefficients[i] * this.signalBuffer[i];
    }
    
    // Adaptar coeficientes si hay suficientes muestras
    if (this.signalBuffer.length >= this.coefficients.length * 2) {
      this.adaptCoefficients();
    }
    
    return filteredValue;
  }
  
  /**
   * Ajusta los coeficientes del filtro basándose en la señal reciente
   * Optimizado para dispositivos móviles con cálculos más ligeros
   */
  private adaptCoefficients(): void {
    // Calcular error entre la predicción y el valor real
    const recentValues = this.signalBuffer.slice(0, this.coefficients.length);
    const prediction = recentValues.reduce((sum, val, i) => 
      sum + val * this.coefficients[i], 0);
    const actual = this.signalBuffer[this.coefficients.length];
    const error = actual - prediction;
    
    // Actualizar coeficientes basado en el error
    for (let i = 0; i < this.coefficients.length; i++) {
      this.coefficients[i] += this.adaptationRate * error * recentValues[i];
    }
    
    // Normalizar coeficientes para mantener estabilidad
    const sum = this.coefficients.reduce((s, c) => s + Math.abs(c), 0);
    if (sum > 0) {
      this.coefficients = this.coefficients.map(c => c / sum);
    }
  }
  
  /**
   * Optimiza los parámetros del filtro según el tipo de dispositivo
   * @param isMobile Si es verdadero, optimiza para móvil
   */
  public optimizeForDevice(isMobile: boolean): void {
    if (isMobile) {
      // Optimizaciones para dispositivos móviles
      this.coefficients = this.coefficients.slice(0, 3); // Menos coeficientes
    } else {
      // Restaurar a la configuración completa para escritorio
      this.adaptationRate = 0.05;
    }
  }
  
  /**
   * Restablece el estado del filtro
   */
  public reset(): void {
    this.signalBuffer = [];
    // Restaurar coeficientes predeterminados
    this.coefficients = Array(5).fill(0).map((_, i) => 
      i === 0 ? 0.4 : i === 1 ? 0.3 : i === 2 ? 0.15 : i === 3 ? 0.1 : 0.05
    );
  }
}
