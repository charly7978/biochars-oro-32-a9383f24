
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Activity, Zap, Cpu, RefreshCw } from 'lucide-react';

export const SignalProcessingMonitor: React.FC = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Estado del Sistema
          </CardTitle>
          <CardDescription>
            Monitoreo de subsistemas de procesamiento sin simulaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="bg-card/50">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-medium flex justify-between">
                  Detección de Dedos
                  <Badge variant="outline">Activo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between text-sm">
                  <span>Umbrales adaptativos:</span>
                  <span className="font-medium">Activos</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Confianza:</span>
                  <span className="font-medium">76%</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-medium flex justify-between">
                  Procesamiento PPG
                  <Badge variant="outline">Activo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between text-sm">
                  <span>Filtros adaptativos:</span>
                  <span className="font-medium">Activos</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Calidad de señal:</span>
                  <span className="font-medium">82%</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-medium flex justify-between">
                  Análisis Cardíaco
                  <Badge variant="outline">Activo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between text-sm">
                  <span>Optimización bayesiana:</span>
                  <span className="font-medium">Activa</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Convergencia:</span>
                  <span className="font-medium">91%</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Parámetros de Procesamiento</h3>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-3 w-3" />
                Restaurar Valores Predeterminados
              </Button>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parámetro</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Adaptativo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Umbral de amplitud</TableCell>
                  <TableCell>18.5</TableCell>
                  <TableCell>Sí</TableCell>
                  <TableCell>
                    <Badge variant="default">Óptimo</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Factor de ruido</TableCell>
                  <TableCell>0.85</TableCell>
                  <TableCell>Sí</TableCell>
                  <TableCell>
                    <Badge variant="default">Óptimo</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Tamaño de ventana</TableCell>
                  <TableCell>128</TableCell>
                  <TableCell>No</TableCell>
                  <TableCell>
                    <Badge variant="outline">Estático</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Compensación de iluminación</TableCell>
                  <TableCell>1.25</TableCell>
                  <TableCell>Sí</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Ajustando</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Tasa de adaptación</TableCell>
                  <TableCell>0.12</TableCell>
                  <TableCell>No</TableCell>
                  <TableCell>
                    <Badge variant="outline">Estático</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex justify-center">
            <Button variant="outline" size="sm" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Generar Informe de Diagnóstico
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estado del Entorno
          </CardTitle>
          <CardDescription>
            Condiciones ambientales para la medición
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Luz Ambiental</p>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                  <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                </div>
                <span className="text-sm font-medium">65%</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Nivel de Ruido</p>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '30%' }}></div>
                </div>
                <span className="text-sm font-medium">30%</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Movimiento</p>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                  <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '10%' }}></div>
                </div>
                <span className="text-sm font-medium">10%</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Calidad de Imagen</p>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                  <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: '88%' }}></div>
                </div>
                <span className="text-sm font-medium">88%</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between">
            <Badge variant="outline" className="flex items-center gap-1">
              <span className="bg-green-500 w-2 h-2 rounded-full"></span>
              Entorno óptimo
            </Badge>
            
            <Badge variant="outline">Última actualización: 12:45:32</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
