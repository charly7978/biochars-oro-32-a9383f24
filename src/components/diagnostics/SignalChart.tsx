
import React, { useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const chartData = data.map((d, i) => ({
    name: i.toString(),
    value: d.value || 0,
    ...(compareData ? { compareValue: compareData[i]?.value || 0 } : {})
  }));

  // Custom marker rendering component
  const CustomMarker = ({ cx, cy, color: markerColor }: { cx: number, cy: number, color: string }) => (
    <circle cx={cx} cy={cy} r={4} fill={markerColor} />
  );

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          ref={chartRef}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" hide />
          <YAxis hide />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          {compareData && (
            <Line
              type="monotone"
              dataKey="compareValue"
              stroke={compareColor}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          )}
          {markers.map((marker, index) => {
            const dataPointIndex = Math.round(marker.x);
            if (dataPointIndex < chartData.length) {
              return (
                <CustomMarker 
                  key={index}
                  cx={marker.x} 
                  cy={marker.y} 
                  color={marker.color}
                />
              );
            }
            return null;
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
