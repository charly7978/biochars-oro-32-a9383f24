
/**
 * Componente para visualizar señales en tiempo real
 * Con integración para redes neuronales
 */
import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface SignalVisualizerProps {
  data: number[];
  processedData?: number[];
  neuralData?: number[];
  width?: number;
  height?: number;
  lineColor?: string;
  processedColor?: string;
  neuralColor?: string;
  backgroundColor?: string;
  title?: string;
  showLegend?: boolean;
  sampleRate?: number;
}

export function SignalVisualizer({
  data,
  processedData,
  neuralData,
  width = 500,
  height = 200,
  lineColor = '#ff0000',
  processedColor = '#00ff00',
  neuralColor = '#0000ff',
  backgroundColor = '#f0f0f0',
  title = 'Visualización de Señal en Tiempo Real',
  showLegend = true,
  sampleRate = 30
}: SignalVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tfBackend, setTfBackend] = useState<string>('No inicializado');
  
  // Obtener backend de TensorFlow
  useEffect(() => {
    const checkTensorFlow = async () => {
      try {
        await tf.ready();
        setTfBackend(tf.getBackend() || 'No disponible');
      } catch (e) {
        console.error("Error verificando TensorFlow:", e);
        setTfBackend('Error');
      }
    };
    
    checkTensorFlow();
  }, []);
  
  // Dibujar señal en el canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Limpiar canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Dibujar línea central
    ctx.strokeStyle = '#888';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Calcular escala
    const maxPoints = width;
    const dataToUse = data.slice(-maxPoints);
    const allValues = [...dataToUse];
    
    if (processedData) {
      allValues.push(...processedData.slice(-maxPoints));
    }
    
    if (neuralData) {
      allValues.push(...neuralData.slice(-maxPoints));
    }
    
    const maxVal = Math.max(1, ...allValues.map(Math.abs));
    const scale = (height / 2) / maxVal;
    
    // Función para dibujar línea
    const drawLine = (values: number[], color: string, lineWidth: number) => {
      if (!values || values.length < 2) return;
      
      const valuesToDraw = values.slice(-maxPoints);
      const xStep = width / Math.max(maxPoints - 1, 1);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      
      valuesToDraw.forEach((val, i) => {
        const x = i * xStep;
        const y = (height / 2) - (val * scale);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    };
    
    // Dibujar señales
    if (processedData && processedData.length > 0) {
      drawLine(processedData, processedColor, 1.5);
    }
    
    if (neuralData && neuralData.length > 0) {
      drawLine(neuralData, neuralColor, 2);
    }
    
    // Dibujar señal raw al final para que esté por encima
    drawLine(dataToUse, lineColor, 1);
    
    // Dibujar leyenda
    if (showLegend) {
      ctx.font = '12px Arial';
      ctx.fillStyle = lineColor;
      ctx.fillText('Señal Raw', 10, 15);
      
      if (processedData && processedData.length > 0) {
        ctx.fillStyle = processedColor;
        ctx.fillText('Señal Filtrada', 10, 30);
      }
      
      if (neuralData && neuralData.length > 0) {
        ctx.fillStyle = neuralColor;
        ctx.fillText('Señal Neural', 10, 45);
      }
      
      // Mostrar tasa de muestreo
      ctx.fillStyle = '#333';
      ctx.fillText(`${sampleRate} Hz`, width - 50, 15);
      
      // Mostrar backend TF
      ctx.fillStyle = '#333';
      ctx.fillText(`TF: ${tfBackend}`, width - 120, height - 10);
    }
    
  }, [data, processedData, neuralData, width, height, lineColor, processedColor, neuralColor, backgroundColor, showLegend, sampleRate, tfBackend]);
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-hidden">
          <canvas 
            ref={canvasRef} 
            width={width} 
            height={height}
            className="w-full border rounded"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default SignalVisualizer;
