
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OptimizationState } from '@/modules/signal-processing/utils/parameter-optimization';

// Define OptimizationMetrics interface to match useSignalParameterOptimizer
interface OptimizationMetrics {
  currentScore: number;
  bestScore: number;
  improvementPercentage: number;
  optimizationCycles: number;
  lastOptimizationTime: number | null;
  paramsHistory: Array<{
    timestamp: number;
    score: number;
    params: Record<string, any>;
  }>;
}

interface OptimizerMonitorProps {
  metrics: OptimizationMetrics | null;
  state: OptimizationState;
  isReady: boolean;
  onStartOptimization: () => void;
  onReset: () => void;
  onToggleAuto: (enabled: boolean) => void;
  autoOptimizeEnabled?: boolean;
}

const OptimizerMonitor: React.FC<OptimizerMonitorProps> = ({
  metrics,
  state,
  isReady,
  onStartOptimization,
  onReset,
  onToggleAuto,
  autoOptimizeEnabled = false
}) => {
  const [autoOptimize, setAutoOptimize] = useState(autoOptimizeEnabled);
  
  useEffect(() => {
    setAutoOptimize(autoOptimizeEnabled);
  }, [autoOptimizeEnabled]);
  
  const handleToggleAuto = () => {
    const newValue = !autoOptimize;
    setAutoOptimize(newValue);
    onToggleAuto(newValue);
  };
  
  const getStateColor = (state: OptimizationState): string => {
    switch (state) {
      case OptimizationState.IDLE:
        return 'bg-blue-500';
      case OptimizationState.OPTIMIZING:
        return 'bg-purple-500';
      case OptimizationState.COMPLETED:
        return 'bg-amber-500';
      case OptimizationState.FAILED:
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const formatTime = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Signal Parameter Optimizer</span>
          <Badge
            variant={state === OptimizationState.IDLE ? 'outline' : 'default'}
            className={`${getStateColor(state)} text-white`}
          >
            {state.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Monitor and control the Bayesian optimization process
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current scores */}
        {metrics && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Score:</span>
                <span className="font-medium">{metrics.currentScore.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Best Score:</span>
                <span className="font-medium">{metrics.bestScore.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Improvement:</span>
                <span className={`font-medium ${metrics.improvementPercentage > 0 ? 'text-green-500' : ''}`}>
                  {metrics.improvementPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Optimization Cycles:</span>
                <span className="font-medium">{metrics.optimizationCycles}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Last Optimization:</span>
                <span className="font-medium">{formatTime(metrics.lastOptimizationTime)}</span>
              </div>
            </div>
            
            {/* Parameter history */}
            {metrics.paramsHistory.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-medium">Parameter History</h4>
                <ScrollArea className="h-[150px] border rounded-md p-2">
                  <div className="space-y-3">
                    {metrics.paramsHistory.slice().reverse().map((entry, index) => (
                      <div key={index} className="text-xs border-l-2 pl-2 py-1 border-blue-300">
                        <div className="flex justify-between">
                          <span className="text-gray-500">{formatTime(entry.timestamp)}</span>
                          <Badge variant="outline" className="text-xs">
                            Score: {entry.score.toFixed(2)}
                          </Badge>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
                          {Object.entries(entry.params).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-500">{key}:</span>
                              <span>{typeof value === 'number' ? value.toFixed(3) : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="flex items-center space-x-2">
          <Switch 
            id="auto-optimize" 
            checked={autoOptimize}
            onCheckedChange={handleToggleAuto}
            disabled={!isReady}
          />
          <label 
            htmlFor="auto-optimize" 
            className="text-sm cursor-pointer"
          >
            Auto-optimize
          </label>
        </div>
        
        <div className="space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onReset}
            disabled={!isReady || state !== OptimizationState.IDLE}
          >
            Reset
          </Button>
          <Button 
            size="sm"
            onClick={onStartOptimization}
            disabled={!isReady || state !== OptimizationState.IDLE}
          >
            Optimize Now
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default OptimizerMonitor;
