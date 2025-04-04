
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';

const Index = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Sistema de Procesamiento de Señales</h1>
        <Link to="/diagnostics">
          <Button variant="outline" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Diagnóstico Avanzado
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Sistema de Monitoreo</h2>
          <p className="text-gray-600 mb-4">
            Sistema avanzado de procesamiento de señales PPG para la detección y análisis de latidos cardíacos en tiempo real.
          </p>
          <p className="text-gray-600">
            Utilice la pantalla de diagnóstico para visualizar el flujo de datos a través del sistema.
          </p>
        </div>
        
        <div className="border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Características Principales</h2>
          <ul className="space-y-2 text-gray-600">
            <li>• Procesamiento de señales PPG en tiempo real</li>
            <li>• Detección avanzada de latidos cardíacos</li>
            <li>• Análisis de arritmias y patrones</li>
            <li>• Optimización neural de señales</li>
            <li>• Diagnóstico completo del flujo de datos</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Index;
