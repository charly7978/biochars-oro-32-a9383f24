
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Zap, Layers, Database, Cpu, BarChart2, Fingerprint } from 'lucide-react';
import { SignalProcessingMonitor } from '@/components/monitoring/SignalProcessingMonitor';
import { NeuralNetworkMonitor } from '@/components/monitoring/NeuralNetworkMonitor';
import FingerDetectionMonitor from '@/components/debug/FingerDetectionMonitor';
import OptimizerMonitor from '@/components/debug/OptimizerMonitor';
import { SystemPerformanceMonitor } from '@/components/monitoring/SystemPerformanceMonitor';
import { CalibrationMonitor } from '@/components/monitoring/CalibrationMonitor';

const MonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("signal-processing");

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Sistema de Monitoreo Integral</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          Tiempo Real: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Panel de Control y Monitoreo</CardTitle>
          <CardDescription>
            Monitoreo completo del funcionamiento, procesamiento de señales, y sistemas de optimización
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signal-processing" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-6 mb-4">
              <TabsTrigger value="signal-processing" className="flex gap-2 items-center">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Procesamiento de Señal</span>
              </TabsTrigger>
              <TabsTrigger value="neural-networks" className="flex gap-2 items-center">
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Redes Neuronales</span>
              </TabsTrigger>
              <TabsTrigger value="finger-detection" className="flex gap-2 items-center">
                <Fingerprint className="w-4 h-4" />
                <span className="hidden sm:inline">Detección de Dedos</span>
              </TabsTrigger>
              <TabsTrigger value="optimization" className="flex gap-2 items-center">
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Optimización</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex gap-2 items-center">
                <Cpu className="w-4 h-4" />
                <span className="hidden sm:inline">Rendimiento</span>
              </TabsTrigger>
              <TabsTrigger value="calibration" className="flex gap-2 items-center">
                <BarChart2 className="w-4 h-4" />
                <span className="hidden sm:inline">Calibración</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signal-processing" className="space-y-4">
              <SignalProcessingMonitor />
            </TabsContent>

            <TabsContent value="neural-networks" className="space-y-4">
              <NeuralNetworkMonitor />
            </TabsContent>

            <TabsContent value="finger-detection" className="space-y-4">
              <FingerDetectionMonitor />
            </TabsContent>

            <TabsContent value="optimization" className="space-y-4">
              <OptimizerMonitor 
                metrics={{
                  currentScore: 0,
                  bestScore: 0,
                  improvementPercentage: 0,
                  optimizationCycles: 0,
                  lastOptimizationTime: null,
                  paramsHistory: []
                }}
                state="IDLE"
                isReady={true}
                onStartOptimization={() => {}}
                onReset={() => {}}
                onToggleAuto={() => {}}
              />
            </TabsContent>

            <TabsContent value="system" className="space-y-4">
              <SystemPerformanceMonitor />
            </TabsContent>

            <TabsContent value="calibration" className="space-y-4">
              <CalibrationMonitor />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonitoringPage;
