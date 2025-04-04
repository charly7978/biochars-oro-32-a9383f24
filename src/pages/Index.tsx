
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MonitoringButton from '@/components/MonitoringButton';
import { ActivitySquare } from 'lucide-react';

const Index: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Sistema de Monitorización</h1>
        <MonitoringButton />
      </div>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Bienvenido al Sistema</CardTitle>
          <CardDescription>
            Plataforma de monitoreo y análisis de señales en tiempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Utilice el botón "Sistema de Monitoreo" para acceder al panel de monitorización 
            completo donde podrá visualizar datos detallados sobre el procesamiento de señales,
            redes neuronales, detección de dedos y sistemas de optimización.
          </p>
        </CardContent>
        <CardFooter>
          <MonitoringButton className="mt-4" />
        </CardFooter>
      </Card>
    </div>
  );
};

export default Index;
