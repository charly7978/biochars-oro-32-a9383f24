
import React, { useState, useEffect, useRef } from 'react';
import { getErrorBuffer, ErrorLevel } from '@/utils/debugUtils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SignalDataPoint {
  timestamp: number;
  value: number;
  isPeak?: boolean;
  quality?: number;
  fingerDetected?: boolean;
}

interface SignalDebuggerProps {
  signalData?: SignalDataPoint[];
  rawValues?: number[];
  filteredValues?: number[];
  showErrorLog?: boolean;
  showControls?: boolean;
  height?: string;
}

const SignalDebugger: React.FC<SignalDebuggerProps> = ({
  signalData = [],
  rawValues = [],
  filteredValues = [],
  showErrorLog = true,
  showControls = true,
  height = "300px"
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState("signal");
  const [errors, setErrors] = useState(getErrorBuffer());
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Refresh error log periodically
  useEffect(() => {
    if (!showErrorLog || !autoRefresh) return;
    
    const intervalId = setInterval(() => {
      setErrors(getErrorBuffer());
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, [showErrorLog, autoRefresh]);
  
  // Draw signal visualization
  useEffect(() => {
    if (!canvasRef.current || activeTab !== "signal") return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Prepare canvas
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Draw grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    
    // Vertical grid lines
    for (let x = 0; x < rect.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = 0; y < rect.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
    
    // Draw raw values
    if (rawValues.length > 0) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      const rawValueScale = Math.min(1, rect.height / (Math.max(...rawValues) * 1.5));
      const rawValueStep = rect.width / (rawValues.length - 1);
      
      rawValues.forEach((value, i) => {
        const x = i * rawValueStep;
        const y = rect.height - (value * rawValueScale);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    }
    
    // Draw filtered values
    if (filteredValues.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const filteredValueScale = Math.min(1, rect.height / (Math.max(...filteredValues) * 1.5));
      const filteredValueStep = rect.width / (filteredValues.length - 1);
      
      filteredValues.forEach((value, i) => {
        const x = i * filteredValueStep;
        const y = rect.height - (value * filteredValueScale);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    }
    
    // Draw signal data points with peaks highlighted
    if (signalData.length > 0) {
      const values = signalData.map(point => point.value);
      const scale = Math.min(1, rect.height / (Math.max(...values) * 1.5));
      const step = rect.width / (signalData.length - 1);
      
      // Lines connecting points
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      signalData.forEach((point, i) => {
        const x = i * step;
        const y = rect.height - (point.value * scale);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Draw peaks as points
      signalData.forEach((point, i) => {
        const x = i * step;
        const y = rect.height - (point.value * scale);
        
        if (point.isPeak) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        
        if (point.fingerDetected === false) {
          ctx.fillStyle = '#6b7280';
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x - step/2, 0, step, rect.height);
          ctx.globalAlpha = 1;
        }
      });
    }
    
  }, [canvasRef, signalData, rawValues, filteredValues, activeTab]);
  
  // Format time for display
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
  };
  
  // Get error level color
  const getErrorLevelColor = (level: ErrorLevel): string => {
    switch (level) {
      case ErrorLevel.INFO: return "text-blue-500";
      case ErrorLevel.WARNING: return "text-amber-500";
      case ErrorLevel.ERROR: return "text-red-500";
      case ErrorLevel.CRITICAL: return "text-white bg-red-600 px-1 rounded";
      default: return "text-gray-700";
    }
  };
  
  return (
    <div className="border rounded-lg shadow-sm overflow-hidden">
      <Tabs defaultValue="signal" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between p-2 border-b">
          <TabsList>
            <TabsTrigger value="signal">Signal Visualizer</TabsTrigger>
            {showErrorLog && <TabsTrigger value="errors">Error Log</TabsTrigger>}
          </TabsList>
          
          {showControls && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
              </Button>
            </div>
          )}
        </div>
        
        <TabsContent value="signal" className="p-0">
          <canvas 
            ref={canvasRef} 
            className="w-full"
            style={{ height }}
          />
        </TabsContent>
        
        {showErrorLog && (
          <TabsContent value="errors" className="p-0">
            <ScrollArea className="h-[300px]">
              {errors.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No errors recorded
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Time</TableHead>
                      <TableHead className="w-[90px]">Level</TableHead>
                      <TableHead className="w-[150px]">Source</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((error, i) => (
                      <TableRow key={`${error.timestamp}-${i}`}>
                        <TableCell className="font-mono text-xs">
                          {formatTime(error.timestamp)}
                        </TableCell>
                        <TableCell>
                          <span className={getErrorLevelColor(error.level)}>
                            {error.level.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell>{error.source}</TableCell>
                        <TableCell>
                          <Accordion type="single" collapsible>
                            <AccordionItem value={`error-${i}`} className="border-0">
                              <AccordionTrigger className="py-1 px-0">
                                {error.message}
                              </AccordionTrigger>
                              <AccordionContent>
                                {error.data && (
                                  <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-[150px]">
                                    {JSON.stringify(error.data, null, 2)}
                                  </pre>
                                )}
                                {error.stack && (
                                  <div className="mt-2">
                                    <div className="text-xs text-gray-500 mb-1">Stack trace:</div>
                                    <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-[150px]">
                                      {error.stack}
                                    </pre>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SignalDebugger;
