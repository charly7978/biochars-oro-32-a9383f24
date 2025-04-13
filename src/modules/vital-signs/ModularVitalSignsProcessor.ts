/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { SignalDistributor } from '../signal-processing/SignalDistributor';
import { VitalSignType } from '../../types/signal';
import { VitalSignsResult } from '../../types/vital-signs';
import { SpO2Processor } from './specialized/SpO2Processor';
import { BloodPressureProcessor } from './specialized/BloodPressureProcessor';
import { GlucoseProcessor } from './specialized/GlucoseProcessor';
import { HydrationProcessor } from './specialized/HydrationProcessor';
import { CardiacProcessor } from './specialized/CardiacProcessor';

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
  
  /**
   * Initialize the modular processor
   */
  constructor() {
    console.log("ModularVitalSignsProcessor: Initializing new instance");
    this.initializeProcessors();
  }
  
  /**
   * Process a signal value and return vital signs result
   */
  public processSignal(value: number): VitalSignsResult {
    if (!this.signalDistributor) {
      console.warn("ModularVitalSignsProcessor: Signal distributor not initialized");
      return this.getEmptyResult();
    }
    
    // Distribute signal to specialized processors
    const distributedSignals = this.signalDistributor.distributeSignal(value);
    
    // Collect results from specialized processors
    const spo2 = this.spo2Processor ? this.spo2Processor.processValue(distributedSignals[VitalSignType.SPO2] || 0) : 0;
    const bp = this.bpProcessor ? this.bpProcessor.processValue(distributedSignals[VitalSignType.BLOOD_PRESSURE] || 0) : { systolic: 0, diastolic: 0 };
    const glucose = this.glucoseProcessor ? this.glucoseProcessor.processValue(distributedSignals[VitalSignType.GLUCOSE] || 0) : 0;
    const hydration = this.hydrationProcessor ? this.hydrationProcessor.processValue(distributedSignals[VitalSignType.HYDRATION] || 0) : { totalCholesterol: 0, hydrationPercentage: 0 };
    const cardiac = this.cardiacProcessor ? this.cardiacProcessor.processValue(distributedSignals[VitalSignType.HEARTBEAT] || 0) : { heartRate: 0, hrv: 0 };
    
    // Prepare result
    return {
      spo2,
      pressure: `${bp.systolic}/${bp.diastolic}`,
      arrhythmiaStatus: '--',
      glucose,
      lipids: {
        totalCholesterol: hydration.totalCholesterol,
        hydrationPercentage: hydration.hydrationPercentage
      },
      lastArrhythmiaData: null
    };
  }
  
  /**
   * Reset all processors
   */
  public reset(): void {
    if (this.spo2Processor) this.spo2Processor.reset();
    if (this.bpProcessor) this.bpProcessor.reset();
    if (this.glucoseProcessor) this.glucoseProcessor.reset();
    if (this.hydrationProcessor) this.hydrationProcessor.reset();
    if (this.cardiacProcessor) this.cardiacProcessor.reset();
    console.log("ModularVitalSignsProcessor: All processors reset");
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
      lipids: {
        totalCholesterol: 0,
        hydrationPercentage: 0
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
      // Changed from LIPIDS to HYDRATION
      this.signalDistributor.addChannel(VitalSignType.HYDRATION);
    }
  }
  
  /**
   * Get diagnostics data
   */
  private collectDiagnostics(): any {
    // Use a safer way to check for and call getDiagnostics if it exists
    const distributorDiagnostics = this.signalDistributor && 
                                   typeof this.signalDistributor === 'object' && 
                                   'getDiagnostics' in this.signalDistributor ?
                                   this.signalDistributor.getDiagnostics() :
                                   {};
    
    return {
      distributor: distributorDiagnostics,
      spo2: this.spo2Processor ? this.spo2Processor.getDiagnostics() : {},
      bp: this.bpProcessor ? this.bpProcessor.getDiagnostics() : {},
      glucose: this.glucoseProcessor ? this.glucoseProcessor.getDiagnostics() : {},
      hydration: this.hydrationProcessor ? this.hydrationProcessor.getDiagnostics() : {},
      cardiac: this.cardiacProcessor ? this.cardiacProcessor.getDiagnostics() : {}
    };
  }
  
  /**
   * Get diagnostics data
   */
  public getDiagnostics(): any {
    return this.collectDiagnostics();
  }
}
