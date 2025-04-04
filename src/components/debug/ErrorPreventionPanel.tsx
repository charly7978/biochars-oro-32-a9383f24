
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  useErrorPrevention, 
  getAvailableRecoveryActions, 
  getSystemHealth, 
  SystemHealthState,
  PreventionMode,
  getDiagnosticChannelState
} from '@/utils/errorPrevention';
import { AlertTriangle, CheckCircle, RefreshCw, Shield, Activity, Settings } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ErrorPreventionPanel = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [recoveryActions, setRecoveryActions] = useState<any[]>([]);
  const [healthState, setHealthState] = useState<SystemHealthState>(SystemHealthState.HEALTHY);
  const [diagnosticState, setDiagnosticState] = useState(getDiagnosticChannelState());
  
  const errorPrevention = useErrorPrevention({
    autoRecover: true,
    notifyOnRecovery: true
  });
  
  // Poll for updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      setRecoveryActions(getAvailableRecoveryActions());
      setHealthState(getSystemHealth());
      setDiagnosticState(getDiagnosticChannelState());
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Get color for health state
  const getHealthColor = (state: SystemHealthState) => {
    switch (state) {
      case SystemHealthState.CRITICAL:
        return 'text-red-500 bg-red-50';
      case SystemHealthState.DEGRADED:
        return 'text-amber-500 bg-amber-50';
      case SystemHealthState.WARNING:
        return 'text-yellow-500 bg-yellow-50';
      case SystemHealthState.HEALTHY:
      default:
        return 'text-emerald-500 bg-emerald-50';
    }
  };
  
  const handleModeChange = (value: string) => {
    errorPrevention.setMode(value as PreventionMode);
  };
  
  const handleRunRecovery = async (name: string) => {
    await errorPrevention.runRecovery(name);
    setRecoveryActions(getAvailableRecoveryActions());
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Error Prevention System</CardTitle>
          </div>
          <Badge variant="outline" className={getHealthColor(healthState)}>
            {healthState}
          </Badge>
        </div>
        <CardDescription>
          Comprehensive monitoring and prevention of avoidable errors
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6">
          <TabsList className="grid grid-cols-3 my-2">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              <span>Status</span>
            </TabsTrigger>
            <TabsTrigger value="recovery" className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              <span>Recovery</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="px-6 pb-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-3">
                <div className="text-sm font-medium text-gray-500 mb-1">Signal Quality</div>
                <div className="text-2xl font-bold">
                  {diagnosticState.signalQuality.toFixed(1)}%
                </div>
                <Progress
                  value={diagnosticState.signalQuality}
                  className="h-2 mt-2"
                />
              </div>
              
              <div className="border rounded-lg p-3">
                <div className="text-sm font-medium text-gray-500 mb-1">Error Rate</div>
                <div className="text-2xl font-bold">
                  {diagnosticState.errorRate.toFixed(1)}%
                </div>
                <Progress
                  value={Math.min(100, diagnosticState.errorRate * 2)} // Scale for visibility
                  className="h-2 mt-2 bg-gray-100"
                  indicatorClassName={diagnosticState.errorRate > 30 ? "bg-red-500" : 
                                       diagnosticState.errorRate > 10 ? "bg-amber-500" : "bg-emerald-500"}
                />
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">Diagnostic Channel Status</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Connection:</span>
                  <Badge variant={diagnosticState.connected ? "success" : "destructive"} className="ml-2">
                    {diagnosticState.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Processing:</span>
                  <span className="font-medium">{(diagnosticState.processingLoad * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Last Update:</span>
                  <span className="font-medium">
                    {diagnosticState.lastReceived ? 
                      Math.floor((Date.now() - diagnosticState.lastReceived) / 1000) + 's ago' : 
                      'Never'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Prevention Mode:</span>
                  <Badge variant="outline" className="font-medium">
                    {errorPrevention.currentMode()}
                  </Badge>
                </div>
              </div>
            </div>
            
            {healthState !== SystemHealthState.HEALTHY && (
              <Alert variant={healthState === SystemHealthState.CRITICAL ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>System Health Alert</AlertTitle>
                <AlertDescription>
                  {healthState === SystemHealthState.CRITICAL ? 
                    "Critical issues detected that require immediate attention." :
                    healthState === SystemHealthState.DEGRADED ?
                    "System performance is degraded. Consider running recovery actions." :
                    "Possible issues detected. Monitor system performance."}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="recovery" className="px-6 pb-6">
          <div className="space-y-4">
            <div className="rounded-lg border">
              <ScrollArea className="h-[300px] w-full">
                <div className="p-4 space-y-4">
                  {recoveryActions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No recovery actions available</p>
                  ) : (
                    recoveryActions.map((action) => (
                      <div key={action.name} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{action.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleRunRecovery(action.name)}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Run
                          </Button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                          <div>
                            Last executed: {action.lastExecuted ? 
                              new Date(action.lastExecuted).toLocaleTimeString() : 
                              'Never'}
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            Success: {action.successCount}
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            Failures: {action.failureCount}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="settings" className="px-6 pb-6">
          <div className="space-y-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Prevention Mode</h3>
              <Select
                defaultValue={errorPrevention.currentMode()}
                onValueChange={handleModeChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select prevention mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passive">Passive (Monitor only)</SelectItem>
                  <SelectItem value="active">Active (Default)</SelectItem>
                  <SelectItem value="aggressive">Aggressive (Maximum prevention)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-2">
                {errorPrevention.currentMode() === PreventionMode.PASSIVE ? 
                  "Only monitors and logs issues without taking preventive actions." :
                  errorPrevention.currentMode() === PreventionMode.ACTIVE ?
                  "Applies preventive measures when issues are detected." :
                  "Maximum prevention with aggressive intervention (may affect performance)."}
              </p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">System Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Browser:</span>
                  <span className="font-medium">{navigator.userAgent.split(' ').slice(-1)[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Platform:</span>
                  <span className="font-medium">{navigator.platform}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Session ID:</span>
                  <span className="font-medium">
                    {`${Date.now().toString(36).slice(-6)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Uptime:</span>
                  <span className="font-medium">
                    {`${Math.floor(performance.now() / 60000)}m`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="pt-0 flex justify-between text-xs text-gray-500">
        <div>Error Prevention System v1.0</div>
        <div>Diagnostic Channel: {diagnosticState.connected ? 'Online' : 'Offline'}</div>
      </CardFooter>
    </Card>
  );
};

export default ErrorPreventionPanel;
