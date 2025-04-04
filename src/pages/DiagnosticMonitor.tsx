import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useSignalProcessor } from "@/hooks/useSignalProcessor";
import { useHeartBeatProcessor } from "@/hooks/useHeartBeatProcessor";
import { getDiagnosticsData, getAverageDiagnostics, getDetailedQualityStats } from "@/hooks/heart-beat/signal-processing/peak-detection";
import { toast } from "@/components/ui/use-toast";

const DiagnosticMonitor: React.FC = () => {
  const { lastSignal, signalStats } = useSignalProcessor();
  const { getDiagnostics } = useHeartBeatProcessor();
  
  const [refreshInterval, setRefreshInterval] = useState<number>(1000);
  const [diagnosticData, setDiagnosticData] = useState<any>({});
  const [cameraStats, setCameraStats] = useState<any>({
    resolution: "N/A",
    fps: 0,
    torch: "N/A",
    signalExtraction: "N/A"
  });
  const [processingStats, setProcessingStats] = useState<any>({
    processingTime: 0,
    signalQuality: 0,
    lastProcessedTime: 0,
    frameCount: 0
  });
  
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const fpsCounterRef = useRef<number>(0);
  
  useEffect(() => {
    // Update FPS counter
    frameCountRef.current++;
    const now = Date.now();
    if (now - lastFrameTimeRef.current > 1000) {
      fpsCounterRef.current = frameCountRef.current;
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
    
    // Update camera stats if signal exists
    if (lastSignal) {
      setCameraStats(prev => ({
        ...prev,
        fps: fpsCounterRef.current,
        signalStrength: lastSignal.quality || 0,
        signalExtraction: lastSignal.fingerDetected ? "Activo" : "Inactivo"
      }));
    }
    
  }, [lastSignal]);
  
  useEffect(() => {
    const updateDiagnostics = () => {
      try {
        const diagnostics = getDiagnostics();
        setDiagnosticData(diagnostics);
        
        // Actualizar estadísticas de procesamiento
        setProcessingStats({
          processingTime: diagnostics.processingMetrics?.avgProcessTime || 0,
          signalQuality: diagnostics.qualityStats?.lastQualityScore || 0,
          lastProcessedTime: Date.now(),
          frameCount: frameCountRef.current
        });
      } catch (error) {
        console.error("Error updating diagnostics:", error);
      }
    };
    
    const intervalId = setInterval(updateDiagnostics, refreshInterval);
    return () => clearInterval(intervalId);
  }, [getDiagnostics, refreshInterval]);

  return (
    <div className="fixed inset-0 bg-black text-white overflow-auto p-4">
      <header className="flex justify-between items-center border-b border-gray-800 pb-2 mb-4">
        <h1 className="text-2xl font-bold">Monitor Diagnóstico Técnico Avanzado</h1>
        <Link to="/" className="bg-blue-600 px-4 py-2 rounded">Volver</Link>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Flujo de Datos */}
        <section className="border border-gray-800 rounded-lg p-4 bg-gray-900">
          <h2 className="text-xl font-bold mb-2">Flujo de Datos en Tiempo Real</h2>
          <div className="text-xs">
            <pre className="overflow-auto max-h-40 bg-black p-2 rounded">
              {JSON.stringify({
                camera: cameraStats,
                signal: lastSignal,
                processing: processingStats,
                stats: signalStats
              }, null, 2)}
            </pre>
          </div>
        </section>
        
        {/* Calidad de Señal */}
        <section className="border border-gray-800 rounded-lg p-4 bg-gray-900">
          <h2 className="text-xl font-bold mb-2">Calidad de Señal</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 p-2 rounded">
              <span className="block text-sm opacity-70">Calidad Actual:</span>
              <span className="text-lg font-mono">
                {lastSignal?.quality?.toFixed(2) || "N/A"}%
              </span>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <span className="block text-sm opacity-70">Distribución:</span>
              <span className="text-xs font-mono">
                Excelente: {diagnosticData?.qualityStats?.qualityDistribution?.excellent?.toFixed(1) || "0"}%<br/>
                Buena: {diagnosticData?.qualityStats?.qualityDistribution?.good?.toFixed(1) || "0"}%<br/>
                Moderada: {diagnosticData?.qualityStats?.qualityDistribution?.moderate?.toFixed(1) || "0"}%<br/>
                Débil: {diagnosticData?.qualityStats?.qualityDistribution?.weak?.toFixed(1) || "0"}%
              </span>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <span className="block text-sm opacity-70">Tendencia:</span>
              <span className="text-lg font-mono">
                {diagnosticData?.qualityStats?.qualityTrend || "N/A"}
              </span>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <span className="block text-sm opacity-70">Fuerza de Señal:</span>
              <span className="text-lg font-mono">
                {diagnosticData?.processingMetrics?.avgSignalStrength?.toFixed(3) || "N/A"}
              </span>
            </div>
          </div>
        </section>
        
        {/* Detección de Latidos */}
        <section className="border border-gray-800 rounded-lg p-4 bg-gray-900">
          <h2 className="text-xl font-bold mb-2">Detección de Latidos</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 p-2 rounded">
              <span className="block text-sm opacity-70">Estabilidad BPM:</span>
              <span className="text-lg font-mono">
                {diagnosticData?.patientMetrics?.bpmStability?.toFixed(1) || "N/A"}%
              </span>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <span className="block text-sm opacity-70">Regularidad:</span>
              <span className="text-lg font-mono">
                {(diagnosticData?.processingMetrics?.peakRegularity * 100)?.toFixed(1) || "N/A"}%
              </span>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <span className="block text-sm opacity-70">% Anomalías:</span>
              <span className="text-lg font-mono">
                {diagnosticData?.processingMetrics?.anomalyPercentage?.toFixed(1) || "N/A"}%
              </span>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <span className="block text-sm opacity-70">Riesgo Arritmia:</span>
              <span className="text-lg font-mono">
                {diagnosticData?.patientMetrics?.arrhythmiaRisk?.toFixed(1) || "N/A"}%
              </span>
            </div>
          </div>
        </section>
        
        {/* Rendimiento */}
        <section className="border border-gray-800 rounded-lg p-4 bg-gray-900">
          <h2 className="text-xl font-bold mb-2">Rendimiento del Sistema</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 p-2 rounded">
              <span className="block text-sm opacity-70">FPS:</span>
              <span className="text-lg font-mono">{fpsCounterRef.current}</span>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <span className="block text-sm opacity-70">Tiempo Procesamiento:</span>
              <span className="text-lg font-mono">
                {diagnosticData?.processingMetrics?.avgProcessTime?.toFixed(2) || "N/A"} ms
              </span>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <span className="block text-sm opacity-70">% Alto Prioridad:</span>
              <span className="text-lg font-mono">
                {diagnosticData?.processingMetrics?.highPriorityPercentage?.toFixed(1) || "N/A"}%
              </span>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <span className="block text-sm opacity-70">Estado Actual:</span>
              <span className="text-lg font-mono">
                {lastSignal ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </section>
        
        {/* Diagnóstico Detallado */}
        <section className="border border-gray-800 rounded-lg p-4 bg-gray-900 col-span-1 md:col-span-2">
          <h2 className="text-xl font-bold mb-2">Diagnóstico Técnico Detallado</h2>
          <div className="text-xs">
            <pre className="overflow-auto max-h-60 bg-black p-2 rounded">
              {JSON.stringify(diagnosticData, null, 2)}
            </pre>
          </div>
        </section>
      </div>
      
      <footer className="mt-4 text-gray-500 text-xs">
        Monitor de Diagnóstico Técnico - Datos completamente reales - No simulación
      </footer>
    </div>
  );
};

export default DiagnosticMonitor;
