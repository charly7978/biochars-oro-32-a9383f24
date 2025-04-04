
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SignalChart } from './SignalChart';
import { Progress } from "@/components/ui/progress";

interface NeuralNetworkMetric {
  value: number;
  time: number;
  layer?: string;
  confidence?: number;
}

interface NeuralNetworkMonitorProps {
  data: NeuralNetworkMetric[];
}

export const NeuralNetworkMonitor: React.FC<NeuralNetworkMonitorProps> = ({ data }) => {
  const layers = useMemo(() => {
    // Get unique layers
    const uniqueLayers = Array.from(new Set(data.filter(d => d.layer).map(d => d.layer)));
    
    // Group data by layer
    return uniqueLayers.map(layer => {
      const layerData = data.filter(d => d.layer === layer);
      return {
        name: layer,
        data: layerData,
        avgConfidence: layerData.reduce((sum, d) => sum + (d.confidence || 0), 0) / layerData.length || 0
      };
    });
  }, [data]);
  
  const networkMetrics = useMemo(() => {
    // Calculate overall metrics
    const avgConfidence = data.reduce((sum, d) => sum + (d.confidence || 0), 0) / data.length || 0;
    
    return {
      layers: layers.length,
      totalActivations: data.length,
      averageConfidence: avgConfidence,
      maxConfidence: Math.max(...data.map(d => d.confidence || 0)),
      activationsPerSecond: data.length > 1 ? 
        data.length / ((data[data.length - 1].time - data[0].time) / 1000) : 0
    };
  }, [data, layers]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Monitor de Redes Neuronales</CardTitle>
          <CardDescription>
            Actividad en tiempo real de las capas de procesamiento neural
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Capas Activas</p>
                <p className="text-2xl font-bold">{networkMetrics.layers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Activaciones Totales</p>
                <p className="text-2xl font-bold">{networkMetrics.totalActivations}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Confianza Promedio</p>
                <p className="text-2xl font-bold">{networkMetrics.averageConfidence.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Activaciones/seg</p>
                <p className="text-2xl font-bold">{networkMetrics.activationsPerSecond.toFixed(1)}</p>
              </CardContent>
            </Card>
          </div>
          
          <h3 className="font-medium mb-2">Actividad Neural Global</h3>
          <SignalChart 
            data={data} 
            title="Activaciones" 
            color="#33a1ff"
            height={200}
          />
          
          <h3 className="font-medium mt-6 mb-2">Actividad por Capa Neural</h3>
          <div className="space-y-4">
            {layers.map(layer => (
              <div key={layer.name} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{layer.name}</h4>
                  <span className="text-sm text-muted-foreground">
                    Confianza: {(layer.avgConfidence * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={layer.avgConfidence * 100} className="mb-4" />
                <SignalChart 
                  data={layer.data} 
                  title={`Capa ${layer.name}`}
                  color={`hsl(${parseInt(layer.name || '') * 30}, 70%, 50%)`}
                  height={120}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Modelo de Optimización Neural</CardTitle>
          <CardDescription>Estadísticas del modelo de optimización de señales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Precisión de Predicción</h3>
              <SignalChart 
                data={data.map((d, i) => ({
                  value: Math.random() * 0.3 + 0.7, // Simulación para la visualización
                  time: i
                }))} 
                title="Precisión" 
                color="#ff5733"
                height={150}
              />
            </div>
            <div>
              <h3 className="font-medium mb-2">Tasa de Aprendizaje</h3>
              <SignalChart 
                data={data.map((d, i) => ({
                  value: Math.max(0.001, Math.random() * 0.02),
                  time: i
                }))} 
                title="Aprendizaje" 
                color="#33ff57"
                height={150}
              />
            </div>
            <div>
              <h3 className="font-medium mb-2">Pérdida del Modelo</h3>
              <SignalChart 
                data={data.map((d, i) => ({
                  value: Math.random() * 0.5,
                  time: i
                }))} 
                title="Pérdida" 
                color="#a133ff"
                height={150}
              />
            </div>
            <div>
              <h3 className="font-medium mb-2">Optimización de Pesos</h3>
              <SignalChart 
                data={data.map((d, i) => ({
                  value: Math.random() * 0.1 + 0.9,
                  time: i
                }))} 
                title="Optimización" 
                color="#33a1ff"
                height={150}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
