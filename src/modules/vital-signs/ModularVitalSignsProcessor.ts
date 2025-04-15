
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { SignalDistributor } from '../signal-processing/SignalDistributor';
import { VitalSignType } from '../../types/signal';
import { SpO2Processor } from './specialized/SpO2Processor';
import { BloodPressureProcessor } from './specialized/BloodPressureProcessor';
import { GlucoseProcessor } from './specialized/GlucoseProcessor';
import { LipidsProcessor } from './specialized/LipidsProcessor';
import { CardiacProcessor } from './specialized/CardiacProcessor';
import { LipidsResult } from './specialized/LipidsProcessor';
import { CardiacResult } from './specialized/CardiacProcessor';

/**
 * Modular implementation of vital signs processor
 * Supports both direct measurement and advanced features
 */
export class ModularVitalSignsProcessor {
  private signalDistributor: SignalDistributor | null = null;
  private spo2Processor: SpO2Processor | null = null;
  private bpProcessor: BloodPressureProcessor | null = null;
  private glucoseProcessor: GlucoseProcessor | null = null;
  private lipidProcessor: LipidsProcessor | null = null;
  private cardiacProcessor: CardiacProcessor | null = null;
  
  /**
   * Constructor initializing the modular processor
   */
  constructor() {
    console.log("ModularVitalSignsProcessor: Initializing new instance");
    this.initializeProcessors();
  }
  
  /**
   * Process a signal value and return vital signs result
   */
  public processSignal(value: number): any {
    if (!this.signalDistributor) {
      console.warn("ModularVitalSignsProcessor: Signal distributor not initialized");
      return this.getEmptyResult();
    }
    
    // Distribute signal to specialized processors
    const distributedSignals = this.signalDistributor.processSignal(value);
    
    // Collect results from specialized processors
    const spo2 = this.spo2Processor ? 
      this.spo2Processor.processValue(distributedSignals[VitalSignType.SPO2] || 0) : 0;
      
    const bp = this.bpProcessor ? 
      this.bpProcessor.processValue(distributedSignals[VitalSignType.BLOOD_PRESSURE] || 0) : 
      { systolic: 0, diastolic: 0 };
      
    const glucose = this.glucoseProcessor ? 
      this.glucoseProcessor.processValue(distributedSignals[VitalSignType.GLUCOSE] || 0) : 0;
      
    const lipids: LipidsResult = this.lipidProcessor ? 
      this.lipidProcessor.processValue(distributedSignals[VitalSignType.LIPIDS] || 0) : 
      { totalCholesterol: 0, triglycerides: 0 };
      
    const cardiac: CardiacResult = this.cardiacProcessor ? 
      this.cardiacProcessor.processValue(distributedSignals[VitalSignType.HEARTBEAT] || 0) : 
      { heartRate: 0, arrhythmiaDetected: false, rhythmRegularity: 0 };
    
    // Prepare result
    return {
      spo2,
      pressure: `${bp.systolic}/${bp.diastolic}`,
      arrhythmiaStatus: cardiac.arrhythmiaDetected ? 'ARRHYTHMIA DETECTED' : 'NORMAL RHYTHM',
      glucose,
      lipids: {
        totalCholesterol: lipids.totalCholesterol,
        triglycerides: lipids.triglycerides
      }
    };
  }
  
  /**
   * Reset all processors
   */
  public reset(): void {
    if (this.spo2Processor) this.spo2Processor.reset();
    if (this.bpProcessor) this.bpProcessor.reset();
    if (this.glucoseProcessor) this.glucoseProcessor.reset();
    if (this.lipidProcessor) this.lipidProcessor.reset();
    if (this.cardiacProcessor) this.cardiacProcessor.reset();
    
    console.log("ModularVitalSignsProcessor: All processors reset");
  }
  
  /**
   * Get an empty result
   */
  private getEmptyResult(): any {
    return {
      spo2: 0,
      pressure: '--/--',
      arrhythmiaStatus: '--',
      glucose: 0,
      lipids: {
        totalCholesterol: 0,
        triglycerides: 0
      }
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
    this.lipidProcessor = new LipidsProcessor();
    this.cardiacProcessor = new CardiacProcessor();
    
    // Route signal to specialized processors
    if (this.signalDistributor) {
      this.signalDistributor.start();
      this.signalDistributor.addChannel(VitalSignType.SPO2);
      this.signalDistributor.addChannel(VitalSignType.BLOOD_PRESSURE);
      this.signalDistributor.addChannel(VitalSignType.HEARTBEAT);
      this.signalDistributor.addChannel(VitalSignType.GLUCOSE);
      this.signalDistributor.addChannel(VitalSignType.LIPIDS);
    }
  }
  
  /**
   * Get diagnostics data
   */
  public getDiagnostics(): Record<string, any> {
    return this.collectDiagnostics();
  }
  
  /**
   * Collect diagnostics from all processors
   */
  private collectDiagnostics(): Record<string, any> {
    // Use a safer way to check for and call getDiagnostics if it exists
    const distributorDiagnostics = this.signalDistributor ? 
      this.signalDistributor.getDiagnostics() : {};
    
    return {
      distributor: distributorDiagnostics,
      spo2: this.spo2Processor ? this.spo2Processor.getDiagnostics() : {},
      bp: this.bpProcessor ? this.bpProcessor.getDiagnostics() : {},
      glucose: this.glucoseProcessor ? this.glucoseProcessor.getDiagnostics() : {},
      lipids: this.lipidProcessor ? this.lipidProcessor.getDiagnostics() : {},
      cardiac: this.cardiacProcessor ? this.cardiacProcessor.getDiagnostics() : {}
    };
  }
}
