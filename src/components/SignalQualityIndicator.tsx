
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Componente que muestra la calidad de la señal optimizada
 * Se ubica entre el optimizador y los algoritmos de medición para evaluar la calidad general
 * Muestra diagnóstico detallado cuando hay problemas de calidad
 */
import React, { useState, useEffect } from 'react';
import { Signal, AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { SignalQualityMetrics } from '@/modules/signal-processing/utils/signal-quality-monitor';

interface SignalQualityIndicatorProps {
  metrics: SignalQualityMetrics | null;
  isAlertActive: boolean;
  problemAlgorithms?: {algorithm: string, issues: string[], quality: number}[];
  showDetailedDiagnostics: boolean;
}

const SignalQualityIndicator: React.FC<SignalQualityIndicatorProps> = ({
  metrics,
  isAlertActive,
  problemAlgorithms = [],
  showDetailedDiagnostics
}) => {
  // Estado para controlar la visibilidad del panel detallado
  const [showDetails, setShowDetails] = useState(false);
  
  // Actualizar estado de detalles cuando cambian los diagnósticos
  useEffect(() => {
    if (showDetailedDiagnostics) {
      setShowDetails(true);
    }
  }, [showDetailedDiagnostics]);
  
  // Si no hay métricas, mostrar estado desconectado
  if (!metrics) {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2 text-gray-400">
        <WifiOff size={18} />
        <span className="text-sm font-medium">Monitor de señal inactivo</span>
      </div>
    );
  }
  
  // Determinar color según la calidad general
  const getQualityColor = (quality: number) => {
    if (quality >= 70) return 'text-green-500';
    if (quality >= 50) return 'text-yellow-500';
    if (quality >= 30) return 'text-orange-500';
    return 'text-red-500';
  };
  
  // Componente básico de calidad (modo normal)
  const BasicQualityIndicator = () => (
    <div 
      className={`rounded-lg p-2 flex items-center gap-2 ${
        isAlertActive ? 'bg-red-900/30 text-red-300' : 'bg-gray-900/50 text-gray-300'
      }`}
      onClick={() => setShowDetails(!showDetails)}
    >
      <Signal 
        size={18} 
        className={getQualityColor(metrics.generalQuality)} 
      />
      <span className="text-sm font-medium">
        Calidad: <span className={getQualityColor(metrics.generalQuality)}>
          {Math.round(metrics.generalQuality)}%
        </span>
      </span>
      {isAlertActive && (
        <AlertCircle size={18} className="text-red-500 animate-pulse" />
      )}
    </div>
  );
  
  // Componente de diagnóstico detallado
  const DetailedDiagnostics = () => (
    <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-3 absolute top-full mt-1 left-0 right-0 z-50 border border-gray-800 shadow-xl">
      <div className="text-sm font-medium text-gray-300 mb-2 flex justify-between items-center">
        <span>Diagnóstico de señal</span>
        <button 
          className="text-gray-400 hover:text-gray-300"
          onClick={() => setShowDetails(false)}
        >
          ×
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400">Fuerza de señal</span>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div 
              className={`h-full ${getQualityColor(metrics.signalStrength)}`}
              style={{ width: `${metrics.signalStrength}%` }}
            />
          </div>
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs text-gray-400">Estabilidad</span>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div 
              className={`h-full ${getQualityColor(metrics.stability)}`}
              style={{ width: `${metrics.stability}%` }}
            />
          </div>
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs text-gray-400">Periodicidad</span>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div 
              className={`h-full ${getQualityColor(metrics.periodicity)}`}
              style={{ width: `${metrics.periodicity}%` }}
            />
          </div>
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs text-gray-400">Nivel de ruido</span>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div 
              className={`h-full ${
                metrics.noiseLevel < 30 ? 'bg-green-500' : 
                metrics.noiseLevel < 50 ? 'bg-yellow-500' : 
                metrics.noiseLevel < 70 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${metrics.noiseLevel}%` }}
            />
          </div>
        </div>
      </div>
      
      {problemAlgorithms.length > 0 && (
        <div className="mt-2">
          <span className="text-xs font-medium text-red-400">Algoritmos con problemas:</span>
          <ul className="mt-1 space-y-1">
            {problemAlgorithms.map((alg, index) => (
              <li key={index} className="text-xs text-gray-300 flex items-start gap-1">
                <AlertCircle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">{alg.algorithm}</span>
                  <ul className="pl-3 mt-0.5 text-gray-400">
                    {alg.issues.map((issue, i) => (
                      <li key={i} className="text-xs">{issue}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Estado específico por algoritmo */}
      {metrics.algorithmSpecific.cardiac && (
        <div className="mt-2 bg-gray-800/50 rounded p-1.5">
          <span className="text-xs font-medium text-gray-300">Estado cardíaco:</span>
          <div className="grid grid-cols-2 gap-1 mt-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Pulso:</span>
              <span className={`text-xs ${getQualityColor(metrics.algorithmSpecific.cardiac.pulseQuality)}`}>
                {Math.round(metrics.algorithmSpecific.cardiac.pulseQuality)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Ritmo:</span>
              <span className={`text-xs ${getQualityColor(metrics.algorithmSpecific.cardiac.rhythmStability)}`}>
                {Math.round(metrics.algorithmSpecific.cardiac.rhythmStability)}%
              </span>
            </div>
          </div>
        </div>
      )}
      
      {metrics.algorithmSpecific.spo2 && (
        <div className="mt-2 bg-gray-800/50 rounded p-1.5">
          <span className="text-xs font-medium text-gray-300">Estado SpO2:</span>
          <div className="grid grid-cols-2 gap-1 mt-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Perfusión:</span>
              <span className={`text-xs ${getQualityColor(metrics.algorithmSpecific.spo2.perfusionIndex * 100)}`}>
                {(metrics.algorithmSpecific.spo2.perfusionIndex).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">S/N:</span>
              <span className={`text-xs ${getQualityColor(metrics.algorithmSpecific.spo2.signalToNoise)}`}>
                {Math.round(metrics.algorithmSpecific.spo2.signalToNoise)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  return (
    <div className="relative">
      <BasicQualityIndicator />
      {showDetails && <DetailedDiagnostics />}
    </div>
  );
};

export default SignalQualityIndicator;
