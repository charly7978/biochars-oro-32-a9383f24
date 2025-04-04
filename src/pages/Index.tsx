
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from '@/components/ui/data-table';
import MonitoringButton from '@/components/MonitoringButton';

const Index: React.FC = () => {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Sistema de Monitoreo Biométrico</h1>
          <MonitoringButton />
        </div>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Panel de Control</CardTitle>
            <CardDescription>Visualiza y controla el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="dashboard">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="settings">Configuración</TabsTrigger>
                <TabsTrigger value="logs">Registros</TabsTrigger>
              </TabsList>
              <TabsContent value="dashboard">
                <div className="py-4">
                  <p>Contenido del dashboard aquí</p>
                </div>
              </TabsContent>
              <TabsContent value="settings">
                <div className="py-4">
                  <p>Configuración del sistema aquí</p>
                </div>
              </TabsContent>
              <TabsContent value="logs">
                <div className="py-4">
                  <p>Registros de actividad aquí</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
