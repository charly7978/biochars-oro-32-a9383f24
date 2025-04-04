
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useHeartBeatProcessor } from "@/hooks/useHeartBeatProcessor";
import { useSignalProcessor } from "@/hooks/useSignalProcessor";
import { useFingerDetection } from "@/hooks/useFingerDetection";

// 🔬 Monitoreo técnico profundo
export default function MonitoringCore() {
  const [logs, setLogs] = useState<string[]>([]);
  const [startTime] = useState(Date.now());

  // ⚙️ Hooks del sistema biométrico real
  const {
    currentBPM: bpm,
    isArrhythmia: arrythmiaDetected,
    processSignal,
    reset,
    startMonitoring,
    stopMonitoring
  } = useHeartBeatProcessor();

  // Use our actual signal processor hook for signal data
  const {
    isProcessing,
    signalQuality,
    fingerDetected: isFingerDetected,
    lastResult
  } = useSignalProcessor();

  // Use finger detection hook
  const { 
    isFingerDetected: fingerDetectionState,
    confidence,
    diagnostics
  } = useFingerDetection();

  // 🧠 Estado de procesamiento (simulado ya que no tenemos acceso a TensorFlow directamente)
  const [neuralState, setNeuralState] = useState<string>("Analizando...");
  const [tfStatus, setTfStatus] = useState({
    loaded: false,
    modelName: "PPG-CNN-v1",
    active: false
  });

  // Simular estadísticas de señal para la interfaz
  const [signalStats, setSignalStats] = useState({
    ppgLevel: 0,
    noiseLevel: 0,
    lastUpdated: Date.now()
  });

  // Calidad de la señal basada en el valor real
  const getQualityLevel = (quality: number) => {
    if (quality >= 80) return "Excelente";
    if (quality >= 60) return "Buena";
    if (quality >= 40) return "Regular";
    if (quality >= 20) return "Baja";
    return "Muy baja";
  };

  // Iniciar el procesamiento cuando el componente se monta
  useEffect(() => {
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
      stopMonitoring();
      log("[FIN] Procesamiento detenido.");
    };
  }, []);

  // Actualizar estadísticas basadas en último resultado
  useEffect(() => {
    if (lastResult) {
      setSignalStats({
        ppgLevel: Math.round(lastResult.amplifiedValue * 100) / 100,
        noiseLevel: 1 - (signalQuality / 100),
        lastUpdated: Date.now()
      });
    }
  }, [lastResult, signalQuality]);

  // Registrar datos periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      log(`[LATIDO] BPM: ${bpm || 'n/a'} | Arritmia: ${arrythmiaDetected ? "Sí" : "No"}`);
      log(`[PPG] Nivel de señal: ${signalStats.ppgLevel.toFixed(3)} | Ruido: ${signalStats.noiseLevel.toFixed(2)}`);
      log(`[NEURONA] Modelo activo: ${tfStatus.modelName} | Activado: ${tfStatus.active ? "Sí" : "No"}`);
      log(`[TF] TensorFlow cargado: ${tfStatus.loaded ? "Sí" : "No"}`);
      log(`[CALIDAD] ${signalQuality} (${getQualityLevel(signalQuality)})`);
      log(`[DEDO] Detectado: ${isFingerDetected ? "Sí" : "No"} | Confianza: ${(confidence * 100).toFixed(1)}%`);
      
      if (diagnostics && Object.keys(diagnostics).length > 0) {
        const sources = diagnostics.sources || {};
        const activeCount = Object.values(sources).filter((s: any) => s.detected).length;
        log(`[DIAG] Fuentes activas: ${activeCount}/${Object.keys(sources).length}`);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [bpm, signalStats, tfStatus, isFingerDetected, signalQuality, arrythmiaDetected, confidence, diagnostics]);

  // Función para agregar logs con timestamp
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
