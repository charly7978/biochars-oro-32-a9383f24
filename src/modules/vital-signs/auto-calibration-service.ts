/**
 * Auto-calibration service for vital signs
 * Enables automatic adjustment based on historical data and environmental conditions
 */

import { VitalSignsResult, AutoCalibrationOptions } from './index';

/**
 * Interface for reference values used in calibration
 */
interface CalibrationReference {
  spo2?: number;
  systolic?: number;
  diastolic?: number;
  glucose?: number;
  heartRate?: number;
  timestamp: number;
  quality: number;
}

/**
 * Calibration factors for adjusting measurements
 */
interface CalibrationFactors {
  spo2Factor: number;
  pressureFactor: number;
  glucoseFactor: number;
  heartRateFactor: number;
  hydrationFactor: number;
}

/**
 * Environmental conditions that affect measurements
 */
interface EnvironmentalConditions {
  lightLevel: number;
  motionLevel: number;
  temperature?: number;
  skinTone?: number;
}

/**
 * Auto-calibration service for vital signs measurements
 */
export class AutoCalibrationService {
  private isCalibrated: boolean = false;
  private referenceValues: CalibrationReference[] = [];
  private calibrationFactors: CalibrationFactors = {
    spo2Factor: 1.0,
    pressureFactor: 1.0,
    glucoseFactor: 1.0,
    heartRateFactor: 1.0,
    hydrationFactor: 1.0
  };
  private lastCalibrationTime: number = 0;
  private environmentalConditions: EnvironmentalConditions = {
    lightLevel: 50,
    motionLevel: 0
  };
  private biometricFactors: Record<string, number> = {};
  private readonly options: AutoCalibrationOptions;
  
  constructor(options: AutoCalibrationOptions = {}) {
    this.options = {
      useHistoricalData: options.useHistoricalData ?? true,
      calibrationPeriod: options.calibrationPeriod ?? 86400000, // Default: 24 hours
      minimumSamplesRequired: options.minimumSamplesRequired ?? 5,
      adaptToBiometrics: options.adaptToBiometrics ?? true,
      environmentalAdjustment: options.environmentalAdjustment ?? true
    };
    
    console.log("AutoCalibrationService: Initialized with options", this.options);
  }
  
  /**
   * Add a reference measurement for calibration
   */
  public addReferenceValue(reference: CalibrationReference): void {
    // Add to reference values
    this.referenceValues.push(reference);
    
    // Keep only the most recent references (max 20)
    if (this.referenceValues.length > 20) {
      this.referenceValues.shift();
    }
    
    // Try to calibrate if we have enough samples
    if (this.referenceValues.length >= this.options.minimumSamplesRequired!) {
      this.calibrate();
    }
    
    console.log("AutoCalibrationService: Added reference value, now have", 
      this.referenceValues.length, "references");
  }
  
  /**
   * Update environmental conditions
   */
  public updateEnvironmentalConditions(conditions: Partial<EnvironmentalConditions>): void {
    this.environmentalConditions = {
      ...this.environmentalConditions,
      ...conditions
    };
    
    console.log("AutoCalibrationService: Updated environmental conditions", 
      this.environmentalConditions);
  }
  
  /**
   * Update biometric factors
   */
  public updateBiometricFactors(factors: Record<string, number>): void {
    this.biometricFactors = {
      ...this.biometricFactors,
      ...factors
    };
    
    console.log("AutoCalibrationService: Updated biometric factors", 
      this.biometricFactors);
  }
  
  /**
   * Perform calibration based on reference values
   */
  private calibrate(): void {
    if (this.referenceValues.length < this.options.minimumSamplesRequired!) {
      console.log("AutoCalibrationService: Not enough reference values for calibration");
      return;
    }
    
    // Filter out low-quality references
    const goodReferences = this.referenceValues.filter(ref => ref.quality >= 0.7);
    
    if (goodReferences.length < this.options.minimumSamplesRequired!) {
      console.log("AutoCalibrationService: Not enough high-quality reference values");
      return;
    }
    
    // Calculate mean values for each vital sign
    const meanValues = this.calculateMeanReferenceValues(goodReferences);
    
    // Update calibration factors
    if (meanValues.spo2) {
      this.calibrationFactors.spo2Factor = 97.5 / meanValues.spo2; // Calibrate to 97.5% SpO2
    }
    
    if (meanValues.systolic && meanValues.diastolic) {
      const idealSystolic = 120;
      const idealDiastolic = 80;
      this.calibrationFactors.pressureFactor = 
        ((idealSystolic / meanValues.systolic) + (idealDiastolic / meanValues.diastolic)) / 2;
    }
    
    if (meanValues.glucose) {
      this.calibrationFactors.glucoseFactor = 100 / meanValues.glucose; // Calibrate to 100 mg/dL
    }
    
    if (meanValues.heartRate) {
      this.calibrationFactors.heartRateFactor = 72 / meanValues.heartRate; // Calibrate to 72 BPM
    }
    
    // Mark as calibrated and record time
    this.isCalibrated = true;
    this.lastCalibrationTime = Date.now();
    
    console.log("AutoCalibrationService: Calibration completed", this.calibrationFactors);
  }
  
