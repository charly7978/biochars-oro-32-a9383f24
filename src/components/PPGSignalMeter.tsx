import React, { useRef, useEffect, useState } from 'react';
import { HydrationIndicator } from './HydrationIndicator';

interface PPGSignalMeterProps {
  value: number;
  quality: number;
  isFingerDetected: boolean;
  onStartMeasurement?: () => void;
  onReset?: () => void;
  arrhythmiaStatus?: string;
  preserveResults?: boolean;
  isArrhythmia?: boolean;
  hydrationLevel?: number;
}

const PPGSignalMeter: React.FC<PPGSignalMeterProps> = ({
  value,
  quality,
  isFingerDetected,
  onStartMeasurement,
  onReset,
  arrhythmiaStatus = "--",
  preserveResults = false,
  isArrhythmia = false,
  hydrationLevel = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [animationId, setAnimationId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const MAX_DATA_POINTS = 150;
  const GRAPH_COLOR = isArrhythmia ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 255, 0, 0.7)';
  const GRID_COLOR = 'rgba(255, 255, 255, 0.1)';
  const FINGER_LOST_COLOR = 'rgba(255, 0, 0, 0.3)';

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (isMounted) {
      setGraphData(prevData => {
        const newData = [...prevData, value];
        if (newData.length > MAX_DATA_POINTS) {
          newData.shift();
        }
        return newData;
      });
    }
  }, [value, isMounted]);

  useEffect(() => {
    const drawGraph = () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.5;
      const gridSize = 20;
      for (let i = gridSize; i < width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = gridSize; j < height; j += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }

      // Draw PPG signal graph
      ctx.lineWidth = 2;
      ctx.strokeStyle = GRAPH_COLOR;
      ctx.beginPath();

      const xIncrement = width / (graphData.length - 1);
      for (let i = 0; i < graphData.length; i++) {
        const x = i * xIncrement;
        const y = height - (graphData[i] * height / 255);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // If finger is not detected, overlay with a red tint
      if (!isFingerDetected) {
        ctx.fillStyle = FINGER_LOST_COLOR;
        ctx.fillRect(0, 0, width, height);
      }

      if (isDrawing) {
        const id = requestAnimationFrame(drawGraph);
        setAnimationId(id);
      }
    };

    if (isDrawing && canvasRef.current) {
      drawGraph();
    }

    return () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [graphData, isFingerDetected, isDrawing, isArrhythmia]);

  useEffect(() => {
    setIsDrawing(true);
    return () => {
      setIsDrawing(false);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width="300"
        height="150"
      />
      
      {/* Add Hydration Indicator */}
      <div className="absolute bottom-4 right-4 z-20">
        <HydrationIndicator hydrationLevel={hydrationLevel} size="md" />
      </div>
      
    </div>
  );
};

export default PPGSignalMeter;
