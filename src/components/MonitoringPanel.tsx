
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SignalAnalytics from "./monitoring/SignalAnalytics";
import SystemDiagnostics from "./monitoring/SystemDiagnostics";
import PerformanceMetrics from "./monitoring/PerformanceMetrics";
import { useSignalProcessor } from "@/hooks/useSignalProcessor";
import { useHeartBeatProcessor } from "@/hooks/useHeartBeatProcessor";
import { useVitalSignsProcessor } from "@/hooks/useVitalSignsProcessor";

interface MonitoringPanelProps {
  isVisible: boolean;
  lastSignal: any;
  heartRate: number;
  signalQuality: number;
  vitalSigns: any;
}

const MonitoringPanel: React.FC<MonitoringPanelProps> = ({
  isVisible,
  lastSignal,
  heartRate,
  signalQuality,
  vitalSigns
}) => {
  const { signalStats, framesProcessed } = useSignalProcessor();
  const { getPeakDetectionDiagnostics } = useVitalSignsProcessor();
  
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-black/90 z-50 overflow-auto p-2">
      <div className="max-h-full overflow-y-auto">
        <h2 className="text-white text-lg font-bold mb-2 px-2">Panel de Monitoreo Técnico</h2>
        
        <Tabs defaultValue="signal" className="w-full">
          <TabsList className="grid grid-cols-3 mb-2">
            <TabsTrigger value="signal">Señal</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signal" className="p-0">
            <SignalAnalytics 
              lastSignal={lastSignal}
              heartRate={heartRate}
              signalQuality={signalQuality}
              signalStats={signalStats}
            />
          </TabsContent>
          
          <TabsContent value="system" className="p-0">
            <SystemDiagnostics
              vitalSigns={vitalSigns}
              peakDetectionDiagnostics={getPeakDetectionDiagnostics()}
            />
          </TabsContent>
          
          <TabsContent value="performance" className="p-0">
            <PerformanceMetrics 
              framesProcessed={framesProcessed}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MonitoringPanel;
