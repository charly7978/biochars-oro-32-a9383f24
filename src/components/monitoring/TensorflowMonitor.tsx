
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrainCircuit, Cpu, Clock, Layers, Power, Binary, AlertCircle } from 'lucide-react';
import { logError, ErrorLevel } from '@/utils/debugUtils';

interface ModelInfo {
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'loading' | 'error';
  size: string;
  lastInference: number | null;
  inferenceTime: number;
  accuracy: number;
}

interface NetworkInfo {
  layer: string;
  type: string;
  outputShape: string;
  params: number;
  status: 'active' | 'optimized' | 'inactive';
}

export const TensorflowMonitor: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [inferenceCount, setInferenceCount] = useState(0);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [gpuEnabled, setGpuEnabled] = useState(false);
  const [modelInfo, setModelInfo] = useState<ModelInfo[]>([]);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  
  // Efectos de inicialización y actualización
  useEffect(() => {
    try {
      // Simular carga de TensorFlow.js
      setTimeout(() => {
        setIsLoaded(true);
        logError("TensorFlow.js cargado correctamente", ErrorLevel.INFO, "TensorflowMonitor");
        
        // Cargar información de modelos simulados
        const initialModels: ModelInfo[] = [
          {
            name: "finger-detection-model",
            type: "CNN",
            status: 'active',
            size: "2.4 MB",
            lastInference: Date.now(),
            inferenceTime: 23.4,
            accuracy: 92.7
          },
          {
            name: "signal-quality-model",
            type: "LSTM",
            status: 'active',
            size: "1.8 MB",
            lastInference: Date.now() - 12000,
            inferenceTime: 18.2,
            accuracy: 88.5
          },
          {
            name: "adaptive-threshold-model",
            type: "MLP",
            status: 'inactive',
            size: "0.9 MB",
            lastInference: null,
            inferenceTime: 8.7,
            accuracy: 90.1
          }
        ];
        
        setModelInfo(initialModels);
        setSelectedModel("finger-detection-model");
        
        // Cargar información de red neuronal para el modelo seleccionado
        loadNetworkInfo("finger-detection-model");
      }, 1500);
      
      // Actualizar métricas periódicamente
      const intervalId = setInterval(() => {
        if (!isLoaded) return;
        
        // Aumentar contador de inferencias cuando activo
        if (isActive) {
          setInferenceCount(prev => prev + 1);
          setInferenceTime(10 + Math.random() * 15);
          setMemoryUsage(15 + Math.random() * 20);
          
          // Actualizar timestamp de última inferencia
          setModelInfo(prev => prev.map(model => 
            model.status === 'active' 
              ? {...model, lastInference: Date.now(), inferenceTime: model.inferenceTime + (Math.random() * 2 - 1)} 
              : model
          ));
        }
      }, 2000);
      
      return () => clearInterval(intervalId);
    } catch (error) {
      logError(
        `Error iniciando monitor de TensorFlow: ${error}`,
        ErrorLevel.ERROR,
        "TensorflowMonitor"
      );
    }
  }, [isLoaded, isActive]);
  
  // Cargar información de capas para un modelo específico
  const loadNetworkInfo = (modelName: string) => {
    if (modelName === "finger-detection-model") {
      const networkLayers: NetworkInfo[] = [
        { layer: "input_1", type: "InputLayer", outputShape: "(null, 128, 128, 3)", params: 0, status: 'active' },
        { layer: "conv2d_1", type: "Conv2D", outputShape: "(null, 126, 126, 32)", params: 896, status: 'active' },
        { layer: "max_pooling2d_1", type: "MaxPooling2D", outputShape: "(null, 63, 63, 32)", params: 0, status: 'active' },
        { layer: "conv2d_2", type: "Conv2D", outputShape: "(null, 61, 61, 64)", params: 18496, status: 'active' },
        { layer: "max_pooling2d_2", type: "MaxPooling2D", outputShape: "(null, 30, 30, 64)", params: 0, status: 'optimized' },
        { layer: "dropout_1", type: "Dropout", outputShape: "(null, 30, 30, 64)", params: 0, status: 'active' },
        { layer: "flatten_1", type: "Flatten", outputShape: "(null, 57600)", params: 0, status: 'active' },
        { layer: "dense_1", type: "Dense", outputShape: "(null, 128)", params: 7372928, status: 'optimized' },
        { layer: "dense_2", type: "Dense", outputShape: "(null, 1)", params: 129, status: 'active' }
      ];
      setNetworkInfo(networkLayers);
    } else if (modelName === "signal-quality-model") {
      const networkLayers: NetworkInfo[] = [
        { layer: "input_1", type: "InputLayer", outputShape: "(null, 100, 1)", params: 0, status: 'active' },
        { layer: "lstm_1", type: "LSTM", outputShape: "(null, 100, 64)", params: 16896, status: 'active' },
        { layer: "lstm_2", type: "LSTM", outputShape: "(null, 32)", params: 12416, status: 'active' },
        { layer: "dense_1", type: "Dense", outputShape: "(null, 16)", params: 528, status: 'active' },
        { layer: "dense_2", type: "Dense", outputShape: "(null, 1)", params: 17, status: 'active' }
      ];
      setNetworkInfo(networkLayers);
    } else {
      setNetworkInfo([]);
    }
  };
  
  // Manejar cambio de modelo seleccionado
  const handleModelSelect = (modelName: string) => {
    setSelectedModel(modelName);
    loadNetworkInfo(modelName);
  };
  
  // Alternar estado activo
  const toggleActive = () => {
    setIsActive(!isActive);
    
    if (!isActive) {
      logError("TensorFlow.js activado para inferencia", ErrorLevel.INFO, "TensorflowMonitor");
    } else {
      logError("TensorFlow.js desactivado", ErrorLevel.INFO, "TensorflowMonitor");
    }
  };
  
  // Alternar uso de GPU
  const toggleGPU = () => {
    setGpuEnabled(!gpuEnabled);
    logError(
      `TensorFlow.js ${!gpuEnabled ? 'utilizando' : 'no utilizando'} aceleración GPU`, 
      ErrorLevel.INFO,
      "TensorflowMonitor"
    );
  };
  
  if (!isLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            TensorFlow.js
          </CardTitle>
          <CardDescription>
            Cargando sistema de inferencia...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8">
            <Progress value={45} className="w-full mb-4" />
            <p className="text-sm text-muted-foreground">Cargando modelos y sistemas de inferencia...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5" />
              TensorFlow.js
            </CardTitle>
            <Badge variant={isActive ? "default" : "outline"}>
              {isActive ? "ACTIVO" : "INACTIVO"}
            </Badge>
          </div>
          <CardDescription>
            Monitoreo de inferencia y modelos de IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch 
                    id="tf-active" 
                    checked={isActive} 
                    onCheckedChange={toggleActive} 
                  />
                  <Label htmlFor="tf-active">Activar Inferencia</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    id="gpu-enabled" 
                    checked={gpuEnabled} 
                    onCheckedChange={toggleGPU} 
                  />
                  <Label htmlFor="gpu-enabled">Aceleración GPU</Label>
                </div>
              </div>
              
              <div className="space-x-2">
                <Badge variant="secondary">Inferencias: {inferenceCount}</Badge>
                <Badge variant="outline">{inferenceTime.toFixed(1)} ms/inf</Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Tiempo de Inferencia
                </Label>
                <Progress value={(1 - inferenceTime / 50) * 100} />
                <div className="text-xs text-right text-muted-foreground">
                  {inferenceTime.toFixed(1)} ms
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Memory className="h-4 w-4" /> Memoria VRAM
                </Label>
                <Progress value={memoryUsage} />
                <div className="text-xs text-right text-muted-foreground">
                  {memoryUsage.toFixed(1)}% utilizado
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Cpu className="h-4 w-4" /> Uso de Procesador
                </Label>
                <Progress value={isActive ? 35 + Math.random() * 20 : 5} />
                <div className="text-xs text-right text-muted-foreground">
                  {isActive ? (35 + Math.random() * 20).toFixed(1) : 5}% utilizado
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Modelos Disponibles</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tamaño</TableHead>
                      <TableHead>Última Inferencia</TableHead>
                      <TableHead>Precisión</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modelInfo.map(model => (
                      <TableRow 
                        key={model.name}
                        className={selectedModel === model.name ? "bg-muted/50" : ""}
                      >
                        <TableCell>{model.name}</TableCell>
                        <TableCell>{model.type}</TableCell>
                        <TableCell>
                          <Badge variant={
                            model.status === 'active' ? 'default' : 
                            model.status === 'loading' ? 'secondary' :
                            model.status === 'error' ? 'destructive' :
                            'outline'
                          }>
                            {model.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{model.size}</TableCell>
                        <TableCell>
                          {model.lastInference 
                            ? new Date(model.lastInference).toLocaleTimeString() 
                            : "Nunca"}
                        </TableCell>
                        <TableCell>{model.accuracy.toFixed(1)}%</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleModelSelect(model.name)}
                          >
                            {selectedModel === model.name ? "Seleccionado" : "Ver Detalles"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {selectedModel && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Arquitectura de Red Neural</h4>
                <div className="border rounded-md">
                  <ScrollArea className="h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Capa</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Forma de Salida</TableHead>
                          <TableHead>Parámetros</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {networkInfo.map(layer => (
                          <TableRow key={layer.layer}>
                            <TableCell>{layer.layer}</TableCell>
                            <TableCell>{layer.type}</TableCell>
                            <TableCell className="font-mono text-xs">{layer.outputShape}</TableCell>
                            <TableCell>{layer.params.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={
                                layer.status === 'active' ? 'default' : 
                                layer.status === 'optimized' ? 'secondary' :
                                'outline'
                              }>
                                {layer.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            )}
            
            {!gpuEnabled && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  La aceleración GPU está desactivada. El rendimiento puede ser limitado.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
