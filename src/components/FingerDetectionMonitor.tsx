
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Componente de monitoreo para el sistema de detección de dedos
 * Proporciona una interfaz visual para depurar y monitorear el sistema
 */

import React, { useState, useEffect } from 'react';
import { useFingerDetectionSystem } from '@/hooks/useFingerDetectionSystem';
import { CalibrationParameters } from '@/modules/signal-processing/utils/adaptive-calibration';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Componente para monitoreo del sistema de detección de dedos
 * Útil para depuración y ajuste durante desarrollo
 */
export function FingerDetectionMonitor({
  showDetailed = false
}: {
  showDetailed?: boolean;
}) {
  const [activeTab, setActiveTab] = useState("status");
  const [showDetails, setShowDetails] = useState(showDetailed);
  const [manualMode, setManualMode] = useState(false);
  
  // Usar el hook del sistema de detección
  const fingerSystem = useFingerDetectionSystem({
    enableDebugLogs: true,
    enableDiagnostics: true,
    enableAdaptiveCalibration: true,
    onDetectionChange: (isDetected) => {
      console.log(`FingerDetectionMonitor: Detección cambiada a ${isDetected ? 'DETECTADO' : 'NO DETECTADO'}`);
    }
  });
  
  // Estado detallado para la pestaña avanzada
  const [detailedStats, setDetailedStats] = useState<any>(null);
  const [customCalibration, setCustomCalibration] = useState<Partial<CalibrationParameters>>({
    sensitivityLevel: 0.6,
    amplitudeThreshold: 0.3
  });
  
  // Actualizar estadísticas detalladas periódicamente
  useEffect(() => {
    if (activeTab === "advanced" || showDetails) {
      const interval = setInterval(() => {
        setDetailedStats(fingerSystem.getDetailedStats());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [activeTab, showDetails, fingerSystem]);
  
  // Manejar cambios en la calibración personalizada
  const handleCalibrationChange = (param: keyof CalibrationParameters, value: number) => {
    setCustomCalibration(prev => ({
      ...prev,
      [param]: value
    }));
  };
  
  // Aplicar calibración personalizada
  const applyCustomCalibration = () => {
    fingerSystem.updateCalibration(customCalibration);
  };
  
  // Manejar cambio de modo manual
  const handleManualModeChange = (enabled: boolean) => {
    setManualMode(enabled);
    
    // Si se desactiva, quitar anulación
    if (!enabled) {
      fingerSystem.setManualOverride(false, false);
    }
  };
  
  // Manejar forzado manual de detección
  const setManualDetection = (detected: boolean) => {
    fingerSystem.setManualOverride(detected, true);
  };
  
  // Actualizar ambiente simulado
  const simulateEnvironmentChange = (change: 'light' | 'motion') => {
    if (change === 'light') {
      fingerSystem.updateEnvironment({
        lightLevel: Math.random() * 0.7 + 0.3 // 0.3-1.0
      });
    } else {
      fingerSystem.updateEnvironment({
        motionLevel: Math.random() * 0.5 // 0-0.5
      });
    }
  };
  
  // Reiniciar sistema
  const handleReset = () => {
    fingerSystem.resetSystem();
  };
  
  // Exportar datos de diagnóstico
  const handleExportDiagnostics = () => {
    const data = fingerSystem.exportDiagnostics();
    console.log("Datos de diagnóstico exportados:", data);
    
    // Crear y descargar archivo
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finger-diagnostics-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Sistema de Detección de Dedo
          <Badge variant={fingerSystem.isFingerDetected ? "default" : "destructive"}>
            {fingerSystem.isFingerDetected ? "DEDO DETECTADO" : "SIN DETECCIÓN"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Monitor avanzado del sistema de detección unificado
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="status" className="flex-1">Estado</TabsTrigger>
            <TabsTrigger value="calibration" className="flex-1">Calibración</TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex-1">Diagnósticos</TabsTrigger>
            <TabsTrigger value="advanced" className="flex-1">Avanzado</TabsTrigger>
          </TabsList>
          
          {/* Pestaña de Estado */}
          <TabsContent value="status" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Confianza</h3>
                  <div className="text-2xl font-bold">{Math.round(fingerSystem.confidence * 100)}%</div>
                  <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 mt-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${fingerSystem.isFingerDetected ? 'bg-green-500' : 'bg-red-500'}`} 
                      style={{ width: `${Math.round(fingerSystem.confidence * 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Consenso</h3>
                  <div className="text-2xl font-bold">
                    {Math.round(fingerSystem.consensusLevel * 100)}%
                  </div>
                  <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 mt-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${fingerSystem.consensusLevel > 0 ? 'bg-blue-500' : 'bg-orange-500'}`} 
                      style={{ width: `${Math.abs(Math.round(fingerSystem.consensusLevel * 100))}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Modo Manual</h3>
                  <Switch 
                    checked={manualMode}
                    onCheckedChange={handleManualModeChange}
                  />
                </div>
                
                {manualMode && (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setManualDetection(false)}
                    >
                      Forzar No Detección
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => setManualDetection(true)}
                    >
                      Forzar Detección
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-4">Acciones del Sistema</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    Reiniciar Sistema
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => simulateEnvironmentChange('light')}
                  >
                    Simular Cambio de Luz
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => simulateEnvironmentChange('motion')}
                  >
                    Simular Movimiento
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Pestaña de Calibración */}
          <TabsContent value="calibration" className="mt-4">
            <div className="space-y-4">
              <div className="grid gap-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Calibración Actual</h3>
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Sensibilidad</span>
                        <span className="text-sm font-medium">{Math.round(fingerSystem.calibrationParams.sensitivityLevel * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${fingerSystem.calibrationParams.sensitivityLevel * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Umbral de Amplitud</span>
                        <span className="text-sm font-medium">{Math.round(fingerSystem.calibrationParams.amplitudeThreshold * 100)}</span>
                      </div>
                      <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500" 
                          style={{ width: `${fingerSystem.calibrationParams.amplitudeThreshold * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Reducción de Falsos Positivos</span>
                        <span className="text-sm font-medium">{Math.round(fingerSystem.calibrationParams.falsePositiveReduction * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500" 
                          style={{ width: `${fingerSystem.calibrationParams.falsePositiveReduction * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Reducción de Falsos Negativos</span>
                        <span className="text-sm font-medium">{Math.round(fingerSystem.calibrationParams.falseNegativeReduction * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500" 
                          style={{ width: `${fingerSystem.calibrationParams.falseNegativeReduction * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Calibración Personalizada</h3>
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-sm">Sensibilidad</label>
                        <span className="text-sm font-medium">{Math.round(customCalibration.sensitivityLevel! * 100)}%</span>
                      </div>
                      <Slider
                        value={[customCalibration.sensitivityLevel! * 100]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => handleCalibrationChange('sensitivityLevel', value[0] / 100)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-sm">Umbral de Amplitud</label>
                        <span className="text-sm font-medium">{Math.round(customCalibration.amplitudeThreshold! * 100)}</span>
                      </div>
                      <Slider
                        value={[customCalibration.amplitudeThreshold! * 100]}
                        min={10}
                        max={50}
                        step={1}
                        onValueChange={(value) => handleCalibrationChange('amplitudeThreshold', value[0] / 100)}
                      />
                    </div>
                    
                    <Button onClick={applyCustomCalibration}>
                      Aplicar Calibración
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Pestaña de Diagnósticos */}
          <TabsContent value="diagnostics" className="mt-4">
            <div className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Estado de Diagnóstico</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Estado</span>
                    <p className="font-medium">
                      {fingerSystem.diagnostics.isRecording ? "Grabando" : "Detenido"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Sesión</span>
                    <p className="font-medium truncate" title={fingerSystem.diagnostics.currentSessionId}>
                      {fingerSystem.diagnostics.currentSessionId.substring(0, 8)}...
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Eventos</span>
                    <p className="font-medium">{fingerSystem.diagnostics.totalEvents}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-4">Acciones de Diagnóstico</h3>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleExportDiagnostics}
                  >
                    Exportar Diagnósticos
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleReset}
                  >
                    Reiniciar
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Pestaña Avanzada */}
          <TabsContent value="advanced" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Mostrar Detalles</h3>
                <Switch 
                  checked={showDetails}
                  onCheckedChange={setShowDetails}
                />
              </div>
              
              {showDetails && detailedStats && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="sources">
                    <AccordionTrigger>Fuentes de Detección</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {Object.entries(detailedStats.sources).map(([source, data]: [string, any]) => (
                          <div key={source} className="p-2 border rounded">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{source}</span>
                              <Badge 
                                variant={data.isFingerDetected ? "default" : "secondary"}
                              >
                                {data.isFingerDetected ? "DETECTADO" : "NO DETECTADO"}
                              </Badge>
                            </div>
                            <div className="mt-1 text-sm">
                              <div>Confianza: {Math.round(data.confidence * 100)}%</div>
                              <div>Última actualización: {new Date(data.lastUpdated).toLocaleTimeString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="historial">
                    <AccordionTrigger>Historial de Detección</AccordionTrigger>
                    <AccordionContent>
                      <div className="h-40 overflow-y-auto space-y-1">
                        {detailedStats.history.map((item: any, index: number) => (
                          <div 
                            key={index}
                            className={`text-xs px-2 py-1 rounded ${
                              item.isFingerDetected ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                            }`}
                          >
                            {new Date(item.timestamp).toLocaleTimeString()} - 
                            {item.isFingerDetected ? " DETECTADO" : " NO DETECTADO"} 
                            ({Math.round(item.confidence * 100)}%)
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-xs text-gray-500">
          Sistema Avanzado de Detección de Dedos v2.0
        </div>
        <div className="text-xs text-gray-500">
          Diagnósticos {fingerSystem.diagnostics.isRecording ? "Activos" : "Inactivos"}
        </div>
      </CardFooter>
    </Card>
  );
}
