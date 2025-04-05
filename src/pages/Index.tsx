
import React, { useEffect, useState } from 'react';
import { useVitalSignsProcessor } from '../hooks/useVitalSignsProcessor';
import { useVitalSignsWithProcessing } from '../hooks/useVitalSignsWithProcessing';

export default function Index() {
  const vitalsProcessor = useVitalSignsProcessor();
  const vitalSigns = useVitalSignsWithProcessing();
  
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Start/stop monitoring
  const toggleMonitoring = () => {
    if (isMonitoring) {
      vitalSigns.stopMonitoring();
      setIsMonitoring(false);
    } else {
      vitalSigns.startMonitoring();
      setIsMonitoring(true);
    }
  };

  // Reset system
  const resetSystem = () => {
    vitalSigns.reset();
    setIsMonitoring(false);
  };
  
  // Generate simulated data for testing
  const simulateReading = () => {
    const currentTimestamp = Date.now();
    const reading = {
      timestamp: currentTimestamp,
      quality: Math.random() * 100,
      fingerDetected: true,
      rawValue: Math.random() * 2 - 1,
      filteredValue: Math.random() * 2 - 1,
      amplifiedValue: Math.random() * 2 - 1,
      heartRate: 60 + Math.random() * 40,
      isPeak: Math.random() > 0.8,
      rrInterval: 600 + Math.random() * 400,
      spo2: 95 + Math.random() * 4,
      pressure: "120/80",
      arrhythmiaStatus: "NORMAL",
      arrhythmiaCount: 0,
      hydrationPercentage: 65 + Math.random() * 10
    };
    return reading;
  };

  // Effect for simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isMonitoring) {
      interval = setInterval(() => {
        // Simulate data only for display purposes
        const simulatedData = simulateReading();
        
        // Process simulated data through the vital signs processor
        vitalsProcessor.processSignal(simulatedData.filteredValue);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isMonitoring, vitalsProcessor]);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Vital Signs Monitoring</h1>
      
      <div className="flex gap-4 mb-8">
        <button 
          onClick={toggleMonitoring}
          className={`px-4 py-2 rounded font-medium ${isMonitoring ? 
            'bg-red-500 hover:bg-red-600' : 
            'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
        >
          {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
        
        <button 
          onClick={resetSystem}
          className="px-4 py-2 rounded font-medium bg-gray-500 hover:bg-gray-600 text-white transition-colors"
        >
          Reset System
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Left column - Signal metrics */}
        <div className="bg-white p-4 rounded shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Signal Metrics</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">Signal Quality:</span>
              <span>{vitalSigns.lastResult?.quality.toFixed(1) || '--'}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Finger Detected:</span>
              <span>{vitalSigns.fingerDetected ? 'Yes' : 'No'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Heart Rate:</span>
              <span>{vitalSigns.heartRate ? `${vitalSigns.heartRate} BPM` : '--'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Processed Frames:</span>
              <span>{vitalSigns.processedFrames}</span>
            </div>
          </div>
        </div>
        
        {/* Right column - Vital signs */}
        <div className="bg-white p-4 rounded shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Vital Signs</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">SpO2:</span>
              <span>{vitalSigns.lastResult?.spo2 ? `${vitalSigns.lastResult.spo2.toFixed(1)}%` : '--'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Blood Pressure:</span>
              <span>{vitalSigns.lastResult?.pressure || '--'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Arrhythmia Status:</span>
              <span>{vitalSigns.lastResult?.arrhythmiaStatus || '--'}</span>
            </div>

            {/* New Hydration display */}
            <div className="flex justify-between">
              <span className="font-medium">Hydration Level:</span>
              <span>{vitalSigns.lastResult?.hydrationPercentage ? 
                `${vitalSigns.lastResult.hydrationPercentage.toFixed(1)}%` : 
                '--'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
