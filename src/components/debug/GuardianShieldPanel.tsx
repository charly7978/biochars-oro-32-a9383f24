
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * GuardianShield debug panel component
 */

import React, { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useGuardianShield } from '../../hooks/useGuardianShield';
import { logError, ErrorLevel } from '../../utils/debugUtils';

export default function GuardianShieldPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const { 
    state, 
    validationIssues, 
    duplicationIssues, 
    refresh, 
    generateReport 
  } = useGuardianShield({
    autoInitialize: true,
    reportingInterval: 10000
  });
  
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Refresh data periodically
  useEffect(() => {
    const timer = setInterval(() => {
      refresh();
      setRefreshCounter(prev => prev + 1);
    }, 5000);
    
    return () => clearInterval(timer);
  }, [refresh]);
  
  // Calculate health metrics
  const calculateHealthPercentage = () => {
    if (!state.lastReport) return 0;
    
    const signalHealth = state.lastReport.signalValidations.total > 0
      ? 100 - (state.lastReport.signalValidations.issueRate * 100)
      : 100;
      
    const recoveryHealth = state.lastReport.errorRecovery.attempts > 0
      ? state.lastReport.errorRecovery.successRate * 100
      : 100;
      
    const duplicateHealth = state.lastReport.duplicationIssues.detected > 0
      ? (state.lastReport.duplicationIssues.prevented / state.lastReport.duplicationIssues.detected) * 100
      : 100;
    
    // Weight the different factors
    return (signalHealth * 0.4) + (recoveryHealth * 0.4) + (duplicateHealth * 0.2);
  };
  
  const healthPercentage = calculateHealthPercentage();
  
  const getHealthColor = () => {
    if (healthPercentage > 90) return 'bg-green-500';
    if (healthPercentage > 70) return 'bg-yellow-500';
    if (healthPercentage > 50) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  const getHealthLabel = () => {
    if (healthPercentage > 90) return 'Healthy';
    if (healthPercentage > 70) return 'Good';
    if (healthPercentage > 50) return 'Warning';
    return 'Critical';
  };
  
  // Force run a diagnostic
  const runDiagnostic = () => {
    logError('Running manual GuardianShield diagnostic', ErrorLevel.INFO, 'GuardianShieldPanel');
    refresh();
    setRefreshCounter(prev => prev + 1);
  };
  
  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>GuardianShield</CardTitle>
          <Badge variant={state.isActive ? "default" : "destructive"}>
            {state.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <CardDescription>
          Continuous error prevention and code duplication detection system
        </CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues">
              Issues {(validationIssues.length + duplicationIssues.length > 0) && 
                <Badge variant="destructive" className="ml-2">
                  {validationIssues.length + duplicationIssues.length}
                </Badge>
              }
            </TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-4">
          <TabsContent value="overview">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">System Health</span>
                  <span className="text-xs">{getHealthLabel()} ({healthPercentage.toFixed(0)}%)</span>
                </div>
                <Progress value={healthPercentage} className={`h-2 ${getHealthColor()}`} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded p-3">
                  <h3 className="text-sm font-medium mb-1">Active Systems</h3>
                  <div className="space-y-1">
                    {state.activeSystems.length > 0 ? (
                      state.activeSystems.map((system, index) => (
                        <Badge key={index} className="mr-1 mb-1">{system}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">No active systems</span>
                    )}
                  </div>
                </div>
                
                <div className="border rounded p-3">
                  <h3 className="text-sm font-medium mb-1">Statistics</h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Validations:</span>
                      <span>{state.signalValidationsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recoveries:</span>
                      <span>{state.errorRecoveryCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Update:</span>
                      <span>{state.lastReport ? new Date(state.lastReport.timestamp).toLocaleTimeString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="issues">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Type Validation Issues</h3>
                <div className="rounded border overflow-hidden">
                  {validationIssues.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto p-2">
                      {validationIssues.map((issue, index) => (
                        <div key={index} className="border-b last:border-0 py-2 text-xs">
                          <div className="font-medium">{issue.path}:{issue.line}</div>
                          <div className="text-gray-500">{issue.message}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No type validation issues detected
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Duplication Issues</h3>
                <div className="rounded border overflow-hidden">
                  {duplicationIssues.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto p-2">
                      {duplicationIssues.map((issue, index) => (
                        <div key={index} className="border-b last:border-0 py-2 text-xs">
                          <div className="font-medium">
                            {issue.type} duplication ({Math.round(issue.similarity * 100)}%)
                          </div>
                          <div className="text-gray-500">
                            <span className="block">Path: {issue.path}</span>
                            <span className="block">Duplicate of: {issue.duplicateOf}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No duplication issues detected
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="reports">
            <div className="space-y-4">
              <div className="border rounded p-4">
                {state.lastReport ? (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">Timestamp:</div>
                      <div>{new Date(state.lastReport.timestamp).toLocaleString()}</div>
                      
                      <div className="font-medium">Signal Validations:</div>
                      <div>
                        {state.lastReport.signalValidations.total} total, 
                        {state.lastReport.signalValidations.issues} issues 
                        ({(state.lastReport.signalValidations.issueRate * 100).toFixed(1)}%)
                      </div>
                      
                      <div className="font-medium">Error Recovery:</div>
                      <div>
                        {state.lastReport.errorRecovery.attempts} attempts, 
                        {state.lastReport.errorRecovery.successes} successes 
                        ({(state.lastReport.errorRecovery.successRate * 100).toFixed(1)}%)
                      </div>
                      
                      <div className="font-medium">Duplication Issues:</div>
                      <div>
                        {state.lastReport.duplicationIssues.detected} detected, 
                        {state.lastReport.duplicationIssues.prevented} prevented
                      </div>
                    </div>
                    
                    {Object.keys(state.lastReport.duplicationIssues.detailsByType).length > 0 && (
                      <div className="mt-2">
                        <div className="font-medium">Duplication Types:</div>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          {Object.entries(state.lastReport.duplicationIssues.detailsByType).map(([type, count], idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{type}:</span>
                              <span>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-500">
                    No report available yet
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="flex justify-between">
        <div className="text-xs text-gray-500">
          Last refreshed: {new Date().toLocaleTimeString()} (#{refreshCounter})
        </div>
        <Button size="sm" onClick={runDiagnostic}>
          Run Diagnostic
        </Button>
      </CardFooter>
    </Card>
  );
}
