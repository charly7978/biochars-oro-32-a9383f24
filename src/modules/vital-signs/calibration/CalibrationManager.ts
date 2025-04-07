/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { VitalSignType } from '../../../types/signal';

/**
 * Represents a reference value for calibration
 */
export interface CalibrationReference {
  type: VitalSignType;
  value: number;
  timestamp: number;
}

/**
 * Represents calibration factors for adjusting measurements
 */
export interface CalibrationFactors {
  spo2Factor: number;
  bloodPressureFactor: number;
  glucoseFactor: number;
  lipidsFactor: number;
  hydrationFactor: number;
}

/**
 * Manages calibration of vital signs measurements
 */
export class CalibrationManager {
  private calibrationReferences: CalibrationReference[] = [];
  private calibrationFactors: CalibrationFactors = {
    spo2Factor: 1,
    bloodPressureFactor: 1,
    glucoseFactor: 1,
    lipidsFactor: 1,
    hydrationFactor: 1,
  };

  /**
   * Add a new calibration reference
   */
  public addCalibrationReference(reference: CalibrationReference): void {
    this.calibrationReferences.push(reference);
    this.updateCalibrationFactors(reference.type);
  }

  /**
   * Get all calibration references for a specific type
   */
  public getCalibrationReferences(type: VitalSignType): CalibrationReference[] {
    return this.calibrationReferences.filter(ref => ref.type === type);
  }

  /**
   * Clear all calibration references for a specific type
   */
  public clearCalibrationReferences(type: VitalSignType): void {
    this.calibrationReferences = this.calibrationReferences.filter(ref => ref.type !== type);
    this.updateCalibrationFactors(type);
  }

  /**
   * Get current calibration factors
   */
  public getCalibrationFactors(): CalibrationFactors {
    return this.calibrationFactors;
  }

  /**
   * Update calibration factors based on available references
   */
  private updateCalibrationFactors(type: VitalSignType): void {
    const references = this.getCalibrationReferences(type);
    if (references.length === 0) {
      // Reset factor to 1 if no references are available
      switch (type) {
        case VitalSignType.SPO2:
          this.calibrationFactors.spo2Factor = 1;
          break;
        case VitalSignType.BLOOD_PRESSURE:
          this.calibrationFactors.bloodPressureFactor = 1;
          break;
        case VitalSignType.GLUCOSE:
          this.calibrationFactors.glucoseFactor = 1;
          break;
        // Changed from LIPIDS to HYDRATION
        case VitalSignType.HYDRATION:
          this.calibrationFactors.lipidsFactor = 1;
          this.calibrationFactors.hydrationFactor = 1;
          break;
      }
      return;
    }

    // Use the most recent reference for calibration
    const mostRecent = references.sort((a, b) => b.timestamp - a.timestamp)[0];
    let factor = 1;

    switch (type) {
      case VitalSignType.SPO2:
        factor = mostRecent.value > 0 ? 100 / mostRecent.value : 1;
        this.calibrationFactors.spo2Factor = factor;
        break;
      case VitalSignType.BLOOD_PRESSURE:
        factor = mostRecent.value > 0 ? 120 / mostRecent.value : 1;
        this.calibrationFactors.bloodPressureFactor = factor;
        break;
      case VitalSignType.GLUCOSE:
        factor = mostRecent.value > 0 ? 90 / mostRecent.value : 1;
        this.calibrationFactors.glucoseFactor = factor;
        break;
      // Changed from LIPIDS to HYDRATION
      case VitalSignType.HYDRATION:
        factor = mostRecent.value > 0 ? 65 / mostRecent.value : 1;
        this.calibrationFactors.lipidsFactor = factor;
        this.calibrationFactors.hydrationFactor = factor;
        break;
    }
  }

  /**
   * Apply calibration factors to a measurement
   */
  private applyCalibrationFactors(
    type: VitalSignType,
    value: any,
    factors: CalibrationFactors
  ): any {
    switch (type) {
      case VitalSignType.SPO2:
        // Apply calibration to SpO2 measurement
        return value * factors.spo2Factor;

      case VitalSignType.BLOOD_PRESSURE:
        // Apply calibration to blood pressure measurement
        return value * factors.bloodPressureFactor;

      case VitalSignType.GLUCOSE:
        // Apply calibration to glucose measurement
        return value * factors.glucoseFactor;

      // Changed from LIPIDS to HYDRATION
      case VitalSignType.HYDRATION:
        // Apply calibration to hydration measurement
        if (typeof value === 'object' && value !== null) {
          return {
            totalCholesterol: 
              value.totalCholesterol * factors.lipidsFactor,
            hydrationPercentage:
              value.hydrationPercentage * factors.hydrationFactor
          };
        }
        return value;
      
      default:
        return value;
    }
  }

  /**
   * Calibrate a vital sign measurement
   */
  public calibrateMeasurement(type: VitalSignType, value: any): any {
    const factors = this.getCalibrationFactors();
    return this.applyCalibrationFactors(type, value, factors);
  }
}
