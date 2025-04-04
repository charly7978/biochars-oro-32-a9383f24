
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Activity, Zap, Layers, 
  Fingerprint, Signal, Cpu, Radio, 
  Database, BrainCircuit, Gauge, AlertCircle 
} from 'lucide-react';
import { toast } from "@/components/ui/use-toast";

// Componentes de monitoreo
import FingerDetectionMonitor from '@/components/monitoring/FingerDetectionMonitor';
import { SignalProcessingMonitor } from '@/components/monitoring/SignalProcessingMonitor';
import { SignalMonitor } from '@/components/monitoring/SignalMonitor';
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { ModuleStatusPanel } from '@/components/monitoring/ModuleStatusPanel';
import { SystemPerformanceMonitor } from '@/components/monitoring/SystemPerformanceMonitor';
import { TensorflowMonitor } from '@/components/monitoring/TensorflowMonitor';
import { ErrorLogViewer } from '@/components/monitoring/ErrorLogViewer';

// Importar para monitoreo
import { 
  unifiedFingerDetector,
  resetFingerDetector,
  getFingerDetectionState,
  updateDetectionSource 
} from '@/modules/signal-processing';

const MonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("system-status");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState<number>(1000);

  // Inicialización
  useEffect(() => {
    try {
      logError("Panel de monitoreo inicializado", ErrorLevel.INFO, "MonitoringPage");
      
      // Actualizar timestamp
      const intervalId = setInterval(() => {
        setLastUpdated(new Date());
      }, refreshInterval);
      
      return () => {
        clearInterval(intervalId);
        logError("Panel de monitoreo cerrado", ErrorLevel.INFO, "MonitoringPage");
      };
    } catch (error) {
      console.error("Error inicializando panel de monitoreo:", error);
    }
  }, [refreshInterval]);

  const handleGoBack = () => {
    navigate('/');
  };

  const handleRefresh = () => {
    try {
      setLastUpdated(new Date());
      toast({
        title: "Actualizado",
        description: "Datos de monitoreo actualizados",
      });
    } catch (error) {
      console.error("Error actualizando datos:", error);
    }
  };

  const handleChangeRefreshRate = (rate: number) => {
    setRefreshInterval(rate);
    toast({
      title: "Intervalo actualizado",
      description: `Actualización cada ${rate/1000} segundos`,
    });
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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-2 py-1">
            Última actualización: {lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle>Panel de Control Principal</CardTitle>
            <CardDescription>
              Monitoreo en tiempo real de todos los sistemas sin simulaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-6 mb-4">
                <TabsTrigger value="system-status" className="flex gap-2 items-center">
                  <Activity className="w-4 h-4" />
                  <span>Estado</span>
                </TabsTrigger>
                <TabsTrigger value="signals" className="flex gap-2 items-center">
                  <Signal className="w-4 h-4" />
                  <span>Señales</span>
                </TabsTrigger>
                <TabsTrigger value="finger" className="flex gap-2 items-center">
                  <Fingerprint className="w-4 h-4" />
                  <span>Detección</span>
                </TabsTrigger>
                <TabsTrigger value="tensorflow" className="flex gap-2 items-center">
                  <BrainCircuit className="w-4 h-4" />
                  <span>TensorFlow</span>
                </TabsTrigger>
                <TabsTrigger value="optimization" className="flex gap-2 items-center">
                  <Zap className="w-4 h-4" />
                  <span>Optimización</span>
                </TabsTrigger>
                <TabsTrigger value="logs" className="flex gap-2 items-center">
                  <AlertCircle className="w-4 h-4" />
                  <span>Logs</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="system-status">
                <ModuleStatusPanel refreshInterval={refreshInterval} />
              </TabsContent>
              
              <TabsContent value="signals">
                <SignalMonitor />
              </TabsContent>
              
              <TabsContent value="finger">
                <FingerDetectionMonitor />
              </TabsContent>
              
              <TabsContent value="tensorflow">
                <TensorflowMonitor />
              </TabsContent>
              
              <TabsContent value="optimization">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SystemPerformanceMonitor />
                  <SignalProcessingMonitor />
                </div>
              </TabsContent>
              
              <TabsContent value="logs">
                <ErrorLogViewer />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleChangeRefreshRate(500)}
          className={refreshInterval === 500 ? "bg-blue-100" : ""}
        >
          0.5s
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleChangeRefreshRate(1000)}
          className={refreshInterval === 1000 ? "bg-blue-100" : ""}
        >
          1s
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleChangeRefreshRate(2000)}
          className={refreshInterval === 2000 ? "bg-blue-100" : ""}
        >
          2s
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleChangeRefreshRate(5000)}
          className={refreshInterval === 5000 ? "bg-blue-100" : ""}
        >
          5s
        </Button>
      </div>
    </div>
  );
};

export default MonitoringPage;