  /**
   * Calculate mean values from reference measurements
   */
  private calculateMeanReferenceValues(references: CalibrationReference[]) {
    const spo2Values = references.filter(ref => ref.spo2 !== undefined)
      .map(ref => ref.spo2!);
    const systolicValues = references.filter(ref => ref.systolic !== undefined)
      .map(ref => ref.systolic!);
    const diastolicValues = references.filter(ref => ref.diastolic !== undefined)
      .map(ref => ref.diastolic!);
    const glucoseValues = references.filter(ref => ref.glucose !== undefined)
      .map(ref => ref.glucose!);
    const heartRateValues = references.filter(ref => ref.heartRate !== undefined)
      .map(ref => ref.heartRate!);
    
    const mean = (values: number[]) => 
      values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : undefined;
    
    return {
      spo2: mean(spo2Values),
      systolic: mean(systolicValues),
      diastolic: mean(diastolicValues),
      glucose: mean(glucoseValues),
      heartRate: mean(heartRateValues)
    };
  }
  
  /**
   * Check if calibration is needed
   */
  public isCalibrationNeeded(): boolean {
    // Calibration is needed if:
    // 1. We've never calibrated before
    // 2. Our last calibration is older than the calibration period
    // 3. We don't have enough reference values
    
    if (!this.isCalibrated) {
      return true;
    }
    
    const calibrationAge = Date.now() - this.lastCalibrationTime;
    if (calibrationAge > this.options.calibrationPeriod!) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Apply calibration to a vital signs measurement
   */
  public calibrateMeasurement(measurement: VitalSignsResult): VitalSignsResult {
    if (!this.isCalibrated) {
      return measurement;
    }
    
    // Apply calibration factors
    const calibrated: VitalSignsResult = {
      spo2: Math.round(measurement.spo2 * this.calibrationFactors.spo2Factor),
      
      // Parse and calibrate blood pressure
      pressure: this.calibrateBloodPressure(measurement.pressure),
      
      // Keep arrhythmia status unchanged
      arrhythmiaStatus: measurement.arrhythmiaStatus,
      
      // Calibrate glucose
      glucose: Math.round(measurement.glucose * this.calibrationFactors.glucoseFactor),
      
      // Calibrate lipids
      lipids: {
        totalCholesterol: Math.round(measurement.lipids.totalCholesterol),
        hydrationPercentage: Math.round(measurement.lipids.hydrationPercentage * 
          this.calibrationFactors.hydrationFactor)
      }
    };
    
    // Apply environmental adjustments if enabled
    if (this.options.environmentalAdjustment) {
      this.applyEnvironmentalAdjustments(calibrated);
    }
    
    // Apply biometric adjustments if enabled
    if (this.options.adaptToBiometrics) {
      this.applyBiometricAdjustments(calibrated);
    }
    
    // Ensure values are in physiologically valid ranges
    this.enforcePhysiologicalLimits(calibrated);
    
    return calibrated;
  }
  
  /**
   * Calibrate blood pressure string
   */
  private calibrateBloodPressure(pressure: string): string {
    // Parse systolic/diastolic from string
    const parts = pressure.split('/');
    if (parts.length !== 2) {
      return pressure; // Invalid format, return unchanged
    }
    
    const systolic = parseInt(parts[0], 10);
    const diastolic = parseInt(parts[1], 10);
    
    if (isNaN(systolic) || isNaN(diastolic)) {
      return pressure; // Invalid numbers, return unchanged
    }
    
    // Apply calibration
    const calibratedSystolic = Math.round(systolic * this.calibrationFactors.pressureFactor);
    const calibratedDiastolic = Math.round(diastolic * this.calibrationFactors.pressureFactor);
    
    return `${calibratedSystolic}/${calibratedDiastolic}`;
  }
  
  /**
   * Apply adjustments based on environmental conditions
   */
  private applyEnvironmentalAdjustments(measurement: VitalSignsResult): void {
    // Adjust based on light level (low light can affect measurements)
    if (this.environmentalConditions.lightLevel < 30) {
      // In low light, SpO2 readings may be less accurate
      measurement.spo2 = Math.min(99, measurement.spo2 + 1);
    }
    
    // Adjust based on motion (high motion affects most measurements)
    if (this.environmentalConditions.motionLevel > 50) {
      // High motion can cause inaccuracies in several measurements
      // We'll be conservative in our adjustments
      const parts = measurement.pressure.split('/');
      if (parts.length === 2) {
        const systolic = parseInt(parts[0], 10);
        const diastolic = parseInt(parts[1], 10);
        
        if (!isNaN(systolic) && !isNaN(diastolic)) {
          // Motion tends to increase blood pressure readings
          const adjustedSystolic = Math.max(90, systolic - 5);
          const adjustedDiastolic = Math.max(60, diastolic - 3);
          measurement.pressure = `${adjustedSystolic}/${adjustedDiastolic}`;
        }
      }
    }
    
    // If temperature data is available, we could apply adjustments here as well
  }
  
  /**
   * Apply adjustments based on biometric factors
   */
  private applyBiometricAdjustments(measurement: VitalSignsResult): void {
    // Adjust based on age if available
    if (this.biometricFactors.age) {
      const age = this.biometricFactors.age;
      
      // Older individuals tend to have higher blood pressure
      if (age > 60) {
        const parts = measurement.pressure.split('/');
        if (parts.length === 2) {
          const systolic = parseInt(parts[0], 10);
          const diastolic = parseInt(parts[1], 10);
          
          if (!isNaN(systolic) && !isNaN(diastolic)) {
            // Adjust expected values based on age
            const ageAdjustedSystolic = systolic - Math.round((age - 60) / 10);
            measurement.pressure = `${ageAdjustedSystolic}/${diastolic}`;
          }
        }
      }
    }
    
    // Adjust based on skin tone if available (can affect SpO2 readings)
    if (this.biometricFactors.skinTone) {
      const skinTone = this.biometricFactors.skinTone;
      // Higher values indicate darker skin, which can affect optical readings
      if (skinTone > 4) {
        // Adjust SpO2 - some devices read lower on darker skin
        measurement.spo2 = Math.min(100, measurement.spo2 + Math.round(skinTone / 5));
      }
    }
  }
  
  /**
   * Ensure all values are within physiological limits
   */
  private enforcePhysiologicalLimits(measurement: VitalSignsResult): void {
    // SpO2: 70-100%
    measurement.spo2 = Math.max(70, Math.min(100, measurement.spo2));
    
    // Blood pressure: 70-200 / 40-120
    const parts = measurement.pressure.split('/');
    if (parts.length === 2) {
      const systolic = Math.max(70, Math.min(200, parseInt(parts[0], 10)));
      const diastolic = Math.max(40, Math.min(120, parseInt(parts[1], 10)));
      
      if (!isNaN(systolic) && !isNaN(diastolic)) {
        measurement.pressure = `${systolic}/${diastolic}`;
      }
    }
    
    // Glucose: 70-200 mg/dL
    measurement.glucose = Math.max(70, Math.min(200, measurement.glucose));
    
    // Hydration: 30-100%
    measurement.lipids.hydrationPercentage = 
      Math.max(30, Math.min(100, measurement.lipids.hydrationPercentage));
  }
  
  /**
   * Reset calibration
   */
  public reset(): void {
    this.isCalibrated = false;
    this.referenceValues = [];
    this.calibrationFactors = {
      spo2Factor: 1.0,
      pressureFactor: 1.0,
      glucoseFactor: 1.0,
      heartRateFactor: 1.0,
      hydrationFactor: 1.0
    };
    this.lastCalibrationTime = 0;
    console.log("AutoCalibrationService: Reset calibration");
  }
  
  /**
   * Get calibration status
   */
  public getStatus() {
    return {
      isCalibrated: this.isCalibrated,
      lastCalibration: this.lastCalibrationTime,
      referenceCount: this.referenceValues.length,
      environmentalAdjustment: this.options.environmentalAdjustment,
      biometricAdjustment: this.options.adaptToBiometrics,
      factors: { ...this.calibrationFactors }
    };
  }
}

// Singleton instance for app-wide access
let globalCalibrationService: AutoCalibrationService | null = null;

/**
 * Get the global calibration service instance
 */
export function getCalibrationService(options?: AutoCalibrationOptions): AutoCalibrationService {
  if (!globalCalibrationService) {
    globalCalibrationService = new AutoCalibrationService(options);
  }
  return globalCalibrationService;
}
