import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Activity, 
  TrendingDown, 
  AlertTriangle, 
  Cpu, 
  BatteryCharging, 
  Sparkles, 
  Gauge, 
  Wrench,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from '../lib/dialogs';
import { supabase } from '../lib/supabase';
import { aiService } from '../services/aiService';

export const EnergyMonitorView: React.FC = () => {
  const { config, isDarkMode } = useConfig();
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<'realtime' | 'analysis' | 'savings'>('realtime');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  
  // Mock Real-time machinery power metrics (in kW)
  const [machinery, setMachinery] = useState([
    { id: 'cnc-1', name: 'Torno CNC Mazak (ST-30)', type: 'CNC', currentPower: 45.2, status: 'high_load', activeHrs: 6.8 },
    { id: 'cnc-2', name: 'Fresadora CNC Haas (VF-3)', type: 'CNC', currentPower: 32.8, status: 'nominal', activeHrs: 5.2 },
    { id: 'laser-1', name: 'Cortadora Láser Amada (FL-3015)', type: 'Corte', currentPower: 98.4, status: 'high_load', activeHrs: 4.5 },
    { id: 'weld-1', name: 'Celda Soldadura Robótica TIG', type: 'Soldadura', currentPower: 12.5, status: 'nominal', activeHrs: 8.2 },
    { id: 'comp-1', name: 'Compresor de Aire Central', type: 'Soporte', currentPower: 18.0, status: 'nominal', activeHrs: 12.0 },
    { id: 'hvac-1', name: 'Sistema Extracción Humos', type: 'Soporte', currentPower: 22.1, status: 'warning', activeHrs: 14.5 }
  ]);

  // Real-time grid simulation metrics
  const [gridMetrics, setGridMetrics] = useState({
    totalConsumption: 229.0,
    peakDemand: 265.0,
    powerFactor: 0.94,
    co2Equivalent: 4.82, // Tons
    costToday: 4890 // MXN
  });

  useEffect(() => {
    const timer = setInterval(() => {
      // Simulate minor fluctuation
      setMachinery(prev => prev.map(m => {
        const delta = (Math.random() - 0.5) * 2.5;
        const nextVal = Math.max(5, Math.min(150, m.currentPower + delta));
        return {
          ...m,
          currentPower: parseFloat(nextVal.toFixed(1)),
          status: nextVal > 80 ? 'high_load' : nextVal > 20 ? 'nominal' : 'idle'
        };
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const total = machinery.reduce((acc, m) => acc + m.currentPower, 0);
    setGridMetrics(prev => ({
      ...prev,
      totalConsumption: parseFloat(total.toFixed(1)),
      peakDemand: Math.max(prev.peakDemand, total + 12),
      costToday: prev.costToday + Math.round((total / 1000) * 4.5)
    }));
  }, [machinery]);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    setAiResponse('');
    try {
      const dataSummary = `
        Planta Industrial: ${config.brandName}
        Consumo actual total: ${gridMetrics.totalConsumption} kW
        Factor de potencia actual: ${gridMetrics.powerFactor}
        Consumo hoy acumulado: $${gridMetrics.costToday} MXN
        Equipos en operación:
        ${machinery.map(m => `- ${m.name}: ${m.currentPower} kW, Estado: ${m.status}`).join('\n')}
      `;

      const prompt = `Analiza la carga eléctrica de la planta metalmecánica y proporciona 3 recomendaciones concretas basadas en el Agus Pro Standard para optimizar el consumo de energía (Peak-Shaving) y evitar penalizaciones de factor de potencia por la CFE/compañía eléctrica. Sé directo, técnico y conciso.`;

      const res = await aiService.askGemini(prompt, 'GENERAL', [], dataSummary);
      setAiResponse(res);
    } catch (e) {
      toast('Error al conectar con el cerebro de energía', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-mcvill-accent/20 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-mcvill-text flex items-center gap-2">
            <Zap className="text-mcvill-accent animate-pulse" size={24} />
            <span>Monitoreo de Energía IA</span>
          </h1>
          <p className="text-[10px] text-mcvill-accent font-black tracking-widest uppercase mt-1">
            Gestión Inteligente de Carga Eléctrica y Eficiencia Eléctrica CFE
          </p>
        </div>
        <div className="flex gap-2">
          {(['realtime', 'analysis', 'savings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                activeTab === tab 
                  ? 'bg-gradient-to-r from-mcvill-accent/20 to-mcvill-accent/5 border-mcvill-accent text-mcvill-text shadow-[0_0_15px_rgba(0,128,255,0.15)]'
                  : 'bg-transparent border-white/10 text-mcvill-text-muted hover:border-mcvill-accent/30 hover:text-mcvill-text'
              }`}
            >
              {tab === 'realtime' ? '📊 Carga en Vivo' : tab === 'analysis' ? '🤖 Optimización IA' : '💰 Ahorros CFE'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-mcvill-accent/5 rounded-full blur-2xl pointer-events-none" />
          <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">Demanda Total Actual</p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono tracking-tighter">
            {gridMetrics.totalConsumption} <span className="text-xs text-mcvill-accent">kW</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-green-400 font-bold">
            <Activity size={12} className="animate-pulse" />
            <span>Fluctuación normal del ±4.2%</span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/5 rounded-full blur-2xl pointer-events-none" />
          <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">Demanda Pico CFE</p>
          <p className="text-2xl sm:text-3xl font-black text-yellow-400 mt-1 font-mono tracking-tighter">
            {gridMetrics.peakDemand} <span className="text-xs">kW</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-yellow-400/60 font-bold">
            <AlertTriangle size={12} />
            <span>Pico registrado a las 11:32 AM</span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-400/5 rounded-full blur-2xl pointer-events-none" />
          <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">Factor de Potencia</p>
          <p className="text-2xl sm:text-3xl font-black text-green-400 mt-1 font-mono tracking-tighter">
            {gridMetrics.powerFactor} <span className="text-xs">FP</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-green-400/70 font-bold">
            <ShieldCheck size={12} />
            <span>A salvo de recargo (Meta &gt; 0.90)</span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 rounded-full blur-2xl pointer-events-none" />
          <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">Costo Eléctrico Hoy</p>
          <p className="text-2xl sm:text-3xl font-black text-cyan-400 mt-1 font-mono tracking-tighter">
            ${gridMetrics.costToday.toLocaleString('es-MX')} <span className="text-xs">MXN</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-cyan-400/70 font-bold">
            <TrendingDown size={12} />
            <span>Optimizado con Peak-Shaving</span>
          </div>
        </div>
      </div>

      {activeTab === 'realtime' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Machinery Grid */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2">
              <Cpu size={14} className="text-mcvill-accent" />
              <span>Consumo en Planta Eléctrica</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {machinery.map(m => (
                <div key={m.id} className="bg-slate-950/30 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-black text-white truncate max-w-[180px]">{m.name}</p>
                      <span className="text-[8px] bg-slate-900 border border-white/10 px-2 py-0.5 rounded-lg text-slate-500 font-black uppercase tracking-widest mt-1 inline-block">
                        {m.type}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                      m.status === 'high_load'
                        ? 'border-red-500/30 bg-red-500/10 text-red-400 animate-pulse'
                        : m.status === 'warning'
                          ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
                          : 'border-green-500/30 bg-green-500/10 text-green-400'
                    }`}>
                      {m.status === 'high_load' ? 'Carga Alta' : m.status === 'warning' ? 'Revisión' : 'Estable'}
                    </span>
                  </div>

                  <div className="mt-4 flex justify-between items-end border-t border-white/5 pt-3">
                    <div>
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Tiempo Activo</p>
                      <p className="text-xs font-bold text-slate-300 mt-0.5">{m.activeHrs} hrs / Turno</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Carga Instantánea</p>
                      <p className="text-lg font-black text-white font-mono">{m.currentPower} kW</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Load Factor Chart Mock */}
          <div className="bg-slate-950/40 border border-white/5 p-6 rounded-2xl space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2">
              <Gauge size={14} className="text-mcvill-accent" />
              <span>Distribución de Carga</span>
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase mb-1">
                  <span>CNC y Maquinado (43%)</span>
                  <span>78 kW</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                  <div className="bg-mcvill-accent h-full shadow-[0_0_8px_var(--theme-glow)]" style={{ width: '43%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase mb-1">
                  <span>Corte Láser & Fusión (38%)</span>
                  <span>98 kW</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                  <div className="bg-yellow-400 h-full shadow-[0_0_8px_rgba(250,204,21,0.6)]" style={{ width: '38%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase mb-1">
                  <span>Soldadura Robótica (12%)</span>
                  <span>12.5 kW</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                  <div className="bg-green-400 h-full shadow-[0_0_8px_rgba(74,222,128,0.6)]" style={{ width: '12%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase mb-1">
                  <span>Climatización & Servicios (7%)</span>
                  <span>40.1 kW</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                  <div className="bg-slate-700 h-full" style={{ width: '7%' }} />
                </div>
              </div>
            </div>

            <div className="bg-mcvill-accent/5 border border-mcvill-accent/20 rounded-xl p-4 text-[10px] leading-relaxed text-slate-300">
              💡 <strong>Recomendación CFE:</strong> El pico máximo está cerca de los <strong>270kW</strong> contratados. Se recomienda desfasar el inicio de la Cortadora Láser para evitar recargos por demanda facturable en periodos punta.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="bg-slate-950/40 border border-white/5 p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-[0.25em] text-white flex items-center gap-2">
              <Sparkles size={16} className="text-mcvill-accent" />
              <span>Cerebro Neural de Energía</span>
            </h2>
            <button
              onClick={handleAIAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-gradient-to-r from-mcvill-accent to-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-mcvill-accent/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isAnalyzing ? 'Procesando...' : 'Analizar Planta en Tiempo Real'}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            Gemini 2.5 analiza los perfiles de carga instantáneos de tus CNCs, sistemas de climatización e iluminación y los cruza contra la tarifa GDMTH de CFE para formular horarios y secuencias de encendido inteligentes (Peak-Shaving).
          </p>

          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Activity size={24} className="text-mcvill-accent animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Calculando algoritmos de peak-shaving...</p>
            </div>
          )}

          {!isAnalyzing && aiResponse && (
            <div className="bg-slate-950/50 border border-mcvill-accent/20 p-5 rounded-2xl leading-relaxed text-sm text-slate-200 whitespace-pre-line border-l-4 border-l-mcvill-accent">
              {aiResponse}
            </div>
          )}

          {!isAnalyzing && !aiResponse && (
            <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-10 text-center text-xs text-slate-500 font-bold uppercase tracking-widest">
              Haz clic en "Analizar Planta en Tiempo Real" para que el orquestador IA analice el perfil de carga y tarifas.
            </div>
          )}
        </div>
      )}

      {activeTab === 'savings' && (
        <div className="bg-slate-950/40 border border-white/5 p-6 rounded-2xl space-y-6">
          <h2 className="text-sm font-black uppercase tracking-[0.25em] text-white flex items-center gap-2">
            <BatteryCharging size={16} className="text-mcvill-accent animate-pulse" />
            <span>Retorno de Inversión y Ahorros de Planta</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Ahorro Estimado Mensual</p>
              <p className="text-xl font-black text-green-400 mt-1 font-mono">$18,450 MXN</p>
              <p className="text-[9px] text-slate-500 mt-1 leading-snug">Reducción del 14.5% en la factura eléctrica del periodo GDMTH.</p>
            </div>
            <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Penalización FP Evitada</p>
              <p className="text-xl font-black text-green-400 mt-1 font-mono">$4,890 MXN</p>
              <p className="text-[9px] text-slate-500 mt-1 leading-snug">Banco de capacitores optimizado y monitor de factor de potencia continuo.</p>
            </div>
            <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Huella de CO2 Mitigada</p>
              <p className="text-xl font-black text-emerald-400 mt-1 font-mono">1.8 Tons / Mes</p>
              <p className="text-[9px] text-slate-500 mt-1 leading-snug">Reducción equivalente al consumo de energía limpia optimizado.</p>
            </div>
          </div>

          <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-300">Auditorías Energéticas Programadas</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">Inspección de Banco de Capacitores</p>
                  <p className="text-[10px] text-slate-500">Revisión de reactivos y factor de potencia.</p>
                </div>
                <span className="text-[9px] px-2 py-0.5 border border-green-500/20 bg-green-500/10 text-green-400 rounded-lg font-black uppercase tracking-widest">Realizado</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">Prueba Termográfica en Subestación Principal</p>
                  <p className="text-[10px] text-slate-500">Monitoreo de calentamiento en acometida y transformador.</p>
                </div>
                <span className="text-[9px] px-2 py-0.5 border border-yellow-400/20 bg-yellow-400/10 text-yellow-300 rounded-lg font-black uppercase tracking-widest">En agenda</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnergyMonitorView;
