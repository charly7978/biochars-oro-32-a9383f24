
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SignalAnalyticsProps {
  lastSignal: any;
  heartRate: number;
  signalQuality: number;
  signalStats: any;
}

const SignalAnalytics: React.FC<SignalAnalyticsProps> = ({
  lastSignal,
  heartRate,
  signalQuality,
  signalStats
}) => {
  // References for different signal quality ranges
  const qualityReferences = {
    excellent: { min: 80, color: "bg-green-500" },
    good: { min: 60, color: "bg-blue-500" },
    fair: { min: 40, color: "bg-yellow-500" },
    poor: { min: 20, color: "bg-orange-500" },
    critical: { min: 0, color: "bg-red-500" },
  };

  // Get the appropriate color based on signal quality
  const getQualityColor = (quality: number) => {
    if (quality >= qualityReferences.excellent.min) return qualityReferences.excellent.color;
    if (quality >= qualityReferences.good.min) return qualityReferences.good.color;
    if (quality >= qualityReferences.fair.min) return qualityReferences.fair.color;
    if (quality >= qualityReferences.poor.min) return qualityReferences.poor.color;
    return qualityReferences.critical.color;
  };

  // Create threshold references for heart rate
  const heartRateReferences = {
    low: { value: 60, label: "Bajo" },
    normal: { value: 100, label: "Normal" },
    high: { value: 120, label: "Elevado" },
  };

  return (
    <div className="space-y-2">
      <Card className="bg-gray-900 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Señal PPG</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="font-semibold mb-1">Calidad de Señal</div>
              <div className="flex items-center gap-2">
                <Progress value={signalQuality} className={getQualityColor(signalQuality)} />
                <span>{signalQuality}%</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Ref: &gt;80% Excelente, &gt;60% Buena, &gt;40% Media, &gt;20% Baja
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1">Frecuencia Cardíaca</div>
              <div className="text-xl">{heartRate || "--"} <span className="text-xs">BPM</span></div>
              <div className="text-xs text-gray-400">
                Ref: &lt;{heartRateReferences.low.value} {heartRateReferences.low.label}, 
                {heartRateReferences.low.value}-{heartRateReferences.normal.value} {heartRateReferences.normal.label}, 
                &gt;{heartRateReferences.normal.value} {heartRateReferences.high.label}
              </div>
            </div>
          </div>

          {lastSignal && (
            <div className="mt-2">
              <div className="font-semibold mb-1 text-xs">Valores Actuales:</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>Valor filtrado: {lastSignal.filteredValue?.toFixed(4) || "--"}</div>
                <div>Valor crudo: {lastSignal.rawValue?.toFixed(2) || "--"}</div>
                <div>Dedo detectado: {lastSignal.fingerDetected ? "Sí" : "No"}</div>
                <div>Índice perfusión: {lastSignal.perfusionIndex?.toFixed(4) || "--"}</div>
              </div>
            </div>
          )}

          {signalStats && (
            <div className="mt-2">
              <div className="font-semibold mb-1 text-xs">Estadísticas:</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>Min: {signalStats.minValue !== Infinity ? signalStats.minValue.toFixed(4) : "--"}</div>
                <div>Max: {signalStats.maxValue !== -Infinity ? signalStats.maxValue.toFixed(4) : "--"}</div>
                <div>Promedio: {signalStats.avgValue.toFixed(4)}</div>
                <div>Total muestras: {signalStats.totalValues}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signal Waveform Visualization could be added here */}
      <Card className="bg-gray-900 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Análisis de Señal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-400">
            Se requiere un mínimo de señal PPG de calidad {'>'}40% para detección precisa.
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div>
              <div className="font-semibold">Detección de Picos</div>
              <div>Estado: {lastSignal?.isPeak ? "Pico detectado" : "Sin pico"}</div>
            </div>
            <div>
              <div className="font-semibold">Calidad PPG</div>
              <div>Nivel: {
                signalQuality >= 80 ? "Excelente" :
                signalQuality >= 60 ? "Buena" :
                signalQuality >= 40 ? "Media" :
                signalQuality >= 20 ? "Baja" : "Crítica"
              }</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignalAnalytics;
