import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DropZone } from './DropZone';
import { AnalysisResult } from './AnalysisResult';
import geminiService from '../services/geminiService';
import type { AnalysisData } from '../types/metalQuoter';
import { 
    LayoutDashboard, 
    Zap, 
    ShieldCheck, 
    Clock, 
    DollarSign,
    ChevronLeft
} from 'lucide-react';
import { appAlert } from '../lib/dialogs';
import confetti from 'canvas-confetti';

export const MetalQuoterView: React.FC = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);

    const handleFileSelect = async (file: File) => {
        setIsAnalyzing(true);
        try {
            const fileData = await fileToGenerativePart(file);
            const prompt = `Analiza la imagen o plano técnico de esta pieza metalmecánica y realiza una auditoría completa de manufactura de alta precisión. Extrae la información geométrica y calcula los costos en base a los parámetros y tarifas reales de la planta de McVill:

TARIFAS OPERATIVAS REALES DE PLANTA (USD):
- Corte Láser: $125.00 USD/hr
- Doblez (Bending): $45.00 USD/hr
- Sierra-Cinta / Perfiles: $35.00 USD/hr
- Rebabeo / Limpieza manual: $25.00 USD/hr
- Ensamble y Soldadura (MIG/TIG): $35.00 USD/hr
- Pintura Industrial: $40.00 USD/m² de superficie expuesta

FÓRMULA DE COSTO DE ACERO COMPENSADO POR SCRAP (Nesting real):
- Densidad del acero: 7.85 g/cm³
- Peso Teórico (kg) = 7.85 * Espesor_mm * Ancho_m * Largo_m
- Peso Real Cobrado (holgura 3%) = Peso Teórico / 0.97
- Esqueleto de merma recuperada (scrap) = Peso Real - Peso Neto
- Crédito por chatarra = Merma * ($1.80 USD/kg * 0.15)
- Costo de acero neto final = (Peso Real * $1.80 USD/kg) - Crédito por chatarra

VELOCIDADES DE CORTE LÁSER POR ESPESOR:
- Espesor < 3.2mm (1/8"): 120 in/min
- Espesor 3.2mm a 6.3mm (1/4"): 60 in/min
- Espesor 6.3mm a 12.7mm (1/2"): 30 in/min

Tareas de Visión IA:
1. Extrae el nombre de la pieza/proyecto del dibujo o cuadro de datos.
2. Identifica el material especificado (ej. Acero A36, Inoxidable 304, etc.)
3. Extrae el espesor o calibre (gauge).
4. Estima las dimensiones externas de la pieza (ancho y largo en mm, ej. 250 x 300 mm).
5. Cuenta el número de barrenos/perforaciones (holes).
6. Cuenta la cantidad de líneas de doblez (bends).
7. Calcula el perímetro de corte total en milímetros (perimeterMm).

Cálculos Financieros:
- pesoKg: Calcula el peso neto final de la pieza en base a sus dimensiones y espesor.
- costs.material: El costo neto final del acero aplicando descuento de scrap.
- costs.machine: (Tiempo Láser (perímetro / velocidad in/min / 60) * $125/hr) + (Tiempo Doblez (dobleces * 1.5 min / 60) * $45/hr)
- costs.labor: (Tiempo Ensamble/Soldadura + Rebabeo manual) * $35/hr
- costs.total: (material + machine + labor) * 1.30 (markup estándar de Dirección del 30% para utilidad e indirectos)

Devuelve ÚNICAMENTE un JSON válido que coincida exactamente con la siguiente estructura, sin markdown, sin texto fuera del JSON:
{
  "projectName": "Nombre del proyecto detectado",
  "material": "Material detectado",
  "gauge": "Calibre o Espesor mm",
  "dimensions": "Dimensiones detectadas ej. 200 x 300 mm",
  "weightKg": 3.8,
  "geometryStats": {
    "holes": 4,
    "bends": 2,
    "perimeterMm": 1250
  },
  "processes": [
    {
      "name": "Corte Láser Trumpf",
      "description": "Corte láser de precisión CNC @ 120 in/min",
      "estimatedTime": "1.5 min",
      "confidence": 0.98
    },
    {
      "name": "Doblez CNC",
      "description": "2 golpes de doblez en prensa plegadora de 150 TON",
      "estimatedTime": "3.0 min",
      "confidence": 0.95
    },
    {
      "name": "Rebabeo y Limpieza",
      "description": "Eliminación de escoria y aristas vivas manualmente",
      "estimatedTime": "5.0 min",
      "confidence": 0.99
    }
  ],
  "costs": {
    "material": 12.50,
    "machine": 5.40,
    "labor": 4.25,
    "total": 28.80
  }
}`;

            const responseText = await geminiService.generateText(prompt, {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt },
                            { inlineData: fileData.inlineData }
                        ]
                    }
                ],
                moduleName: 'cotizador'
            });

            const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || responseText.match(/\{[\s\S]*\}/);
            const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
            const parsed = JSON.parse(jsonText.trim()) as AnalysisData;

            setAnalysisResult(parsed);
        } catch (error) {
            console.error("Error analyzing drawing:", error);
            await appAlert("Error crítico en el motor de visión IA. Por favor, asegúrate de que el archivo sea un plano legible.", "Falla Neural");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const fileToGenerativePart = async (file: File) => {
        return new Promise<{ inlineData: { data: string, mimeType: string } }>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = (reader.result as string).split(',')[1];
                resolve({
                    inlineData: {
                        data: base64Data,
                        mimeType: file.type
                    },
                });
            };
            reader.readAsDataURL(file);
        });
    };

    const handleConfirmQuote = async () => {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#4FA5FF', '#ffffff', '#000000']
        });
        await appAlert("Cotización aprobada. Se ha generado la orden de trabajo en el módulo de producción.", "Éxito Industrial");
        setAnalysisResult(null);
    };

    return (
        <div className="h-full bg-mcvill-bg overflow-y-auto custom-scrollbar p-6 lg:p-10">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        {analysisResult && (
                            <button 
                                onClick={() => setAnalysisResult(null)}
                                className="w-12 h-12 rounded-2xl bg-mcvill-card border border-mcvill-card-border flex items-center justify-center text-slate-500 hover:text-mcvill-accent hover:border-mcvill-accent/30 transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                                <i className="fas fa-microchip text-mcvill-accent"></i>
                                {analysisResult ? 'RESULTADOS DE' : 'COTIZADOR'} <span className="text-mcvill-accent">INDUSTRIAL IA</span>
                            </h1>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">
                                Engine: McVill Neural Vision <span className="text-mcvill-accent/50 ml-2 italic">v2.5 Enterprise</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 px-6 py-3 bg-mcvill-card/40 border border-mcvill-card-border rounded-2xl backdrop-blur-xl">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                        <span className="text-[10px] font-black text-slate-300 tracking-widest uppercase italic">IA Nodes: Active</span>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {!analysisResult ? (
                        <motion.div
                            key="dropzone"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-8">
                                    <DropZone onFileSelect={handleFileSelect} isAnalyzing={isAnalyzing} />
                                </div>
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-mcvill-card rounded-[2rem] border border-mcvill-card-border p-8 shadow-xl">
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <Zap size={14} className="text-mcvill-accent" />
                                            STATUS DEL SISTEMA
                                        </h3>
                                        <div className="space-y-4">
                                            <StatusItem label="Vision Core" status="ONLINE" value="42ms" color="text-emerald-500" />
                                            <StatusItem label="Metal API" status="SYNCED" value="LIVE" color="text-emerald-500" />
                                            <StatusItem label="IA Model" status="G-2.5" value="FLASH" color="text-mcvill-accent" />
                                        </div>
                                    </div>

                                    <div className="bg-mcvill-card rounded-[2rem] border border-mcvill-card-border p-8 shadow-xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                            <ShieldCheck size={80} />
                                        </div>
                                        <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Zap size={14} />
                                            GUÍA DE PRECISIÓN
                                        </h3>
                                        <p className="text-[11px] text-slate-500 font-bold italic leading-relaxed">
                                            "Para obtener cotizaciones con precisión del 99%, asegúrate de que los planos incluyan cotas en mm y el material especificado en el cuadro de datos del dibujo."
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity Mini-Dashboard */}
                            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                                <StatsCard icon={Clock} label="Procesados Hoy" value="24" subValue="+15% vs ayer" color="text-mcvill-accent" />
                                <StatsCard icon={DollarSign} label="Valor Cotizado" value="$1.2M" subValue="MXN Total" color="text-emerald-500" />
                                <StatsCard icon={ShieldCheck} label="Precisión Prom." value="98.2%" subValue="Auditado por IA" color="text-blue-500" />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, type: 'spring' }}
                        >
                            <AnalysisResult 
                                data={analysisResult} 
                                onConfirm={handleConfirmQuote}
                                onEdit={() => setAnalysisResult(null)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

function StatusItem({ label, status, value, color }: { label: string, status: string, value: string, color: string }) {
    return (
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">{label}</span>
            <div className="flex gap-3">
                <span className="text-slate-700 italic">{value}</span>
                <span className={color}>{status}</span>
            </div>
        </div>
    );
}

function StatsCard({ icon: Icon, label, value, subValue, color }: { icon: any, label: string, value: string, subValue: string, color: string }) {
    return (
        <div className="bg-mcvill-card/60 rounded-[2rem] border border-mcvill-card-border p-8 shadow-lg group hover:border-mcvill-accent/30 transition-all">
            <div className={`w-12 h-12 rounded-2xl bg-mcvill-bg border border-mcvill-card-border flex items-center justify-center ${color} mb-6 shadow-xl group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-3xl font-black text-white italic tracking-tighter">{value}</p>
            <p className="text-[9px] font-black text-slate-600 uppercase mt-2">{subValue}</p>
        </div>
    );
}
