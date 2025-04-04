
import React, { useEffect, useRef, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { HeartBeatResult } from '@/hooks/heart-beat/types';
import { ChartContainer } from '@/components/ui/chart';
import { HeartPulse, AlertCircle } from 'lucide-react';

interface CardiacMonitorProps {
  lastSignalValue?: number;
  heartRate?: number;
  arrhythmiaStatus?: string;
  quality?: number;
  signalHistory: number[];
  amplificationFactor?: number;
  isMonitoring: boolean;
  lastHeartBeatResult?: HeartBeatResult;
}

const CardiacMonitor: React.FC<CardiacMonitorProps> = ({
  lastSignalValue = 0,
  heartRate = 0,
  arrhythmiaStatus = '--',
  quality = 0,
  signalHistory = [],
  amplificationFactor = 2.5,
  isMonitoring = false,
  lastHeartBeatResult
}) => {
  const [graphData, setGraphData] = useState<any[]>([]);
  const historyLengthRef = useRef<number>(60); // segundos de historia a mostrar
  const lastTimestampRef = useRef<number>(Date.now());
  
  // Preparar datos de gráfico con mayor amplificación para mejor visualización
  useEffect(() => {
    if (!isMonitoring) {
      setGraphData([]);
      return;
    }
    
    const now = Date.now();
    const newPoint = {
      time: now,
      value: lastSignalValue * amplificationFactor,
      amplifiedValue: lastSignalValue * (amplificationFactor * 1.5),
      heartRate,
      quality,
      isPeak: lastHeartBeatResult?.isPeak || false,
      isArrhythmia: lastHeartBeatResult?.isArrhythmia || false
    };
    
    setGraphData(prev => {
      // Mantener solo los últimos X segundos de datos
      const cutoffTime = now - (historyLengthRef.current * 1000);
      const filtered = [...prev, newPoint].filter(d => d.time >= cutoffTime);
      
      // Si hay muchos puntos, reducir la cantidad para mantener el rendimiento
      if (filtered.length > 300) {
        return filtered.slice(-300);
      }
      
      return filtered;
    });
    
    lastTimestampRef.current = now;
  }, [lastSignalValue, heartRate, quality, isMonitoring, lastHeartBeatResult, amplificationFactor]);
  
  // Configuración de colores basada en estado de arritmia
  const isArrhythmiaDetected = arrhythmiaStatus?.includes('ARRITMIA') || false;
  const primaryColor = isArrhythmiaDetected ? '#ff6b6b' : '#4ade80';
  const secondaryColor = isArrhythmiaDetected ? '#ff8787' : '#86efac';
  
  // Retornar un mensaje cuando no hay datos
  if (graphData.length === 0) {
    return (
      <div className="bg-black/20 rounded-lg p-4 flex flex-col items-center justify-center h-[200px]">
        <HeartPulse size={48} className="text-gray-400 mb-2" />
        <p className="text-gray-300">Sin datos cardíacos disponibles</p>
        <p className="text-xs text-gray-500">Inicie el monitoreo para ver datos en tiempo real</p>
      </div>
    );
  }
  
  return (
    <div className="relative bg-black/30 backdrop-blur-sm rounded-lg p-2 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <HeartPulse size={24} className={`mr-2 ${isArrhythmiaDetected ? 'text-red-500' : 'text-green-500'}`} />
          <span className="text-white font-semibold">{heartRate || '--'} BPM</span>
        </div>
        <div className="flex items-center">
          {isArrhythmiaDetected && (
            <div className="flex items-center text-red-400 mr-4">
              <AlertCircle size={18} className="mr-1" />
              <span className="text-sm">Arritmia Detectada</span>
            </div>
          )}
          <div className="text-gray-300 text-sm">
            Calidad: {quality.toFixed(0)}%
          </div>
        </div>
      </div>
      
      <div className="h-[180px]">
        <ChartContainer 
          className="h-full w-full" 
          config={{
            value: { color: primaryColor },
            amplified: { color: secondaryColor }
          }}
        >
          <ComposedChart
            data={graphData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.8} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={false}
              stroke="rgba(255,255,255,0.3)"
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip 
              formatter={(value: number) => [value.toFixed(3), 'Valor']}
              labelFormatter={() => 'Señal Cardiaca'}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={primaryColor} 
              fillOpacity={1} 
              fill="url(#colorValue)"
            />
            <Line 
              type="monotone"
              dataKey="amplifiedValue"
              stroke={secondaryColor}
              dot={false}
              activeDot={{ r: 6 }}
            />
            {/* Línea para los picos */}
            {graphData.filter(d => d.isPeak).map((point, index) => (
              <ReferenceLine 
                key={`peak-${index}`} 
                x={point.time} 
                stroke="white"
                strokeWidth={2}
                strokeOpacity={0.7}
                strokeDasharray="3 3" 
              />
            ))}
            {/* Marcador para arritmias */}
            {graphData.filter(d => d.isArrhythmia).map((point, index) => (
              <ReferenceLine 
                key={`arrhythmia-${index}`} 
                x={point.time} 
                stroke="red"
                strokeWidth={3} 
              />
            ))}
          </ComposedChart>
        </ChartContainer>
      </div>
      
      {/* Panel de diagnósticos */}
      {lastHeartBeatResult?.diagnosticData && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <details>
            <summary className="text-sm text-gray-400 cursor-pointer">
              Datos de diagnóstico
            </summary>
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-gray-300">
              <div>
                <p>Calidad: {lastHeartBeatResult.diagnosticData.signalQuality.toFixed(1)}%</p>
                <p>Amplificación: {amplificationFactor.toFixed(1)}x</p>
              </div>
              <div>
                <p>Valor amplificado: {lastHeartBeatResult.diagnosticData.amplifiedValue.toFixed(3)}</p>
                <p>Umbral: {lastHeartBeatResult.diagnosticData.thresholdValue.toFixed(3)}</p>
              </div>
              <div>
                <p>Pico en tiempo real: {lastHeartBeatResult.diagnosticData.isPeakRealTime ? 'Sí' : 'No'}</p>
                <p>Tiempo: {new Date(lastHeartBeatResult.diagnosticData.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default CardiacMonitor;
