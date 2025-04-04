
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle, File, RefreshCw, Info, AlertTriangle, X, Download } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { 
  getErrorLogs, 
  clearErrorLogs, 
  ErrorLevel,
  getErrorBuffer,
  clearErrorBuffer,
  LogEntry
} from '@/utils/debugUtils';

export const ErrorLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<ErrorLevel | 'all'>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'logs' | 'stats'>('logs');
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Cargar logs inicialmente y configurar actualización automática
  useEffect(() => {
    const loadLogs = () => {
      try {
        // Obtener logs del sistema
        const errorLogs = getErrorBuffer();
        setLogs(errorLogs);
        
        // Extraer módulos únicos para el filtro
        const modules = Array.from(new Set(errorLogs
          .filter(log => log.moduleId || log.module)
          .map(log => log.moduleId || log.module as string)
        ));
        setAvailableModules(modules);
      } catch (error) {
        console.error("Error al cargar logs:", error);
      }
    };
    
    // Cargar inicialmente
    loadLogs();
    
    // Configurar actualización automática
    let intervalId: number | undefined;
    
    if (autoRefresh) {
      intervalId = window.setInterval(loadLogs, 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh]);
  
  // Aplicar filtros cuando cambian
  useEffect(() => {
    let filtered = [...logs];
    
    // Filtrar por nivel
    if (filterLevel !== 'all') {
      const levelIndex = Object.values(ErrorLevel).indexOf(filterLevel);
      filtered = filtered.filter(log => {
        const logLevelIndex = Object.values(ErrorLevel).indexOf(log.level);
        return logLevelIndex >= levelIndex;
      });
    }
    
    // Filtrar por módulo
    if (filterModule !== 'all') {
      filtered = filtered.filter(log => log.moduleId === filterModule || log.module === filterModule);
    }
    
    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(query) ||
        ((log.moduleId || log.module) && (log.moduleId?.toLowerCase().includes(query) || log.module?.toLowerCase().includes(query)))
      );
    }
    
    setFilteredLogs(filtered);
  }, [logs, filterLevel, filterModule, searchQuery]);
  
  // Refrescar logs manualmente
  const handleRefresh = () => {
    try {
      const errorLogs = getErrorBuffer();
      setLogs(errorLogs);
      toast({
        title: "Logs actualizados",
        description: `${errorLogs.length} entradas cargadas`
      });
    } catch (error) {
      console.error("Error al actualizar logs:", error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los logs",
        variant: "destructive"
      });
    }
  };
  
  // Limpiar logs
  const handleClearLogs = () => {
    try {
      clearErrorBuffer();
      setLogs([]);
      setFilteredLogs([]);
      toast({
        title: "Logs limpiados",
        description: "Todos los logs han sido eliminados"
      });
    } catch (error) {
      console.error("Error al limpiar logs:", error);
      toast({
        title: "Error",
        description: "No se pudieron limpiar los logs",
        variant: "destructive"
      });
    }
  };
  
  // Exportar logs
  const handleExportLogs = () => {
    try {
      const logData = JSON.stringify(filteredLogs, null, 2);
      const blob = new Blob([logData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-logs-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Logs exportados",
        description: `${filteredLogs.length} entradas guardadas en archivo JSON`
      });
    } catch (error) {
      console.error("Error al exportar logs:", error);
      toast({
        title: "Error",
        description: "No se pudieron exportar los logs",
        variant: "destructive"
      });
    }
  };
  
  // Colores para niveles de log
  const getLevelColor = (level: ErrorLevel) => {
    switch (level) {
      case ErrorLevel.DEBUG: return "bg-gray-100 text-gray-800";
      case ErrorLevel.INFO: return "bg-blue-100 text-blue-800";
      case ErrorLevel.WARN:
      case ErrorLevel.WARNING: return "bg-yellow-100 text-yellow-800";
      case ErrorLevel.ERROR: return "bg-red-100 text-red-800";
      case ErrorLevel.CRITICAL: return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  // Ícono para nivel de log
  const getLevelIcon = (level: ErrorLevel) => {
    switch (level) {
      case ErrorLevel.DEBUG: return <File className="h-3 w-3" />;
      case ErrorLevel.INFO: return <Info className="h-3 w-3" />;
      case ErrorLevel.WARN:
      case ErrorLevel.WARNING: return <AlertTriangle className="h-3 w-3" />;
      case ErrorLevel.ERROR: return <AlertCircle className="h-3 w-3" />;
      case ErrorLevel.CRITICAL: return <X className="h-3 w-3" />;
      default: return <File className="h-3 w-3" />;
    }
  };
  
  // Estadísticas de logs
  const logStats = {
    totalCount: logs.length,
    byLevel: {
      [ErrorLevel.DEBUG]: logs.filter(log => log.level === ErrorLevel.DEBUG).length,
      [ErrorLevel.INFO]: logs.filter(log => log.level === ErrorLevel.INFO).length,
      [ErrorLevel.WARN]: logs.filter(log => log.level === ErrorLevel.WARN || log.level === ErrorLevel.WARNING).length,
      [ErrorLevel.ERROR]: logs.filter(log => log.level === ErrorLevel.ERROR).length,
      [ErrorLevel.CRITICAL]: logs.filter(log => log.level === ErrorLevel.CRITICAL).length,
    },
    byModule: availableModules.reduce((acc, module) => {
      acc[module] = logs.filter(log => log.moduleId === module || log.module === module).length;
      return acc;
    }, {} as Record<string, number>),
    mostRecentError: logs.filter(log => log.level === ErrorLevel.ERROR || log.level === ErrorLevel.CRITICAL)
      .sort((a, b) => b.timestamp - a.timestamp)[0],
    mostFrequentModule: availableModules.length > 0 
      ? availableModules.sort((a, b) => {
          const countA = logs.filter(log => log.moduleId === a || log.module === a).length;
          const countB = logs.filter(log => log.moduleId === b || log.module === b).length;
          return countB - countA;
        })[0]
      : undefined,
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Visor de Logs
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearLogs}>
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportLogs} disabled={filteredLogs.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </div>
        </div>
        <CardDescription>
          Monitoreo de logs y eventos del sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as 'logs' | 'stats')}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="stats">Estadísticas</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Actualización automática:</span>
              <RadioGroup 
                value={autoRefresh ? 'on' : 'off'} 
                onValueChange={(v) => setAutoRefresh(v === 'on')}
                className="flex"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="on" id="auto-on" />
                  <Label htmlFor="auto-on" className="text-xs">ON</Label>
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <RadioGroupItem value="off" id="auto-off" />
                  <Label htmlFor="auto-off" className="text-xs">OFF</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <TabsContent value="logs" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search-logs">Buscar en logs:</Label>
                <Input 
                  id="search-logs" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar mensaje o módulo..."
                />
              </div>
              
              <div>
                <Label htmlFor="filter-level">Nivel:</Label>
                <Select 
                  value={filterLevel} 
                  onValueChange={(value) => setFilterLevel(value as ErrorLevel | 'all')}
                >
                  <SelectTrigger id="filter-level" className="w-[140px]">
                    <SelectValue placeholder="Nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los niveles</SelectItem>
                    <SelectItem value={ErrorLevel.DEBUG}>{ErrorLevel.DEBUG}</SelectItem>
                    <SelectItem value={ErrorLevel.INFO}>{ErrorLevel.INFO}</SelectItem>
                    <SelectItem value={ErrorLevel.WARN}>{ErrorLevel.WARN}</SelectItem>
                    <SelectItem value={ErrorLevel.ERROR}>{ErrorLevel.ERROR}</SelectItem>
                    <SelectItem value={ErrorLevel.CRITICAL}>{ErrorLevel.CRITICAL}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="filter-module">Módulo:</Label>
                <Select 
                  value={filterModule} 
                  onValueChange={setFilterModule}
                >
                  <SelectTrigger id="filter-module" className="w-[180px]">
                    <SelectValue placeholder="Módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los módulos</SelectItem>
                    {availableModules.map(module => (
                      <SelectItem key={module} value={module}>
                        {module}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="border rounded-md">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead className="w-[100px]">Nivel</TableHead>
                      <TableHead className="w-[150px]">Módulo</TableHead>
                      <TableHead>Mensaje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length > 0 ? (
                      // Ordenar por timestamp descendente para mostrar los más recientes primero
                      [...filteredLogs]
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((log, index) => (
                          <TableRow key={`${log.timestamp}-${index}`}>
                            <TableCell className="font-mono text-xs">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`flex gap-1 items-center ${getLevelColor(log.level)}`}
                              >
                                {getLevelIcon(log.level)}
                                {log.level}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {log.moduleId || log.module || 'N/A'}
                            </TableCell>
                            <TableCell className="max-w-md break-words">
                              {log.message}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No hay logs que coincidan con los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
            
            <div className="text-sm text-muted-foreground text-right">
              Mostrando {filteredLogs.length} de {logs.length} entradas
            </div>
          </TabsContent>
          
          <TabsContent value="stats">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">Distribución por Nivel</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2">
                      {Object.entries(logStats.byLevel).map(([level, count]) => (
                        <div key={level} className="flex justify-between items-center">
                          <Badge 
                            variant="outline" 
                            className={getLevelColor(level as ErrorLevel)}
                          >
                            {level}
                          </Badge>
                          <span className="font-mono text-sm">{count}</span>
                        </div>
                      ))}
                      <div className="border-t mt-2 pt-2 flex justify-between items-center font-medium">
                        <span>Total</span>
                        <span className="font-mono">{logStats.totalCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">Principales Módulos</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2">
                      {Object.entries(logStats.byModule)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([module, count]) => (
                          <div key={module} className="flex justify-between items-center">
                            <span className="text-sm truncate max-w-[150px]">{module}</span>
                            <span className="font-mono text-sm">{count}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">Resumen</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total de entradas:</span>
                        <span className="font-medium ml-2">{logStats.totalCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Módulo más activo:</span>
                        <span className="font-medium ml-2">{logStats.mostFrequentModule || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Errores:</span>
                        <span className="font-medium ml-2">{logStats.byLevel[ErrorLevel.ERROR]}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Críticos:</span>
                        <span className="font-medium ml-2">{logStats.byLevel[ErrorLevel.CRITICAL]}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {logStats.mostRecentError && (
                <Card className="border-red-200">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Error más reciente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Badge 
                          variant="outline" 
                          className={getLevelColor(logStats.mostRecentError.level)}
                        >
                          {logStats.mostRecentError.level}
                        </Badge>
                        <span className="text-sm font-mono">
                          {new Date(logStats.mostRecentError.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Módulo:</span>
                        <span className="text-sm ml-2">{logStats.mostRecentError.moduleId || logStats.mostRecentError.module || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Mensaje:</span>
                        <p className="text-sm mt-1">{logStats.mostRecentError.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
