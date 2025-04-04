
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Layers, Check, X, AlertCircle, Activity, RefreshCw } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { logError, ErrorLevel } from '@/utils/debugUtils';

interface ModuleStatus {
  id: string;
  name: string;
  category: 'extraction' | 'processing' | 'detection' | 'analysis' | 'interface';
  status: 'active' | 'inactive' | 'error' | 'warning';
  health: number;
  uptime: number;
  lastUpdated: number;
  dependencies: string[];
  isExpanded?: boolean;
  details?: {
    processingTime?: number;
    memoryUsage?: number;
    errorCount?: number;
    responsiveness?: number;
  };
}

interface ModuleStatusPanelProps {
  refreshInterval?: number;
}

export const ModuleStatusPanel: React.FC<ModuleStatusPanelProps> = ({ 
  refreshInterval = 2000 
}) => {
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [showErrors, setShowErrors] = useState(true);
  
  // Cargar y actualizar estado de módulos
  useEffect(() => {
    const loadModules = () => {
      try {
        // Datos de estado de módulos simulados
        const moduleData: ModuleStatus[] = [
          {
            id: 'camera-module',
            name: 'Módulo de Cámara',
            category: 'extraction',
            status: 'active',
            health: 98,
            uptime: 345,
            lastUpdated: Date.now(),
            dependencies: ['device-api'],
            details: {
              processingTime: 5.2,
              memoryUsage: 12.5,
              errorCount: 0,
              responsiveness: 97.2
            }
          },
          {
            id: 'signal-processor',
            name: 'Procesador de Señal',
            category: 'processing',
            status: 'active',
            health: 100,
            uptime: 345,
            lastUpdated: Date.now(),
            dependencies: ['camera-module', 'tensorflow-model'],
            details: {
              processingTime: 8.7,
              memoryUsage: 18.3,
              errorCount: 0,
              responsiveness: 99.5
            }
          },
          {
            id: 'finger-detector',
            name: 'Detector de Dedos',
            category: 'detection',
            status: 'active',
            health: 95,
            uptime: 344,
            lastUpdated: Date.now(),
            dependencies: ['signal-processor', 'camera-module'],
            details: {
              processingTime: 12.3,
              memoryUsage: 22.1,
              errorCount: 2,
              responsiveness: 93.8
            }
          },
          {
            id: 'tensorflow-model',
            name: 'Modelo TensorFlow',
            category: 'analysis',
            status: 'active',
            health: 92,
            uptime: 342,
            lastUpdated: Date.now(),
            dependencies: ['wasm-runtime'],
            details: {
              processingTime: 18.5,
              memoryUsage: 45.7,
              errorCount: 1,
              responsiveness: 90.2
            }
          },
          {
            id: 'calibration-system',
            name: 'Sistema de Calibración',
            category: 'processing',
            status: 'active',
            health: 96,
            uptime: 340,
            lastUpdated: Date.now(),
            dependencies: ['tensorflow-model', 'signal-processor'],
            details: {
              processingTime: 7.8,
              memoryUsage: 14.2,
              errorCount: 0,
              responsiveness: 98.7
            }
          },
          {
            id: 'rhythm-detector',
            name: 'Detector de Patrones Rítmicos',
            category: 'analysis',
            status: 'active',
            health: 94,
            uptime: 332,
            lastUpdated: Date.now(),
            dependencies: ['signal-processor'],
            details: {
              processingTime: 14.5,
              memoryUsage: 28.9,
              errorCount: 3,
              responsiveness: 91.5
            }
          },
          {
            id: 'data-storage',
            name: 'Almacenamiento de Datos',
            category: 'interface',
            status: 'warning',
            health: 85,
            uptime: 345,
            lastUpdated: Date.now(),
            dependencies: [],
            details: {
              processingTime: 22.3,
              memoryUsage: 33.8,
              errorCount: 5,
              responsiveness: 87.4
            }
          },
          {
            id: 'environmental-detector',
            name: 'Detector Ambiental',
            category: 'detection',
            status: 'warning',
            health: 78,
            uptime: 280,
            lastUpdated: Date.now(),
            dependencies: ['camera-module'],
            details: {
              processingTime: 9.2,
              memoryUsage: 11.5,
              errorCount: 8,
              responsiveness: 76.9
            }
          },
          {
            id: 'wasm-runtime',
            name: 'Runtime WebAssembly',
            category: 'processing',
            status: 'error',
            health: 45,
            uptime: 120,
            lastUpdated: Date.now() - 180000,
            dependencies: [],
            details: {
              processingTime: 35.7,
              memoryUsage: 67.2,
              errorCount: 24,
              responsiveness: 42.8
            }
          },
          {
            id: 'worker-optimizer',
            name: 'Optimizador de Workers',
            category: 'processing',
            status: 'inactive',
            health: 0,
            uptime: 0,
            lastUpdated: Date.now() - 3600000,
            dependencies: ['wasm-runtime'],
            details: {
              processingTime: 0,
              memoryUsage: 0,
              errorCount: 0,
              responsiveness: 0
            }
          },
        ];
        
        setModules(moduleData);
        setIsLoading(false);
        
        logError("Estado de módulos cargado", ErrorLevel.INFO, "ModuleStatusPanel");
      } catch (error) {
        logError(
          `Error cargando estado de módulos: ${error}`,
          ErrorLevel.ERROR,
          "ModuleStatusPanel"
        );
        setIsLoading(false);
      }
    };
    
    // Cargar inicialmente
    loadModules();
    
    // Actualizar periódicamente
    const intervalId = setInterval(() => {
      // Simular actualizaciones con cambios aleatorios
      setModules(prev => prev.map(module => {
        // No cambiar módulos inactivos
        if (module.status === 'inactive') return module;
        
        // Simular pequeñas fluctuaciones en salud y detalles
        const healthChange = Math.random() * 6 - 3;
        let newHealth = module.health + healthChange;
        newHealth = Math.max(0, Math.min(100, newHealth));
        
        // Cambiar estado si la salud cambia significativamente
        let newStatus = module.status;
        if (newHealth < 50 && module.status !== 'error') {
          newStatus = 'error';
        } else if (newHealth < 80 && newHealth >= 50 && module.status !== 'warning') {
          newStatus = 'warning';
        } else if (newHealth >= 80 && module.status !== 'active') {
          newStatus = 'active';
        }
        
        // Actualizar detalles
        const details = module.details ? {
          processingTime: module.details.processingTime + (Math.random() * 2 - 1),
          memoryUsage: module.details.memoryUsage + (Math.random() * 4 - 2),
          errorCount: newStatus === 'error' 
            ? module.details.errorCount + 1 
            : module.details.errorCount,
          responsiveness: module.details.responsiveness + (Math.random() * 4 - 2)
        } : undefined;
        
        return {
          ...module,
          health: newHealth,
          status: newStatus as ModuleStatus['status'],
          uptime: module.status !== 'inactive' ? module.uptime + (refreshInterval / 1000) : 0,
          lastUpdated: Date.now(),
          details
        };
      }));
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval]);
  
  // Filtrar módulos según preferencias
  const filteredModules = modules.filter(module => {
    if (!showInactive && module.status === 'inactive') return false;
    if (!showWarnings && module.status === 'warning') return false;
    if (!showErrors && module.status === 'error') return false;
    return true;
  });
  
  // Manejar intentos de reinicio de módulos
  const handleRestartModule = (moduleId: string) => {
    try {
      // Simulación de reinicio
      toast({
        title: "Reiniciando módulo",
        description: `Solicitando reinicio del módulo ${moduleId}`
      });
      
      // Marcar como inactivo brevemente
      setModules(prev => prev.map(module => 
        module.id === moduleId 
          ? { ...module, status: 'inactive', health: 0 } 
          : module
      ));
      
      // Simular reinicio después de un breve retraso
      setTimeout(() => {
        setModules(prev => prev.map(module => 
          module.id === moduleId 
            ? { 
                ...module, 
                status: 'active', 
                health: 95, 
                lastUpdated: Date.now(),
                details: {
                  ...module.details,
                  errorCount: 0,
                  processingTime: module.details?.processingTime ? module.details.processingTime * 0.8 : 10,
                  responsiveness: 95
                }
              } 
            : module
        ));
        
        toast({
          title: "Módulo reiniciado",
          description: `El módulo ${moduleId} se ha reiniciado correctamente`
        });
        
        logError(`Módulo ${moduleId} reiniciado correctamente`, ErrorLevel.INFO, "ModuleStatusPanel");
      }, 2000);
    } catch (error) {
      logError(
        `Error reiniciando módulo ${moduleId}: ${error}`,
        ErrorLevel.ERROR,
        "ModuleStatusPanel"
      );
      
      toast({
        title: "Error",
        description: `No se pudo reiniciar el módulo ${moduleId}`,
        variant: "destructive"
      });
    }
  };
  
  // Expandir detalle de módulo
  const toggleModuleExpand = (moduleId: string) => {
    setModules(prev => prev.map(module => 
      module.id === moduleId 
        ? { ...module, isExpanded: !module.isExpanded } 
        : module
    ));
  };
  
  // Estado general del sistema
  const getSystemStatus = () => {
    const activeModules = modules.filter(m => m.status === 'active').length;
    const warningModules = modules.filter(m => m.status === 'warning').length;
    const errorModules = modules.filter(m => m.status === 'error').length;
    const totalModules = modules.length;
    
    const healthPercentage = modules.reduce((sum, m) => sum + m.health, 0) / totalModules;
    
    if (errorModules > 2) return { status: 'Crítico', variant: 'destructive' as const };
    if (errorModules > 0 || warningModules > 3) return { status: 'Advertencia', variant: 'warning' as const };
    if (warningModules > 0) return { status: 'Bueno', variant: 'secondary' as const };
    return { status: 'Óptimo', variant: 'default' as const };
  };
  
  const systemStatus = getSystemStatus();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado del Sistema</CardTitle>
          <CardDescription>
            Cargando información de módulos...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={45} className="w-full mt-4" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Estado Integral del Sistema
            </CardTitle>
            <Badge 
              variant={systemStatus.variant === 'warning' ? 'secondary' : systemStatus.variant}
            >
              {systemStatus.status}
            </Badge>
          </div>
          <CardDescription>
            Vista general de todos los módulos y subsistemas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="show-inactive" 
                  checked={showInactive} 
                  onCheckedChange={(checked) => setShowInactive(checked === true)} 
                />
                <label htmlFor="show-inactive" className="text-sm">Mostrar Inactivos</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="show-warnings" 
                  checked={showWarnings} 
                  onCheckedChange={(checked) => setShowWarnings(checked === true)} 
                />
                <label htmlFor="show-warnings" className="text-sm">Mostrar Advertencias</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="show-errors" 
                  checked={showErrors} 
                  onCheckedChange={(checked) => setShowErrors(checked === true)} 
                />
                <label htmlFor="show-errors" className="text-sm">Mostrar Errores</label>
              </div>
            </div>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Módulo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Salud</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Última Actualización</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModules.map(module => (
                    <React.Fragment key={module.id}>
                      <TableRow 
                        className={module.isExpanded ? "border-b-0" : ""} 
                        onClick={() => toggleModuleExpand(module.id)}
                      >
                        <TableCell className="font-medium">{module.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {module.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            module.status === 'active' ? 'default' : 
                            module.status === 'warning' ? 'secondary' :
                            module.status === 'error' ? 'destructive' :
                            'outline'
                          }>
                            {module.status === 'active' && <Check className="h-3 w-3 mr-1" />}
                            {module.status === 'error' && <X className="h-3 w-3 mr-1" />}
                            {module.status === 'warning' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {module.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={module.health} 
                              className="w-[60px]"
                              indicator={
                                module.health > 80 ? "bg-green-600" : 
                                module.health > 50 ? "bg-yellow-500" : 
                                "bg-red-600"
                              }
                            />
                            <span>{module.health.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {module.uptime > 0 
                            ? `${Math.floor(module.uptime / 60)}m ${Math.floor(module.uptime % 60)}s` 
                            : "Inactivo"}
                        </TableCell>
                        <TableCell>
                          {new Date(module.lastUpdated).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestartModule(module.id);
                            }}
                            disabled={module.status === 'inactive'}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reiniciar
                          </Button>
                        </TableCell>
                      </TableRow>
                      
                      {/* Detalles expandidos */}
                      {module.isExpanded && module.details && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 px-4 py-3">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Detalles del Módulo</h4>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Tiempo de Procesamiento</p>
                                  <p className="text-sm font-medium">{module.details.processingTime?.toFixed(2)} ms</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Uso de Memoria</p>
                                  <p className="text-sm font-medium">{module.details.memoryUsage?.toFixed(1)} MB</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Errores Detectados</p>
                                  <p className="text-sm font-medium">{module.details.errorCount}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Capacidad de Respuesta</p>
                                  <p className="text-sm font-medium">{module.details.responsiveness?.toFixed(1)}%</p>
                                </div>
                              </div>
                              
                              <div className="mt-2">
                                <h5 className="text-xs font-medium mb-1">Dependencias</h5>
                                <div className="flex flex-wrap gap-1">
                                  {module.dependencies.length > 0 ? (
                                    module.dependencies.map(dep => (
                                      <Badge key={dep} variant="outline" className="text-xs">
                                        {dep}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Sin dependencias</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  
                  {filteredModules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        No hay módulos que coincidan con los filtros seleccionados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {modules.some(m => m.status === 'error') && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Se han detectado módulos con errores. Revise el estado y considere reiniciarlos.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
