
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignalChart } from './SignalChart';

interface SystemMetricsProps {
  data: Record<string, any>;
}

export const SystemMetrics: React.FC<SystemMetricsProps> = ({ data }) => {
  // Format performance data for charts
  const processingTimeData = data.processingTimeHistory?.map((value: number, index: number) => ({ 
    value, 
    time: index 
  })) || [];
  
  const memoryUsageData = data.memoryUsageHistory?.map((value: number, index: number) => ({ 
    value, 
    time: index 
  })) || [];
  
  const frameRateData = data.frameRateHistory?.map((value: number, index: number) => ({ 
    value, 
    time: index 
  })) || [];
  
  const signalQualityData = data.signalQualityHistory?.map((value: number, index: number) => ({ 
    value, 
    time: index 
  })) || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento del Sistema</CardTitle>
          <CardDescription>Métricas de rendimiento en tiempo real</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Tiempo de Procesamiento (ms)</h3>
              <SignalChart 
                data={processingTimeData} 
                title="Procesamiento" 
                color="#ff5733"
                height={150}
              />
            </div>
            <div>
              <h3 className="font-medium mb-2">Uso de Memoria (MB)</h3>
              <SignalChart 
                data={memoryUsageData} 
                title="Memoria" 
                color="#33a1ff"
                height={150}
              />
            </div>
            <div>
              <h3 className="font-medium mb-2">Tasa de Frames (FPS)</h3>
              <SignalChart 
                data={frameRateData} 
                title="FPS" 
                color="#33ff57"
                height={150}
              />
            </div>
            <div>
              <h3 className="font-medium mb-2">Calidad de Señal (%)</h3>
              <SignalChart 
                data={signalQualityData} 
                title="Calidad" 
                color="#a133ff"
                height={150}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {Object.entries(data)
              .filter(([key]) => !key.includes('History') && typeof data[key] !== 'object')
              .map(([key, value]) => (
                <Card key={key}>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                    <p className="text-2xl font-bold">
                      {typeof value === 'number' ? 
                        (Number.isInteger(value) ? value : value.toFixed(2)) : 
                        (value?.toString() || 'N/A')}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Optimizador de Señal</CardTitle>
          <CardDescription>Estadísticas del procesamiento avanzado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['optimizerThroughput', 'optimizerLatency', 'optimizerEfficiency', 'signalAmplification',
              'filterStrength', 'adaptiveGain', 'noiseFloor', 'peakDetectionAccuracy'].map(metric => (
              <Card key={metric}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    {metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </p>
                  <p className="text-2xl font-bold">
                    {typeof data[metric] === 'number' ? 
                      (Number.isInteger(data[metric]) ? data[metric] : data[metric]?.toFixed(2)) : 
                      (data[metric]?.toString() || 'N/A')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
