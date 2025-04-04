
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDeviceErrors, clearDeviceErrors } from "@/utils/deviceErrorTracker";

interface ErrorMonitorProps {
  pollInterval?: number;
  maxHeight?: string;
}

const ErrorMonitor = ({ pollInterval = 3000, maxHeight = "400px" }: ErrorMonitorProps) => {
  const [errors, setErrors] = useState(getDeviceErrors());
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  useEffect(() => {
    if (!autoRefresh) return;
    
    const intervalId = setInterval(() => {
      setErrors(getDeviceErrors());
    }, pollInterval);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, pollInterval]);
  
  const handleClearErrors = () => {
    clearDeviceErrors();
    setErrors([]);
  };
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };
  
  const getErrorColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'error':
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-700';
    }
  };
  
  return (
    <div className="border rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="font-medium">Device Error Monitor</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleClearErrors}
          >
            Clear Errors
          </Button>
        </div>
      </div>
      
      <ScrollArea style={{ maxHeight }}>
        <div className="p-3 space-y-2">
          {errors.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No device errors recorded</p>
          ) : (
            errors.map((error, index) => (
              <div key={index} className="border-l-4 border-gray-300 pl-3 py-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{formatTime(error.timestamp)}</span>
                  <span className={`text-xs font-medium ${getErrorColor(error.type)}`}>
                    {error.type.toUpperCase()}
                  </span>
                  {error.source && (
                    <span className="text-xs bg-gray-100 px-1 rounded text-gray-700">
                      {error.source}
                    </span>
                  )}
                </div>
                <p className="text-sm font-mono mt-1">{error.message}</p>
                {error.extra && (
                  <pre className="text-xs bg-gray-50 p-1 mt-1 overflow-x-auto max-w-full">
                    {JSON.stringify(error.extra, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ErrorMonitor;
