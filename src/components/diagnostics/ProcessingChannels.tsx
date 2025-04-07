
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SignalChart } from './SignalChart';
import { Separator } from "@/components/ui/separator";
import { Activity, Signal, Heart, Activity as PulseIcon, Zap } from 'lucide-react';

interface ChannelData {
  [channelName: string]: {
    [metricName: string]: Array<{value: number, time: number}>
  };
}

interface ProcessingChannelsProps {
  data: ChannelData;
}

export const ProcessingChannels: React.FC<ProcessingChannelsProps> = ({ data }) => {
  // Helper function to get channel icon
  const getChannelIcon = (channelName: string) => {
    switch(channelName.toLowerCase()) {
      case 'ppg':
        return <Signal className="h-5 w-5" />;
      case 'heartbeat':
        return <Heart className="h-5 w-5" />;
      case 'pulse':
        return <PulseIcon className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };
  
  // Helper function to get channel color
  const getChannelColor = (channelName: string, metricName: string) => {
    const baseColors: Record<string, string> = {
      ppg: '#ff5733',
      heartbeat: '#33a1ff',
      pulse: '#33ff57',
      neural: '#a133ff',
    };
    
    const metricColors: Record<string, string> = {
      raw: '#ff5733',
      filtered: '#33a1ff',
      amplified: '#33ff57',
      quality: '#a133ff',
      confidence: '#ffcc33',
      baseline: '#33ccff',
    };
    
    if (metricName.toLowerCase() in metricColors) {
      return metricColors[metricName.toLowerCase()];
    }
    
    const channel = channelName.toLowerCase();
    return channel in baseColors ? baseColors[channel] : '#666666';
  };
  
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([channelName, channelMetrics]) => (
        <Card key={channelName}>
          <CardHeader>
            <div className="flex items-center">
              {getChannelIcon(channelName)}
              <CardTitle className="ml-2">Canal: {channelName}</CardTitle>
            </div>
            <CardDescription>
              {channelName === 'ppg' && 'Procesamiento de señal fotopletismográfica'}
              {channelName === 'heartbeat' && 'Detección y análisis de latidos cardíacos'}
              {channelName === 'pulse' && 'Análisis de pulso y parámetros derivados'}
              {channelName === 'neural' && 'Procesamiento de redes neuronales'}
              {!['ppg', 'heartbeat', 'pulse', 'neural'].includes(channelName) && 'Canal de procesamiento de señal'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(channelMetrics).map(([metricName, metricData]) => (
                <div key={`${channelName}-${metricName}`}>
                  <h3 className="font-medium mb-2 flex items-center">
                    {metricName === 'confidence' && <Zap className="h-4 w-4 mr-1" />}
                    {metricName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </h3>
                  <SignalChart 
                    data={metricData} 
                    title={metricName} 
                    color={getChannelColor(channelName, metricName)}
                    height={150}
                  />
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['throughput', 'latency', 'efficiency', 'quality'].map(metric => {
                // Generate sample metrics for visualization
                const value = metric === 'throughput' ? Math.random() * 100 + 50 :
                              metric === 'latency' ? Math.random() * 20 + 5 :
                              metric === 'efficiency' ? Math.random() * 30 + 70 :
                              Math.random() * 40 + 60;
                              
                return (
                  <Card key={`${channelName}-${metric}`}>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">
                        {metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </p>
                      <p className="text-2xl font-bold">
                        {metric === 'throughput' ? `${value.toFixed(1)} Hz` :
                         metric === 'latency' ? `${value.toFixed(1)} ms` :
                         `${value.toFixed(1)}%`}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
