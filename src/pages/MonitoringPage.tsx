import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Zap, Layers, Fingerprint } from 'lucide-react';

const MonitoringPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Sistema de Monitoreo Integral</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Panel de Control</CardTitle>
          <CardDescription>
            Monitoreo en tiempo real sin simulaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="no-simulation" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="no-simulation" className="flex gap-2 items-center">
                <Activity className="w-4 h-4" />
                <span>Sin Simulación</span>
              </TabsTrigger>
              <TabsTrigger value="signals" className="flex gap-2 items-center">
                <Layers className="w-4 h-4" />
                <span>Señales</span>
              </TabsTrigger>
              <TabsTrigger value="finger" className="flex gap-2 items-center">
                <Fingerprint className="w-4 h-4" />
                <span>Detección</span>
              </TabsTrigger>
              <TabsTrigger value="optimization" className="flex gap-2 items-center">
                <Zap className="w-4 h-4" />
                <span>Estado</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="no-simulation">
              <div className="text-center py-12 text-muted-foreground">
                Sistema de monitoreo sin simulaciones
              </div>
            </TabsContent>

            
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonitoringPage;
