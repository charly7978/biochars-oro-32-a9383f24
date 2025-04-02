
# Guía de Migración a React Native

## Configuración Inicial

Para comenzar con la migración de tu aplicación de monitoreo cardíaco a React Native, sigue estos pasos:

### 1. Configurar el entorno de desarrollo

- Instalar Node.js (versión 14 o superior)
- Instalar Watchman (recomendado para desarrollo en macOS)
- Instalar Xcode (para desarrollo iOS, solo macOS)
- Instalar Android Studio y SDK (para desarrollo Android)

### 2. Crear un nuevo proyecto React Native

```bash
# Usando React Native CLI
npx react-native init BiocharsHeartMonitor --template react-native-template-typescript

# O usando Expo (opción más sencilla para comenzar)
npx create-expo-app BiocharsHeartMonitor --template=expo-template-blank-typescript
```

### 3. Instalar dependencias necesarias

```bash
cd BiocharsHeartMonitor
npm install react-native-vision-camera @shopify/react-native-skia @tensorflow/tfjs @tensorflow/tfjs-react-native react-native-fs react-native-reanimated react-native-svg
```

## Estructura de Carpetas Recomendada

```
/app
  /components
    /camera
      CameraView.tsx
      CameraPermissions.tsx
    /heart-rate
      HeartRateDisplay.tsx
      HeartBeatIndicator.tsx
    /ui
      Button.tsx
      Card.tsx
  /hooks
    /arrhythmia
      useArrhythmiaDetector.ts
    /heart-beat
      useHeartBeatProcessor.ts
      useSignalProcessor.ts
    useTensorFlowIntegration.ts
  /modules
    HeartBeatProcessor.ts
    SignalProcessor.ts
    VitalSignsProcessor.ts
  /utils
    displayOptimizer.ts
    tfModelInitializer.ts
  /screens
    HomeScreen.tsx
    ResultsScreen.tsx
    SettingsScreen.tsx
```

## Componentes Principales a Migrar

1. **CameraView**: Utilizar react-native-vision-camera
2. **Procesamiento de Señal**: Adaptar los algoritmos actuales 
3. **Visualización**: Recrear la interfaz utilizando react-native-skia
4. **Machine Learning**: Integrar TensorFlow.js para React Native

## Pasos de Migración

### 1. Implementar Acceso a Cámaras Múltiples

Con react-native-vision-camera, podrás acceder a múltiples cámaras traseras en dispositivos compatibles:

```typescript
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';

const CameraComponent = () => {
  const devices = useCameraDevices();
  const [selectedDevices, setSelectedDevices] = useState<any[]>([]);

  useEffect(() => {
    const backCameras = Object.values(devices)
      .filter(device => device?.position === 'back');
    
    // Seleccionar hasta 2 cámaras traseras si están disponibles
    setSelectedDevices(backCameras.slice(0, 2));
  }, [devices]);

  if (selectedDevices.length === 0) {
    return <Text>Cargando cámaras...</Text>;
  }

  return (
    <View style={styles.cameraContainer}>
      {selectedDevices.map((device, index) => (
        <Camera
          key={index}
          style={styles.camera}
          device={device}
          isActive={true}
          frameProcessor={/* Aquí implementarás el procesamiento de frames */}
          frameProcessorFps={30}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  camera: {
    flex: 1,
  },
});
```

### 2. Adaptar la Lógica de Procesamiento

El algoritmo de detección de ritmo cardíaco debe adaptarse para funcionar con los frames de la cámara en React Native:

```typescript
// Ejemplo básico de un frame processor
const frameProcessor = useFrameProcessor((frame) => {
  'worklet';
  // Obtener datos de la imagen
  const image = frame.getImage();
  
  // Extraer pixel rojo promedio (similar a la técnica PPG)
  const avgRed = extractRedComponent(image);
  
  // Enviar para procesamiento
  runOnJS(processSignalValue)(avgRed);
}, []);
```

### 3. TensorFlow.js en React Native

Para usar modelos TensorFlow en React Native:

```typescript
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

const initializeTensorFlow = async () => {
  await tf.ready();
  console.log("TensorFlow.js inicializado correctamente");
  // Cargar o crear modelos
};
```

## Recursos Adicionales

- [Documentación React Native](https://reactnative.dev/docs/getting-started)
- [React Native Vision Camera](https://mrousavy.com/react-native-vision-camera/)
- [React Native Skia](https://shopify.github.io/react-native-skia/)
- [TensorFlow.js para React Native](https://www.tensorflow.org/js/tutorials/react_native)
