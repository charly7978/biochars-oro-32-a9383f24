
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToastAction } from '@/components/ui/toast';
import { toast } from '@/components/ui/use-toast';
import { Activity, AlertCircle } from 'lucide-react';

import CameraView from '@/components/CameraView';
import HeartRateDisplay from '@/components/HeartRateDisplay';
import MonitoringButton from '@/components/MonitoringButton';
import PPGResultDialog from '@/components/PPGResultDialog';
import MeasurementConfirmationDialog from '@/components/MeasurementConfirmationDialog';
import VitalSign from '@/components/VitalSign';
import AppTitle from '@/components/AppTitle';
import GraphGrid from '@/components/GraphGrid';
import ArrhythmiaVisualizer from '@/components/ArrhythmiaVisualizer';
import HeartShape from '@/components/HeartShape';

import { useVitalSignsWithProcessing } from '@/hooks/useVitalSignsWithProcessing';
import { useVitalMeasurement } from '@/hooks/useVitalMeasurement';
import { useDebugMode } from '@/hooks/useDebugMode';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('camera');
  const [showResults, setShowResults] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const appRef = useRef<HTMLDivElement>(null);
  
  const vitalSigns = useVitalSignsWithProcessing();
  const debugMode = useDebugMode();
  const measurement = useVitalMeasurement();
  
  // Estado para diálogo de confirmación
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Navegación a la página de monitoreo
  const navigateToMonitoring = () => {
    navigate('/monitoring');
  };
  
  // Manejo de pantalla completa
  const requestFullscreen = () => {
    if (!appRef.current) return;
    
    if (appRef.current.requestFullscreen) {
      appRef.current.requestFullscreen();
    } else if (appRef.current.requestFullscreen) {
      appRef.current.requestFullscreen();
    } else if (appRef.current.requestFullscreen) {
      appRef.current.requestFullscreen();
    } else if (appRef.current.requestFullscreen) {
      appRef.current.requestFullscreen();
    }
    
    // Android Cordova plugin
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.screenorientation) {
      window.cordova.plugins.screenorientation.lock('landscape');
    }
    
    setIsFullScreen(true);
  };
  
  // Iniciar medición
  const startMeasurement = () => {
    if (!vitalSigns.isMonitoring) {
      vitalSigns.startMonitoring();
      measurement.startMeasurement();
      
      toast({
        title: "Medición iniciada",
        description: "Coloque su dedo en la cámara para comenzar.",
        action: <ToastAction altText="OK">OK</ToastAction>,
      });
    }
  };
  
  // Detener medición
  const stopMeasurement = () => {
    if (vitalSigns.isMonitoring) {
      vitalSigns.stopMonitoring();
      
      if (measurement.isMeasurementValid) {
        setShowConfirmation(true);
      } else {
        toast({
          title: "Medición cancelada",
          description: "No se obtuvieron datos válidos.",
          variant: "destructive",
        });
        measurement.resetMeasurement();
      }
    }
  };
  
  // Cerrar diálogo de confirmación y guardar resultados
  const handleConfirmMeasurement = () => {
    setShowConfirmation(false);
    // Guardar medición
    measurement.saveMeasurement();
    toast({
      title: "Medición guardada",
      description: "Los resultados han sido guardados correctamente.",
    });
  };
  
  // Cerrar diálogo de confirmación sin guardar
  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    measurement.resetMeasurement();
  };
  
  // Actualizar medición con los últimos datos
  useEffect(() => {
    if (vitalSigns.isMonitoring && vitalSigns.lastResult) {
      measurement.updateMeasurementData({
        heartRate: vitalSigns.lastResult.heartRate,
        spo2: vitalSigns.lastResult.spo2,
        pressure: vitalSigns.lastResult.pressure,
        arrhythmiaStatus: vitalSigns.lastResult.arrhythmiaStatus,
        signalQuality: vitalSigns.signalQuality
      });
    }
  }, [vitalSigns.lastResult]);
  
  return (
    <div className="h-full min-h-screen bg-gradient-to-b from-blue-100 to-blue-50" ref={appRef}>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <AppTitle />
          
          <div className="flex space-x-2">
            {/* Botón para ir a la página de monitoreo */}
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1 bg-slate-800 text-white hover:bg-slate-700"
              onClick={navigateToMonitoring}
            >
              <Activity className="w-4 h-4" />
              <span className="hidden md:inline">Sistema de Monitoreo</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={requestFullscreen}
              disabled={isFullScreen}
            >
              Pantalla Completa
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera">Cámara</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
          </TabsList>
          
          <TabsContent value="camera" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-4">
                    <CameraView 
                      onFrame={vitalSigns.processFrame}
                      isMonitoring={vitalSigns.isMonitoring}
                      showFingerDetection={true}
                      isFingerDetected={vitalSigns.fingerDetected}
                    />
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex flex-col space-y-4">
                <Card>
                  <CardContent className="p-4 flex justify-center items-center">
                    <HeartRateDisplay 
                      heartRate={measurement.currentData.heartRate || 0} 
                      isMonitoring={vitalSigns.isMonitoring}
                      signalQuality={vitalSigns.signalQuality}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col space-y-4">
                      <VitalSign 
                        label="SpO2" 
                        value={`${measurement.currentData.spo2 || '--'}%`} 
                        icon="droplet" 
                        color="text-blue-500"
                      />
                      
                      <VitalSign 
                        label="Presión" 
                        value={measurement.currentData.pressure || '--/--'} 
                        icon="activity" 
                        color="text-green-500"
                      />
                      
                      <VitalSign 
                        label="Ritmo" 
                        value={measurement.currentData.arrhythmiaStatus.split('|')[0] || '--'} 
                        icon="heart" 
                        color={measurement.currentData.arrhythmiaStatus.includes('NORMAL') ? 'text-green-500' : 'text-red-500'}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex justify-center">
                  <MonitoringButton 
                    isMonitoring={vitalSigns.isMonitoring}
                    onStart={startMeasurement}
                    onStop={stopMeasurement}
                    signalQuality={vitalSigns.signalQuality}
                    disabled={false}
                  />
                </div>
              </div>
            </div>
            
            {/* Visualizador de arritmias */}
            {vitalSigns.isMonitoring && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <ArrhythmiaVisualizer 
                    isMonitoring={vitalSigns.isMonitoring}
                    lastHeartRate={measurement.currentData.heartRate || 0}
                    arrhythmiaStatus={measurement.currentData.arrhythmiaStatus}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="results" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <GraphGrid />
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 flex justify-center items-center">
                  <HeartShape />
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  {/* Contenido de resultados históricos */}
                  <div className="flex flex-col space-y-2">
                    <h2 className="text-xl font-bold">Historial de Mediciones</h2>
                    {measurement.history.length === 0 ? (
                      <div className="flex items-center justify-center text-gray-500 p-4">
                        <AlertCircle className="mr-2 h-5 w-5" />
                        <span>No hay mediciones guardadas</span>
                      </div>
                    ) : (
                      measurement.history.map((item, index) => (
                        <div key={index} className="border p-2 rounded">
                          <div className="flex justify-between">
                            <span>Fecha: {new Date(item.timestamp).toLocaleString()}</span>
                            <span>FC: {item.heartRate} lpm</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SpO2: {item.spo2}%</span>
                            <span>Presión: {item.pressure}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Diálogo de resultados */}
      {showResults && (
        <PPGResultDialog
          onClose={() => setShowResults(false)}
          heartRate={measurement.currentData.heartRate || 0}
          spo2={measurement.currentData.spo2 || 0}
          pressure={measurement.currentData.pressure || '--/--'}
          arrhythmiaStatus={measurement.currentData.arrhythmiaStatus.split('|')[0] || '--'}
        />
      )}
      
      {/* Diálogo de confirmación */}
      {showConfirmation && (
        <MeasurementConfirmationDialog
          onConfirm={handleConfirmMeasurement}
          onCancel={handleCancelConfirmation}
          heartRate={measurement.currentData.heartRate || 0}
          vitalSigns={{
            spo2: measurement.currentData.spo2 || 0,
            pressure: measurement.currentData.pressure || '--/--',
            arrhythmiaStatus: measurement.currentData.arrhythmiaStatus || '--'
          }}
        />
      )}
    </div>
  );
};

export default Index;
