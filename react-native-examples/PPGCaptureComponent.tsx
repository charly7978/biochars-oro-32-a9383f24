
import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useSharedValue } from 'react-native-reanimated';
import { Canvas, Path, useCanvasRef } from '@shopify/react-native-skia';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

// Componente principal para captura PPG
export const PPGCaptureComponent = () => {
  // Referencias a cámaras y estado
  const devices = useCameraDevices();
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBPM, setCurrentBPM] = useState(0);
  const canvasRef = useCanvasRef();
  
  // Valores de la señal
  const signalValues = useRef<number[]>([]);
  const timeValues = useRef<number[]>([]);
  const signalPath = useSharedValue<string>('');
  
  // Solicitar permisos de cámara
  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      setHasPermission(cameraPermission === 'authorized');
    })();
    
    // Inicializar TensorFlow
    initializeTensorFlow();
    
    return () => {
      // Limpiar recursos al desmontar
      if (isProcessing) {
        stopProcessing();
      }
    };
  }, []);
  
  // Inicializar TensorFlow
  const initializeTensorFlow = async () => {
    try {
      await tf.ready();
      console.log('TensorFlow inicializado correctamente');
    } catch (error) {
      console.error('Error al inicializar TensorFlow:', error);
    }
  };
  
  // Procesar frame de la cámara
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    if (!isProcessing) return;
    
    // Obtener la imagen del frame
    const image = frame.getImage();
    
    // Extraer componente rojo (simplificado para ejemplo)
    const width = image.getWidth();
    const height = image.getHeight();
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    // En una implementación real, procesaríamos una región central
    // Este es un ejemplo simplificado
    const pixelData = image.getPixelData(
      centerX - 50, centerY - 50,
      100, 100
    );
    
    // Calcular valor promedio del componente rojo en la región
    let redSum = 0;
    for (let i = 0; i < pixelData.length; i += 4) {
      redSum += pixelData[i]; // Componente rojo
    }
    const avgRed = redSum / (pixelData.length / 4);
    
    // Enviar para procesamiento
    runOnJS(processSignalValue)(avgRed);
  }, [isProcessing]);
  
  // Procesar valor de señal
  const processSignalValue = (value: number) => {
    const now = Date.now();
    
    // Añadir valor a los arrays
    signalValues.current.push(value);
    timeValues.current.push(now);
    
    // Mantener solo los últimos 5 segundos de datos
    const fiveSecondsAgo = now - 5000;
    while (timeValues.current[0] < fiveSecondsAgo) {
      signalValues.current.shift();
      timeValues.current.shift();
    }
    
    // Actualizar la gráfica
    updateSignalPath();
    
    // Cada 30 valores, calcular BPM
    if (signalValues.current.length % 30 === 0) {
      calculateHeartRate();
    }
  };
  
  // Actualizar ruta de la señal para dibujar
  const updateSignalPath = () => {
    if (signalValues.current.length < 2) return;
    
    // Normalizar valores para visualización
    const minVal = Math.min(...signalValues.current);
    const maxVal = Math.max(...signalValues.current);
    const range = maxVal - minVal;
    
    // Crear ruta SVG
    let path = `M 0,${100 - ((signalValues.current[0] - minVal) / range) * 100}`;
    
    for (let i = 1; i < signalValues.current.length; i++) {
      const x = (i / (signalValues.current.length - 1)) * 300;
      const y = 100 - ((signalValues.current[i] - minVal) / range) * 100;
      path += ` L ${x},${y}`;
    }
    
    signalPath.value = path;
  };
  
  // Calcular frecuencia cardíaca
  const calculateHeartRate = () => {
    // En una implementación real, usaríamos el algoritmo de detección de picos
    // Por ahora, simplemente simulamos un resultado
    if (signalValues.current.length > 60) {
      // Implementación simplificada para el ejemplo
      // Un algoritmo real usaría FFT o detección de picos
      const simulatedBPM = Math.floor(60 + Math.random() * 40);
      setCurrentBPM(simulatedBPM);
    }
  };
  
  // Iniciar procesamiento
  const startProcessing = () => {
    signalValues.current = [];
    timeValues.current = [];
    setIsProcessing(true);
  };
  
  // Detener procesamiento
  const stopProcessing = () => {
    setIsProcessing(false);
  };
  
  // Si no hay permisos o dispositivos disponibles
  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text>Se requiere permiso para usar la cámara</Text>
      </View>
    );
  }
  
  const device = devices.back;
  
  if (!device) {
    return (
      <View style={styles.centerContainer}>
        <Text>Cargando cámara...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        frameProcessorFps={30}
      />
      
      <View style={styles.overlay}>
        <View style={styles.heartRateContainer}>
          <Text style={styles.bpmText}>{currentBPM}</Text>
          <Text style={styles.bpmLabel}>BPM</Text>
        </View>
        
        <View style={styles.graphContainer}>
          <Canvas ref={canvasRef} style={styles.canvas}>
            <Path
              path={signalPath}
              color="#FF0000"
              style="stroke"
              strokeWidth={2}
            />
          </Canvas>
        </View>
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            isProcessing ? styles.stopButton : styles.startButton
          ]}
          onPress={isProcessing ? stopProcessing : startProcessing}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? 'Detener' : 'Iniciar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
    padding: 20,
  },
  heartRateContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  bpmText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  bpmLabel: {
    fontSize: 18,
    color: 'white',
  },
  graphContainer: {
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
  actionButton: {
    alignSelf: 'center',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: '#00A86B',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
