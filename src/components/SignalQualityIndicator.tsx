
import React from 'react';
import { AlertCircle, CheckCircle, Activity } from 'lucide-react';

interface SignalQualityMetrics {
  generalQuality: number;
  signalStrength: number;
  stability: number;
  periodicity: number;
  noiseLevel: number;
  hasQualityAlert: boolean;
  diagnosticDetails: string[];
  algorithmSpecific?: {
    cardiac?: {
      pulseQuality: number;
      rhythmStability: number;
    };
    spo2?: {
      perfusionIndex: number;
      signalToNoise: number;
    };
  };
}

interface SignalQualityIndicatorProps {
  metrics: SignalQualityMetrics | null;
  isAlertActive: boolean;
  problemAlgorithms: {algorithm: string, issues: string[], quality: number}[];
  showDetailedDiagnostics: boolean;
}

const SignalQualityIndicator: React.FC<SignalQualityIndicatorProps> = ({
  metrics,
  isAlertActive,
  problemAlgorithms,
  showDetailedDiagnostics
}) => {
  if (!metrics) {
    return (
      <div className="text-gray-400 flex items-center">
        <Activity className="mr-2" />
        <span>Sin datos de calidad</span>
      </div>
    );
  }

  const getQualityColor = (value: number) => {
    if (value >= 70) return 'text-green-500';
    if (value >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const qualityText = metrics.generalQuality >= 70 
    ? 'Buena' 
    : metrics.generalQuality >= 50 
      ? 'Aceptable' 
      : 'Baja';

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-3 max-w-md">
      <div className="flex items-center mb-2">
        {metrics.generalQuality >= 70 ? (
          <CheckCircle className="text-green-500 mr-2" />
        ) : (
          <AlertCircle className={`${metrics.generalQuality >= 50 ? 'text-yellow-500' : 'text-red-500'} mr-2`} />
        )}
        <h3 className={`font-bold ${getQualityColor(metrics.generalQuality)}`}>
          Calidad de señal: {qualityText} ({Math.round(metrics.generalQuality)}%)
        </h3>
      </div>

      {(isAlertActive || showDetailedDiagnostics) && (
        <div className="mt-2">
          <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
            <div>
              <span className="text-gray-400">Fuerza:</span>
              <span className={`ml-1 ${getQualityColor(metrics.signalStrength)}`}>
                {Math.round(metrics.signalStrength)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Estabilidad:</span>
              <span className={`ml-1 ${getQualityColor(metrics.stability)}`}>
                {Math.round(metrics.stability)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Periodicidad:</span>
              <span className={`ml-1 ${getQualityColor(metrics.periodicity)}`}>
                {Math.round(metrics.periodicity)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Ruido:</span>
              <span className={`ml-1 ${getQualityColor(100 - metrics.noiseLevel)}`}>
                {Math.round(metrics.noiseLevel)}%
              </span>
            </div>
          </div>
          
          {metrics.diagnosticDetails.length > 0 && (
            <div className="mt-1 text-xs text-gray-300 border-t border-gray-700 pt-1">
              {metrics.diagnosticDetails.map((detail, idx) => (
                <div key={idx} className="text-yellow-400">• {detail}</div>
              ))}
            </div>
          )}
          
          {problemAlgorithms.length > 0 && (
            <div className="mt-1 text-xs border-t border-gray-700 pt-1">
              <span className="text-gray-400">Algoritmos con problemas:</span>
              {problemAlgorithms.map((problem, idx) => (
                <div key={idx} className="text-red-400 ml-2">
                  • {problem.algorithm.split(':')[1] || problem.algorithm}: {problem.quality}%
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SignalQualityIndicator;
