
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { SignalChart } from '../components/diagnostics/SignalChart';
import { DiagnosticsPanel } from '../components/diagnostics/DiagnosticsPanel';
import { SystemMetrics } from '../components/diagnostics/SystemMetrics';
import { NeuralNetworkMonitor } from '../components/diagnostics/NeuralNetworkMonitor';
import { ProcessingChannels } from '../components/diagnostics/ProcessingChannels';
import { Camera, Activity, Database, Signal, Heart, ArrowLeft, Zap, Bug } from 'lucide-react';
import { getDiagnostics } from '../modules/signal-processing/diagnostics';
import { useDiagnosticsCollector } from '../hooks/useDiagnosticsCollector';

/**
 * Advanced Diagnostics Screen
 * Provides real-time visualization and metrics for the entire signal processing pipeline
 */
const DiagnosticsScreen: React.FC = () => {
  const { toast } = useToast();
  const { 
    isCollecting,
    startCollection,
    stopCollection,
    clearData,
    signalData,
    neuralNetworkData,
    systemMetrics,
    channelData
  } = useDiagnosticsCollector();
  
  const [activeTab, setActiveTab] = useState('overview');
  const animationRef = useRef<number>(0);
  
  // Start/stop collection when component mounts/unmounts
  useEffect(() => {
    startCollection();
    toast({
      title: "Diagnóstico iniciado",
      description: "Recopilando datos en tiempo real...",
      duration: 3000,
    });
    
    return () => {
      stopCollection();
      cancelAnimationFrame(animationRef.current);
    };
  }, [startCollection, stopCollection, toast]);
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link to="/" className="mr-2">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Diagnóstico Avanzado de Señales</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={isCollecting ? "destructive" : "default"} 
            onClick={() => isCollecting ? stopCollection() : startCollection()}
          >
            {isCollecting ? "Detener Recolección" : "Iniciar Recolección"}
          </Button>
          <Button variant="outline" onClick={clearData}>
            Limpiar Datos
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">
            <Activity className="mr-2 h-4 w-4" />
            Vista General
          </TabsTrigger>
          <TabsTrigger value="signal">
            <Signal className="mr-2 h-4 w-4" />
            Señales PPG
          </TabsTrigger>
          <TabsTrigger value="heartbeat">
            <Heart className="mr-2 h-4 w-4" />
            Procesamiento de Latidos
          </TabsTrigger>
          <TabsTrigger value="channels">
            <Database className="mr-2 h-4 w-4" />
            Canales de Procesamiento
          </TabsTrigger>
          <TabsTrigger value="neural">
            <Zap className="mr-2 h-4 w-4" />
            Redes Neuronales
          </TabsTrigger>
          <TabsTrigger value="system">
            <Bug className="mr-2 h-4 w-4" />
            Métricas del Sistema
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Resumen de Métricas</CardTitle>
                  <CardDescription>Vista general del sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <DiagnosticsPanel data={systemMetrics} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Señal PPG en Tiempo Real</CardTitle>
                  <CardDescription>Señal fotopletismográfica</CardDescription>
                </CardHeader>
                <CardContent>
                  <SignalChart 
                    data={signalData.slice(-100)} 
                    title="Señal PPG" 
                    color="#ff5733" 
                    height={150} 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Calidad de la Señal</CardTitle>
                  <CardDescription>Métricas de calidad en tiempo real</CardDescription>
                </CardHeader>
                <CardContent>
                  <SignalChart 
                    data={signalData.map(d => ({ ...d, value: d.quality || 0 }))} 
                    title="Calidad" 
                    color="#33a1ff" 
                    height={150} 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Actividad Neural</CardTitle>
                  <CardDescription>Rendimiento de redes neuronales</CardDescription>
                </CardHeader>
                <CardContent>
                  <SignalChart 
                    data={neuralNetworkData.slice(-100)} 
                    title="Actividad" 
                    color="#33ff57" 
                    height={150} 
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="signal">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Señal PPG</CardTitle>
                <CardDescription>Detalle del procesamiento de señal fotopletismográfica</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Señal Cruda vs Filtrada</h3>
                    <SignalChart 
                      data={signalData.slice(-200)}
                      title="Comparación" 
                      color="#ff5733"
                      compareData={signalData.map(d => ({ ...d, value: d.filteredValue || 0 }))}
                      compareColor="#33a1ff"
                      height={200}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Señal Amplificada</h3>
                    <SignalChart 
                      data={signalData.map(d => ({ ...d, value: d.amplifiedValue || 0 }))}
                      title="Amplificada" 
                      color="#33ff57"
                      height={200}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Calidad de Señal</h3>
                    <SignalChart 
                      data={signalData.map(d => ({ ...d, value: d.quality || 0 }))}
                      title="Calidad" 
                      color="#ff33a1"
                      height={200}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Detección de Picos</h3>
                    <SignalChart 
                      data={signalData.slice(-200)}
                      title="Picos" 
                      color="#ff5733"
                      markers={signalData.filter(d => d.isPeak).map(d => ({ 
                        x: d.time || 0, 
                        y: d.value || 0,
                        color: '#ffcc00'
                      }))}
                      height={200}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="heartbeat">
            <Card>
              <CardHeader>
                <CardTitle>Procesamiento de Latidos Cardíacos</CardTitle>
                <CardDescription>Análisis detallado de la detección y procesamiento de latidos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Intervalos R-R</h3>
                    <SignalChart 
                      data={channelData.heartbeat?.rrIntervals || []}
                      title="Intervalos R-R" 
                      color="#3380ff"
                      height={200}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Variabilidad Cardíaca</h3>
                    <SignalChart 
                      data={channelData.heartbeat?.hrv || []}
                      title="HRV" 
                      color="#ff3380"
                      height={200}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Detección de Arritmias</h3>
                    <SignalChart 
                      data={channelData.heartbeat?.arrhythmia || []}
                      title="Arritmias" 
                      color="#ff8033"
                      height={200}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Confianza de Detección</h3>
                    <SignalChart 
                      data={channelData.heartbeat?.confidence || []}
                      title="Confianza" 
                      color="#33ff80"
                      height={200}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels">
            <ProcessingChannels data={channelData} />
          </TabsContent>

          <TabsContent value="neural">
            <NeuralNetworkMonitor data={neuralNetworkData} />
          </TabsContent>

          <TabsContent value="system">
            <SystemMetrics data={systemMetrics} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default DiagnosticsScreen;
