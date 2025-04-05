
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SystemDiagnosticsProps {
  vitalSigns: any;
  peakDetectionDiagnostics: any[];
}

const SystemDiagnostics: React.FC<SystemDiagnosticsProps> = ({
  vitalSigns,
  peakDetectionDiagnostics
}) => {
  // Reference ranges for vital signs
  const spo2References = {
    normal: { min: 95, max: 100, label: "Normal" },
    mild: { min: 90, max: 94, label: "Hipoxia leve" },
    moderate: { min: 85, max: 89, label: "Hipoxia moderada" },
    severe: { min: 0, max: 84, label: "Hipoxia severa" }
  };

  const bpReferences = {
    normal: { sys: { min: 90, max: 120 }, dia: { min: 60, max: 80 }, label: "Normal" },
    elevated: { sys: { min: 121, max: 129 }, dia: { min: 60, max: 80 }, label: "Elevada" },
    hypertension1: { sys: { min: 130, max: 139 }, dia: { min: 80, max: 89 }, label: "Hipertensión 1" },
    hypertension2: { sys: { min: 140, max: 999 }, dia: { min: 90, max: 999 }, label: "Hipertensión 2" },
    hypotenion: { sys: { min: 0, max: 89 }, dia: { min: 0, max: 59 }, label: "Hipotensión" }
  };

  const glucoseReferences = {
    hypoglycemia: { min: 0, max: 70, label: "Hipoglucemia" },
    normal: { min: 71, max: 99, label: "Normal" },
    prediabetes: { min: 100, max: 125, label: "Prediabetes" },
    diabetes: { min: 126, max: 999, label: "Diabetes" }
  };

  // Get status for each vital sign based on references
  const getSpo2Status = (value: number) => {
    if (value >= spo2References.normal.min) return { status: "normal", label: spo2References.normal.label };
    if (value >= spo2References.mild.min) return { status: "warning", label: spo2References.mild.label };
    if (value >= spo2References.moderate.min) return { status: "error", label: spo2References.moderate.label };
    return { status: "critical", label: spo2References.severe.label };
  };

  const getGlucoseStatus = (value: number) => {
    if (value >= glucoseReferences.diabetes.min) return { status: "error", label: glucoseReferences.diabetes.label };
    if (value >= glucoseReferences.prediabetes.min) return { status: "warning", label: glucoseReferences.prediabetes.label };
    if (value >= glucoseReferences.normal.min) return { status: "normal", label: glucoseReferences.normal.label };
    return { status: "critical", label: glucoseReferences.hypoglycemia.label };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "normal": return <Badge className="bg-green-600">Normal</Badge>;
      case "warning": return <Badge className="bg-yellow-600">Advertencia</Badge>;
      case "error": return <Badge className="bg-orange-600">Alerta</Badge>;
      case "critical": return <Badge className="bg-red-600">Crítico</Badge>;
      default: return <Badge className="bg-gray-600">Desconocido</Badge>;
    }
  };

  return (
    <div className="space-y-2">
      <Card className="bg-gray-900 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Diagnóstico del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <div className="font-semibold mb-1 text-xs">Estado de Módulos:</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-green-900/50">PPG</Badge>
                <span>Activo</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-green-900/50">Latidos</Badge>
                <span>Activo</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-green-900/50">Signos Vitales</Badge>
                <span>Activo</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-green-900/50">Detección</Badge>
                <span>Activo</span>
              </div>
            </div>
          </div>

          {vitalSigns && (
            <div className="mt-2">
              <div className="font-semibold mb-1 text-xs">Datos Vitales:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="flex justify-between">
                    <span>SPO2:</span> 
                    {vitalSigns.spo2 > 0 && getStatusBadge(getSpo2Status(vitalSigns.spo2).status)}
                  </div>
                  <div>{vitalSigns.spo2 || "--"}%</div>
                  <div className="text-xs text-gray-400">
                    Ref: &gt;95% Normal, 90-94% Hipoxia leve
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between">
                    <span>Presión:</span>
                  </div> 
                  <div>{vitalSigns.pressure}</div>
                  <div className="text-xs text-gray-400">
                    Ref: 120/80 Normal
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between">
                    <span>Glucosa:</span>
                    {vitalSigns.glucose > 0 && getStatusBadge(getGlucoseStatus(vitalSigns.glucose).status)}
                  </div>
                  <div>{vitalSigns.glucose || "--"} mg/dL</div>
                  <div className="text-xs text-gray-400">
                    Ref: &lt;100 Normal, 100-125 Prediabetes
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between">
                    <span>Arritmia:</span>
                  </div>
                  <div>{vitalSigns.arrhythmiaStatus}</div>
                </div>
              </div>
            </div>
          )}

          {/* Display peak detection diagnostics */}
          {peakDetectionDiagnostics && peakDetectionDiagnostics.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold mb-1 text-xs">Diagnósticos de Detección:</div>
              <div className="max-h-24 overflow-y-auto text-xs">
                {peakDetectionDiagnostics.slice(-5).map((entry, index) => (
                  <div key={index} className="border-b border-gray-800 py-1">
                    <div className="flex justify-between">
                      <span className={`text-${entry.processingPriority === 'high' ? 'green' : entry.processingPriority === 'medium' ? 'yellow' : 'gray'}-400`}>
                        {entry.processingPriority}
                      </span>
                      <span className="text-gray-400">{entry.processTime.toFixed(2)}ms</span>
                    </div>
                    {entry.peakDetected && <span className="text-green-400">Pico detectado</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemDiagnostics;
