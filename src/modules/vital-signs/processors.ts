
// This file creates stub implementations for the missing processor classes

export class GlucoseProcessor {
  initialize(): void {
    console.log('Initializing glucose processor');
  }
  
  processValue(value: number): number {
    return value;
  }
  
  getFeedback(): any {
    return {
      channelId: 'glucose',
      signalQuality: 0.8,
      timestamp: Date.now(),
      success: true
    };
  }
}

export class BloodPressureProcessor {
  initialize(): void {
    console.log('Initializing blood pressure processor');
  }
  
  processValue(value: number): any {
    return {
      systolic: 120,
      diastolic: 80
    };
  }
  
  getFeedback(): any {
    return {
      channelId: 'blood_pressure',
      signalQuality: 0.7,
      timestamp: Date.now(),
      success: true
    };
  }
  
  getConfidence(): number {
    return 0.8;
  }
}

export class SpO2Processor {
  initialize(): void {
    console.log('Initializing SpO2 processor');
  }
  
  processValue(value: number): number {
    return 98;
  }
  
  getFeedback(): any {
    return {
      channelId: 'spo2',
      signalQuality: 0.9,
      timestamp: Date.now(),
      success: true
    };
  }
  
  getConfidence(): number {
    return 0.9;
  }
}
