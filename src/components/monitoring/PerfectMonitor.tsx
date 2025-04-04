
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Cpu, 
  Database, 
  AlertCircle, 
  Layers, 
  Fingerprint,
  BarChart3, 
  BrainCircuit, 
  Settings, 
  Network,
  LineChart,
  ListFilter,
  Signal
} from "lucide-react";

import { SignalMonitor } from './SignalMonitor';
import { SignalProcessingMonitor } from './SignalProcessingMonitor';
import { SystemPerformanceMonitor } from './SystemPerformanceMonitor';
import { TensorflowMonitor } from './TensorflowMonitor';
import { ModuleStatusPanel } from './ModuleStatusPanel';
import { ErrorLogViewer } from './ErrorLogViewer';
import { FingerDetectionMonitor } from './FingerDetectionMonitor';

/**
 * Comprehensive monitoring dashboard for the application
 * Integrates all monitoring components in a tabbed interface
 */
export const PerfectMonitor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("signal");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  // Force refresh all monitors periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCounter(prev => prev + 1);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Enable fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-950 text-white p-4 antialiased">
      <header className="flex justify-between items-center mb-4 bg-slate-900 p-4 rounded-lg shadow-lg">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-green-500" />
          <h1 className="text-xl font-bold">Sistema de Monitoreo Integral</h1>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setRefreshCounter(prev => prev + 1)}
            className="bg-slate-800 text-white border-slate-700"
          >
            Refrescar Datos
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleFullscreen}
            className="bg-slate-800 text-white border-slate-700"
          >
            {isFullscreen ? "Salir Pantalla Completa" : "Pantalla Completa"}
          </Button>
        </div>
      </header>

      <Tabs 
        defaultValue="signal" 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="grid grid-cols-7 mb-4 bg-slate-900">
          <TabsTrigger value="signal" className="flex items-center gap-1">
            <Signal className="w-4 h-4" />
            <span className="hidden sm:inline">Extracción de Señal</span>
          </TabsTrigger>
          <TabsTrigger value="finger" className="flex items-center gap-1">
            <Fingerprint className="w-4 h-4" />
            <span className="hidden sm:inline">Detección de Dedos</span>
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex items-center gap-1">
            <Cpu className="w-4 h-4" />
            <span className="hidden sm:inline">Procesamiento</span>
          </TabsTrigger>
          <TabsTrigger value="tensorflow" className="flex items-center gap-1">
            <BrainCircuit className="w-4 h-4" />
            <span className="hidden sm:inline">TensorFlow</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Rendimiento</span>
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-1">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Módulos</span>
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Errores</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signal" className="space-y-4">
          <SignalMonitor key={`signal-${refreshCounter}`} />
        </TabsContent>

        <TabsContent value="finger" className="space-y-4">
          <FingerDetectionMonitor key={`finger-${refreshCounter}`} />
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <SignalProcessingMonitor key={`processing-${refreshCounter}`} />
        </TabsContent>

        <TabsContent value="tensorflow" className="space-y-4">
          <TensorflowMonitor key={`tensorflow-${refreshCounter}`} />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <SystemPerformanceMonitor key={`system-${refreshCounter}`} />
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <ModuleStatusPanel key={`modules-${refreshCounter}`} />
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <ErrorLogViewer key={`errors-${refreshCounter}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerfectMonitor;
