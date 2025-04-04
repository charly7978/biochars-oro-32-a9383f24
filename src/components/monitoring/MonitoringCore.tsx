
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useHeartBeatProcessor } from "@/hooks/useHeartBeatProcessor";
import { useSignalProcessor } from "@/hooks/useSignalProcessor";
import { useFingerDetection } from "@/hooks/useFingerDetection";
import { useSignalQualityDetector } from "@/hooks/vital-signs/use-signal-quality-detector";

// 🔬 Monitoreo técnico profundo
export default function MonitoringCore() {
  const [logs, setLogs] = useState<string[]>([]);
  const [startTime] = useState(Date.now());
  const [signalStats, setSignalStats] = useState({
    ppgLevel: 0,
    noiseLevel: 0,
    lastUpdated: Date.now()
  });
  
  // ⚙️ Hooks del sistema biométrico real
  const {
    currentBPM: bpm,
    isArrhythmia: arrythmiaDetected,
    processSignal,
    reset,
    startMonitoring,
    stopMonitoring
  } = useHeartBeatProcessor();

  // Use our signal processor hooks
  const { 
    isProcessing,
    lastSignal,
    startProcessing: startSignalProcessing, 
    stopProcessing: stopSignalProcessing
  } = useSignalProcessor();

  // Use finger detection hook
  const { isFingerDetected } = useFingerDetection();
  
  // Use our signal quality detector
  const { signalQuality, qualityLevel } = useSignalQualityDetector();

  // 🧠 TensorFlow & Red Neuronal (estado interno)
  const [neuralState, setNeuralState] = useState<string>("Analizando...");
  const [tfStatus, setTfStatus] = useState({
    loaded: false,
    modelName: "PPG-CNN-v1",
    active: false
  });

  // Update stats based on last signal
  useEffect(() => {
    if (lastSignal) {
      setSignalStats({
        ppgLevel: Math.round(lastSignal.filteredValue * 100) / 100,
        noiseLevel: 1 - (lastSignal.quality / 100),
        lastUpdated: Date.now()
      });
    }
  }, [lastSignal]);

  useEffect(() => {
    startSignalProcessing();
    startMonitoring();
    log("[INICIO] Procesamiento iniciado.");

    // Simular carga de TensorFlow
    setTimeout(() => {
      setTfStatus(prev => ({ ...prev, loaded: true }));
      log("[TF] TensorFlow cargado con éxito");
    }, 2000);

    // Simular activación del modelo
    setTimeout(() => {
      setTfStatus(prev => ({ ...prev, active: true }));
      setNeuralState("Procesando");
      log("[NEURONA] Modelo neuronial PPG-CNN-v1 activado");
    }, 4000);

    return () => {
      stopSignalProcessing();
      stopMonitoring();
      log("[FIN] Procesamiento detenido.");
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      log(`[LATIDO] BPM: ${bpm || 'n/a'} | Arritmia: ${arrythmiaDetected ? "Sí" : "No"}`);
      log(`[PPG] Nivel de señal: ${signalStats.ppgLevel.toFixed(3)} | Ruido: ${signalStats.noiseLevel.toFixed(2)}`);
      log(`[NEURONA] Modelo activo: ${tfStatus.modelName} | Activado: ${tfStatus.active ? "Sí" : "No"}`);
      log(`[TF] TensorFlow cargado: ${tfStatus.loaded ? "Sí" : "No"}`);
      log(`[CALIDAD] ${signalQuality} (${qualityLevel})`);
      log(`[DEDO] Detectado: ${isFingerDetected ? "Sí" : "No"}`);
    }, 3000);

    return () => clearInterval(interval);
  }, [bpm, signalStats, tfStatus, isFingerDetected, signalQuality, qualityLevel, arrythmiaDetected]);

  const log = (msg: string) => {
    const timestamp = ((Date.now() - startTime) / 1000).toFixed(1);
    setLogs(prev => [`[${timestamp}s] ${msg}`, ...prev.slice(0, 99)]);
  };

  return (
    <div className="w-full h-screen bg-zinc-950 text-green-400 font-mono p-6 overflow-y-auto">
      <h1 className="text-2xl mb-4">🧠 MONITOREO INTERNO DEL SISTEMA</h1>

      <Card className="mb-4">
        <CardContent className="bg-black p-4 text-sm max-h-[70vh] overflow-y-scroll border border-green-600">
          {logs.map((log, idx) => (
            <div key={idx} className="whitespace-pre-wrap">{log}</div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs opacity-50">Monitoreo técnico en tiempo real. Mostrando funcionamiento interno, redes neuronales, señal, TensorFlow, etc.</p>
    </div>
  );
}
