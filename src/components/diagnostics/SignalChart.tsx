
import React, { useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SignalChartProps {
  data: Array<{value: number, time?: number, timestamp?: number}>;
  title: string;
  color: string;
  compareData?: Array<{value: number, time?: number, timestamp?: number}>;
  compareColor?: string;
  markers?: Array<{x: number, y: number, color: string}>;
  height?: number;
}

export const SignalChart: React.FC<SignalChartProps> = ({ 
  data, 
  title, 
  color, 
  compareData,
  compareColor = '#33a1ff',
  markers = [],
  height = 200
}) => {
  const chartRef = useRef<any>(null);

  // Format the data for the chart
  const chartData = {
    labels: data.map((_, i) => i.toString()),
    datasets: [
      {
        label: title,
        data: data.map(d => d.value || 0),
        fill: false,
        backgroundColor: color,
        borderColor: color,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5,
      },
      ...(compareData ? [{
        label: 'Comparación',
        data: compareData.map(d => d.value || 0),
        fill: false,
        backgroundColor: compareColor,
        borderColor: compareColor,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5,
      }] : []),
    ],
  };

  // Chart configuration
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0 // Disable animations for better performance
    },
    scales: {
      x: {
        display: false
      },
      y: {
        beginAtZero: false,
        ticks: {
          maxTicksLimit: 5
        }
      },
    },
    plugins: {
      legend: {
        display: compareData ? true : false,
        position: 'top' as const,
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
      }
    },
  };

  // Add markers to chart after rendering
  useEffect(() => {
    const chart = chartRef.current;
    
    if (chart && markers && markers.length > 0) {
      const originalDraw = chart.draw;
      
      chart.draw = function() {
        originalDraw.apply(this, arguments);
        
        const ctx = chart.ctx;
        const yAxis = chart.scales.y;
        const xAxis = chart.scales.x;
        
        markers.forEach(marker => {
          const xPos = xAxis.getPixelForValue(marker.x);
          const yPos = yAxis.getPixelForValue(marker.y);
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(xPos, yPos, 4, 0, 2 * Math.PI);
          ctx.fillStyle = marker.color;
          ctx.fill();
          ctx.restore();
        });
      };
    }
  }, [markers]);

  return (
    <div style={{ height: `${height}px` }}>
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
};
