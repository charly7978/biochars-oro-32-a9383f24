
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErrorPrevention, PreventionMode, SystemHealthState, getAvailableRecoveryActions, getSystemHealth, getDiagnosticChannelState } from "@/utils/errorPrevention/integration";
import { ErrorLevel } from "@/utils/debugUtils";

export function ErrorPreventionPanel() {
  const errorPrevention = useErrorPrevention();
  const [activeTab, setActiveTab] = useState<string>("status");
  const [recoveryActions, setRecoveryActions] = useState<any[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [recoveryInProgress, setRecoveryInProgress] = useState(false);
  
  // Get available recovery actions
  useEffect(() => {
    setRecoveryActions(getAvailableRecoveryActions());
  }, []);
  
  // Run recovery action
  const handleRunRecovery = async () => {
    if (!selectedAction) return;
    
    setRecoveryInProgress(true);
    
    try {
      await errorPrevention.runRecovery(selectedAction);
      setSelectedAction(null);
    } catch (error) {
      console.error("Error running recovery action:", error);
    } finally {
      setRecoveryInProgress(false);
    }
  };
  
  // Change prevention mode
  const handleModeChange = (mode: PreventionMode) => {
    errorPrevention.setMode(mode);
  };
  
  const getHealthColorClass = (health: string) => {
    switch (health) {
      case 'optimal': return 'bg-green-500';
      case 'good': return 'bg-emerald-500';
      case 'degraded': return 'bg-yellow-500';
      case 'poor': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getHealthPercentage = (health: string) => {
    switch (health) {
      case 'optimal': return 100;
      case 'good': return 80;
      case 'degraded': return 60;
      case 'poor': return 30;
      case 'critical': return 10;
      default: return 50;
    }
  };
  
  const diagnostics = errorPrevention.getDiagnostics();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Error Prevention System</span>
          <Badge
            variant={errorPrevention.healthStatus === 'critical' ? 'destructive' : 'default'}
            className="ml-2"
          >
            {errorPrevention.healthStatus.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Monitor and control the error prevention system
        </CardDescription>
      </CardHeader>
      <Tabs defaultValue="status" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mx-4">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>
        
        <CardContent>
          <TabsContent value="status" className="mt-4 space-y-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">System Health</span>
                  <span className="text-sm">{errorPrevention.healthStatus}</span>
                </div>
                <Progress 
                  value={getHealthPercentage(errorPrevention.healthStatus)} 
                  className={`h-2 ${getHealthColorClass(errorPrevention.healthStatus)}`} 
                />
              </div>
              
              <Alert variant={errorPrevention.healthStatus === 'critical' ? 'destructive' : 'default'}>
                <AlertTitle>Prevention Mode</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>{errorPrevention.currentMode || PreventionMode.STANDARD}</span>
                  <div className="space-x-2 mt-2">
                    <Button 
                      size="sm" 
                      variant={errorPrevention.currentMode === PreventionMode.MINIMAL ? 'default' : 'outline'}
                      onClick={() => handleModeChange(PreventionMode.MINIMAL)}
                    >
                      Minimal
                    </Button>
                    <Button 
                      size="sm" 
                      variant={errorPrevention.currentMode === PreventionMode.STANDARD ? 'default' : 'outline'}
                      onClick={() => handleModeChange(PreventionMode.STANDARD)}
                    >
                      Standard
                    </Button>
                    <Button 
                      size="sm" 
                      variant={errorPrevention.currentMode === PreventionMode.AGGRESSIVE ? 'default' : 'outline'}
                      onClick={() => handleModeChange(PreventionMode.AGGRESSIVE)}
                    >
                      Aggressive
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="border rounded-md p-4">
                <h4 className="text-sm font-medium mb-2">Recent Errors</h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {diagnostics.recentErrors.slice().reverse().map((error, index) => (
                      <div 
                        key={index} 
                        className={`p-2 rounded-md text-xs ${
                          error.severity === ErrorLevel.CRITICAL 
                            ? 'bg-red-100 dark:bg-red-900/30' 
                            : error.severity === ErrorLevel.ERROR 
                            ? 'bg-orange-100 dark:bg-orange-900/30' 
                            : 'bg-yellow-100 dark:bg-yellow-900/30'
                        }`}
                      >
                        <div className="font-medium">{error.message}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                    {diagnostics.recentErrors.length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        No recent errors
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="recovery" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm">
                Select a recovery action to run in case of issues:
              </div>
              
              <div className="space-y-2">
                {recoveryActions.map((action) => (
                  <div 
                    key={action.id}
                    className={`border p-3 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                      selectedAction === action.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                    onClick={() => setSelectedAction(action.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{action.name}</span>
                      <Badge 
                        variant={
                          action.severity === 'high' 
                            ? 'destructive' 
                            : action.severity === 'medium' 
                            ? 'default' 
                            : 'outline'
                        }
                      >
                        {action.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {action.description}
                    </p>
                  </div>
                ))}
                
                {recoveryActions.length === 0 && (
                  <div className="text-center p-4 text-gray-500 dark:text-gray-400">
                    No recovery actions available
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button 
                  disabled={!selectedAction || recoveryInProgress}
                  onClick={handleRunRecovery}
                >
                  {recoveryInProgress ? 'Running...' : 'Run Recovery Action'}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="diagnostics" className="mt-4">
            <div className="space-y-4">
              <div className="border rounded-md p-4">
                <h4 className="text-sm font-medium mb-2">System Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Prevention Mode</span>
                    <span>{errorPrevention.currentMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Health Status</span>
                    <span>{errorPrevention.healthStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Recent Errors</span>
                    <span>{diagnostics.recentErrors.length}</span>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-md p-4">
                <h4 className="text-sm font-medium mb-2">Diagnostic Events</h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {diagnostics.diagnosticEvents.slice().reverse().map((event, index) => (
                      <div key={index} className="p-2 rounded-md text-xs bg-gray-100 dark:bg-gray-800">
                        <div className="font-medium">{event.component}: {event.event}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                    {diagnostics.diagnosticEvents.length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        No diagnostic events
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {errorPrevention.currentMode === PreventionMode.AGGRESSIVE ? 
            'Aggressive mode: Maximum protection with potential performance impact' :
            errorPrevention.currentMode === PreventionMode.MINIMAL ?
            'Minimal mode: Basic protection with no performance impact' :
            'Standard mode: Balanced protection and performance'
          }
        </div>
      </CardFooter>
    </Card>
  );
}

export default ErrorPreventionPanel;
