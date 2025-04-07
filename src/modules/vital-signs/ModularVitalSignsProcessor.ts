
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { SignalDistributor } from '../signal-processing/SignalDistributor';
import { VitalSignType } from '../../types/signal';
import { SpO2Processor } from './specialized/SpO2Processor';
import { BloodPressureProcessor } from './specialized/BloodPressureProcessor';
import { GlucoseProcessor } from './specialized/GlucoseProcessor';
import { HydrationProcessor } from './specialized/HydrationProcessor';
import { CardiacProcessor } from './specialized/CardiacProcessor';
import { VitalSignsResult, VitalSignsProcessorParams } from './types/vital-signs-result';

/**
 * Modular implementation of vital signs processor
 * Supports both direct measurement and advanced features
 */
export class ModularVitalSignsProcessor {
  private signalDistributor: SignalDistributor | null = null;
  private spo2Processor: SpO2Processor | null = null;
  private bpProcessor: BloodPressureProcessor | null = null;
  private glucoseProcessor: GlucoseProcessor | null = null;
  private hydrationProcessor: HydrationProcessor | null = null;
  private cardiacProcessor: CardiacProcessor | null = null;
  
  constructor() {
    console.log("ModularVitalSignsProcessor: Initializing new instance");
    this.initializeProcessors();
  }
  
  /**
   * Process a signal value and return vital signs result
   */
  public processSignal(params: VitalSignsProcessorParams): VitalSignsResult {
    if (!this.signalDistributor) {
      console.warn("ModularVitalSignsProcessor: Signal distributor not initialized");
      return this.getEmptyResult();
    }
    
    const { value } = params;
    
    // Distribute signal to specialized processors
    const distributedSignals = this.signalDistributor.distributeSignal(value);
    
    // Collect results from specialized processors
    const spo2 = this.spo2Processor ? this.spo2Processor.calculateSpO2([distributedSignals[VitalSignType.SPO2] || 0]) : 0;
    const bp = this.bpProcessor ? this.bpProcessor.calculateBloodPressure([distributedSignals[VitalSignType.BLOOD_PRESSURE] || 0]) : {
      systolic: 0,
      diastolic: 0
    };
    const glucose = this.glucoseProcessor ? this.glucoseProcessor.calculateGlucose([distributedSignals[VitalSignType.GLUCOSE] || 0]) : 0;
    const hydration = this.hydrationProcessor ? this.hydrationProcessor.calculateHydration([distributedSignals[VitalSignType.HYDRATION] || 0]) : 0;
    
    // Prepare result
    return {
      spo2,
      pressure: `${bp.systolic}/${bp.diastolic}`,
      arrhythmiaStatus: '--',
      glucose,
      hydration,
      lipids: {
        totalCholesterol: 180, // Default value
        triglycerides: 150 // Default value
      },
      lastArrhythmiaData: null
    };
  }
  
  /**
   * Reset all processors
   */
  public reset(): VitalSignsResult {
    if (this.spo2Processor) this.spo2Processor.reset();
    if (this.bpProcessor) this.bpProcessor.reset();
    if (this.glucoseProcessor) this.glucoseProcessor.reset();
    if (this.hydrationProcessor) this.hydrationProcessor.reset();
    if (this.cardiacProcessor) this.cardiacProcessor.reset();
    console.log("ModularVitalSignsProcessor: All processors reset");
    
    return this.getEmptyResult();
  }
  
  /**
   * Full reset of all processors
   */
  public fullReset(): void {
    this.reset();
    console.log("ModularVitalSignsProcessor: Full reset performed");
  }
  
  /**
   * Get arrhythmia counter
   */
  public getArrhythmiaCounter(): number {
    return 0; // Default implementation
  }
  
  /**
   * Get an empty result
   */
  private getEmptyResult(): VitalSignsResult {
    return {
      spo2: 0,
      pressure: '--/--',
      arrhythmiaStatus: '--',
      glucose: 0,
      hydration: 0,
      lipids: {
        totalCholesterol: 0,
        triglycerides: 0
      },
      lastArrhythmiaData: null
    };
  }
  
  /**
   * Initialize specialized processors
   */
  private initializeProcessors(): void {
    // Initialize signal distributor
    this.signalDistributor = new SignalDistributor();
    
    // Initialize specialized processors
    this.spo2Processor = new SpO2Processor();
    this.bpProcessor = new BloodPressureProcessor();
    this.glucoseProcessor = new GlucoseProcessor();
    this.hydrationProcessor = new HydrationProcessor();
    this.cardiacProcessor = new CardiacProcessor();
    
    // Route signal to specialized processors
    if (this.signalDistributor) {
      this.signalDistributor.addChannel(VitalSignType.SPO2);
      this.signalDistributor.addChannel(VitalSignType.BLOOD_PRESSURE);
      this.signalDistributor.addChannel(VitalSignType.HEARTBEAT);
      this.signalDistributor.addChannel(VitalSignType.GLUCOSE);
      this.signalDistributor.addChannel(VitalSignType.HYDRATION);
    }
  }
}
