import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Wrench, 
  AlertTriangle, 
  TrendingUp, 
  Sliders, 
  CheckCircle, 
  Sparkles, 
  ShieldAlert, 
  Clock, 
  Flame, 
  Wifi,
  LayoutGrid,
  Video,
  Eye,
  Tv
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from '../lib/dialogs';
import { aiService } from '../services/aiService';

export const PreventiveMaintenanceIAView: React.FC = () => {
  const { config } = useConfig();
  const { t } = useLanguage();
  
  const [activeMachineId, setActiveMachineId] = useState<string>('cnc-1');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [viewMode, setViewMode] = useState<'individual' | 'grid'>('grid');
  const [showCameras, setShowCameras] = useState<boolean>(true);
  
  // Real-time sensors simulation (vibration in mm/s and temperature in °C)
  const [machines, setMachines] = useState([
    { 
      id: 'cnc-1', 
      name: 'Torno CNC Mazak (ST-30)', 
      area: 'CNC',
      vibration: 2.1, 
      temperature: 42.5, 
      healthScore: 98,
      status: 'nominal',
      lastService: '2026-05-10',
      nextService: '2026-08-10',
      runtimeHrs: 4820
    },
    { 
      id: 'cnc-2', 
      name: 'Fresadora CNC Haas (VF-3)', 
      area: 'CNC',
      vibration: 5.8, // Slightly elevated vibration
      temperature: 58.2, // Slightly warm spindle
      healthScore: 84,
      status: 'warning',
      lastService: '2026-05-02',
      nextService: '2026-06-20',
      runtimeHrs: 6210
    },
    { 
      id: 'laser-1', 
      name: 'Cortadora Láser Amada (FL-3015)', 
      area: 'Corte',
      vibration: 1.2, 
      temperature: 28.4, 
      healthScore: 99,
      status: 'nominal',
      lastService: '2026-05-15',
      nextService: '2026-08-15',
      runtimeHrs: 2100
    },
    { 
      id: 'weld-1', 
      name: 'Soldadora TIG Miller', 
      area: 'Soldadura',
      vibration: 8.4, // Elevated vibration (cooling fan imbalance)
      temperature: 74.8, // Critical temperature
      healthScore: 61,
      status: 'critical',
      lastService: '2026-04-18',
      nextService: '2026-05-30',
      runtimeHrs: 8940
    }
  ]);

  // Simulated Camera Feeds with public loop streams
  const machineCams: Record<string, { url: string; label: string; area: string }> = {
    'cnc-1': { url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/bottles-detection.mp4', label: 'Cámara 01 — Mazak Spindle Monitor', area: 'Zona de Corte CNC' },
    'cnc-2': { url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/bottles-detection.mp4', label: 'Cámara 02 — Haas VF-3 Interna', area: 'Cámara Estanca CNC' },
    'laser-1': { url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/bottles-detection.mp4', label: 'Cámara 03 — Cabezal Fibra Láser', area: 'Mesa de Corte Láser' },
    'weld-1': { url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/bottles-detection.mp4', label: 'Cámara 04 — Célula Soldadura Miller', area: 'Célula de Soldadura' }
  };

  // Simulate fluctuations
  useEffect(() => {
    const timer = setInterval(() => {
      setMachines(prev => prev.map(m => {
        const vibDelta = (Math.random() - 0.5) * 0.4;
        const tempDelta = (Math.random() - 0.5) * 1.5;
        const nextVib = parseFloat(Math.max(0.5, m.vibration + vibDelta).toFixed(1));
        const nextTemp = parseFloat(Math.max(20, m.temperature + tempDelta).toFixed(1));
        
        let score = 100 - Math.round((nextVib * 3) + ((nextTemp - 30) * 0.5));
        score = Math.max(10, Math.min(100, score));

        let nextStatus: 'nominal' | 'warning' | 'critical' = 'nominal';
        if (score < 70) nextStatus = 'critical';
        else if (score < 90) nextStatus = 'warning';

        return {
          ...m,
          vibration: nextVib,
          temperature: nextTemp,
          healthScore: score,
          status: nextStatus
        };
      }));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const activeMachine = machines.find(m => m.id === activeMachineId) || machines[0];

  const handlePredictiveAnalysis = async () => {
    setIsAnalyzing(true);
    setAiResponse('');
    try {
      const summary = `
        Planta: ${config.brandName}
        Máquina: ${activeMachine.name}
        Área: ${activeMachine.area}
        Vibración Spindle: ${activeMachine.vibration} mm/s (Límite ISO 10816: 4.5 mm/s)
        Temperatura de Rodamientos: ${activeMachine.temperature} °C (Límite: 65 °C)
        Horas de uso totales: ${activeMachine.runtimeHrs} hrs
        Health Score calculado: ${activeMachine.healthScore}%
        Estado actual: ${activeMachine.status}
      `;

      const prompt = `Actúa como un experto en análisis predictivo y vibracional IATF 16949/ISO 9001. Analiza los sensores actuales de esta máquina y formula un diagnóstico de desgaste mecánico de baleros/husillo, recomendando qué herramientas o lubricantes usar y cuándo intervenir. Responde en español de forma técnica, estructurada y convincente en base al Agus Pro Standard.`;

      const res = await aiService.askGemini(prompt, 'GENERAL', [], summary);
      setAiResponse(res);
    } catch (e) {
      toast('Error de conexión con el núcleo predictivo', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title with Mode Selector */}
      <div className="border-b border-mcvill-accent/20 pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-mcvill-text flex items-center gap-2">
            <Wrench className="text-mcvill-accent animate-pulse" size={24} />
            <span>Mantenimiento Predictivo IA</span>
          </h1>
          <p className="text-[10px] text-mcvill-accent font-black tracking-widest uppercase mt-1">
            Análisis Vibracional y Térmico de Husillos y Rodamientos en Vivo (ISO 10816)
          </p>
        </div>
        
        {/* Toggle Mode */}
        <div className="flex bg-slate-900 border border-white/10 rounded-xl p-1 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
              viewMode === 'grid' 
                ? 'bg-mcvill-accent text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid size={12} />
            <span>Ver Tablero Completo</span>
          </button>
          <button
            onClick={() => setViewMode('individual')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
              viewMode === 'individual' 
                ? 'bg-mcvill-accent text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv size={12} />
            <span>Ficha de Diagnóstico</span>
          </button>
        </div>
      </div>

      {/* Grid Mode View */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-950/40 border border-white/5 p-4 rounded-2xl">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Monitoreo General de Activos
              </h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                Sensores de Planta Activos y Visión Computacional IA Integrada
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showCameras} 
                  onChange={(e) => setShowCameras(e.target.checked)}
                  className="rounded border-white/10 bg-slate-900 text-mcvill-accent focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Habilitar Cámaras IA en Vivo</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {machines.map(m => {
              const cam = machineCams[m.id];
              return (
                <div 
                  key={m.id} 
                  className={`bg-slate-950/40 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                    m.status === 'critical'
                      ? 'border-red-500/30 hover:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                      : m.status === 'warning'
                        ? 'border-yellow-400/30 hover:border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                        : 'border-white/5 hover:border-mcvill-accent/30 hover:shadow-[0_0_15px_rgba(79,165,255,0.05)]'
                  }`}
                >
                  {/* Status Indicator Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    m.status === 'critical' ? 'bg-red-500' : m.status === 'warning' ? 'bg-yellow-400' : 'bg-green-400'
                  }`} />

                  {/* Header */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-xs font-bold text-white truncate">{m.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shrink-0 ${
                        m.status === 'critical'
                          ? 'border-red-500/30 bg-red-500/10 text-red-400 animate-pulse'
                          : m.status === 'warning'
                            ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
                            : 'border-green-500/30 bg-green-500/10 text-green-400'
                      }`}>
                        {m.status === 'critical' ? 'Crítico' : m.status === 'warning' ? 'Precaución' : 'Estable'}
                      </span>
                    </div>
                    <p className="text-[8px] text-slate-500 uppercase tracking-widest font-black">{m.area}</p>
                  </div>

                  {/* Health Score Circular Gauge */}
                  <div className="my-6 flex justify-center items-center gap-4">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-800"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="transparent"
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={m.status === 'critical' ? 'text-red-500' : m.status === 'warning' ? 'text-yellow-400' : 'text-green-400'}
                          strokeWidth="3.5"
                          strokeDasharray={`${m.healthScore}, 100`}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute text-xs font-black text-white">{m.healthScore}%</div>
                    </div>
                    <div className="text-left space-y-1">
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold block">Salud General</span>
                      <span className="text-[10px] text-slate-300 font-bold">
                        {m.status === 'critical' ? 'Riesgo Alto' : m.status === 'warning' ? 'Desviación' : 'Estable'}
                      </span>
                    </div>
                  </div>

                  {/* Telemetry numbers */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-white/5 text-[10px] mb-4">
                    <div>
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Vibración</p>
                      <p className={`font-mono font-black mt-0.5 ${m.vibration > 4.5 ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                        {m.vibration} mm/s
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Temp Spindle</p>
                      <p className={`font-mono font-black mt-0.5 ${m.temperature > 65 ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                        {m.temperature} °C
                      </p>
                    </div>
                  </div>

                  {/* Camera Monitor Loop */}
                  {showCameras && (
                    <div className="mb-4 rounded-xl border border-white/5 overflow-hidden bg-black relative aspect-video group">
                      <video
                        src={cam.url}
                        className="w-full h-full object-cover opacity-80"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                      
                      {/* Scanline and TV static overlay effects */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent pointer-events-none opacity-40" />
                      <div className="absolute left-0 right-0 h-[2px] bg-mcvill-accent/20 animate-[pulse_2s_infinite] pointer-events-none" />

                      {/* Dynamic Bounding Box Overlays */}
                      {m.status === 'critical' && (
                        <div className="absolute inset-0 border-2 border-red-500/80 animate-pulse pointer-events-none flex flex-col justify-between p-2">
                          <div className="flex justify-between items-start">
                            <span className="bg-red-500 text-white font-black text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded leading-none">
                              [!] CRITICAL ANOMALY
                            </span>
                            <span className="text-red-400 font-mono text-[7px] font-bold">WARN: ROTATION FAULT</span>
                          </div>
                          
                          {/* Target rect selector simulation */}
                          <div className="w-10 h-10 border-2 border-red-500 absolute top-1/4 left-1/3 animate-pulse">
                            <span className="absolute -top-3 left-0 text-[6px] font-bold text-red-500 bg-black/70 px-0.5">SPINDLE</span>
                          </div>

                          <div className="text-right">
                            <span className="text-red-400 font-mono text-[7px] font-bold">VIB LIMIT EXCEEDED</span>
                          </div>
                        </div>
                      )}

                      {m.status === 'warning' && (
                        <div className="absolute inset-0 border border-yellow-400/80 pointer-events-none flex flex-col justify-between p-2">
                          <div className="flex justify-between items-start">
                            <span className="bg-yellow-400 text-slate-950 font-black text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded leading-none">
                              [*] WARNING DETECTED
                            </span>
                            <span className="text-yellow-300 font-mono text-[7px] font-bold">TEMP HIGH</span>
                          </div>

                          <div className="w-8 h-8 border border-dashed border-yellow-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <span className="absolute -top-3 left-0 text-[6px] font-bold text-yellow-400 bg-black/70 px-0.5">RODAMIENTO</span>
                          </div>

                          <div className="text-right">
                            <span className="text-yellow-300 font-mono text-[7px] font-bold">PRE-FAIL PARAMETER</span>
                          </div>
                        </div>
                      )}

                      {m.status === 'nominal' && (
                        <div className="absolute inset-0 border border-green-500/20 pointer-events-none flex flex-col justify-between p-2">
                          <div className="flex justify-between items-start">
                            <span className="bg-green-500/20 text-green-400 border border-green-500/40 font-black text-[7px] uppercase tracking-widest px-1 py-0.5 rounded leading-none">
                              [+] FEED ACTIVE
                            </span>
                            <span className="text-green-400 font-mono text-[7px]">SCANNING OK</span>
                          </div>
                          
                          <div className="w-10 h-10 border border-green-500/20 absolute top-1/3 left-1/4">
                            <span className="absolute -top-3 left-0 text-[6px] text-green-400 bg-black/70 px-0.5">ESTABLE</span>
                          </div>

                          <div className="text-right">
                            <span className="text-green-400 font-mono text-[7px] font-bold">NOMINAL</span>
                          </div>
                        </div>
                      )}

                      {/* Camera Info Tag */}
                      <div className="absolute bottom-1.5 left-1.5 bg-black/85 px-2 py-0.5 rounded text-[7px] font-mono text-slate-400 uppercase tracking-widest border border-white/5">
                        {cam.label}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <button
                    onClick={() => {
                      setActiveMachineId(m.id);
                      setViewMode('individual');
                      setAiResponse('');
                    }}
                    className="w-full py-2.5 bg-white/5 hover:bg-mcvill-accent/20 border border-white/5 hover:border-mcvill-accent/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye size={12} />
                    <span>Ver Ficha de Análisis IA</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Individual View */}
      {viewMode === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Machine List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Activos en Monitoreo
              </h2>
              <div className="flex items-center gap-1.5 text-[9px] text-green-400 font-bold uppercase">
                <Wifi className="animate-pulse" size={10} />
                <span>Sensores en Línea</span>
              </div>
            </div>

            <div className="space-y-3">
              {machines.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveMachineId(m.id);
                    setAiResponse('');
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    activeMachineId === m.id
                      ? 'bg-gradient-to-r from-mcvill-accent/15 to-transparent border-mcvill-accent shadow-[0_0_15px_rgba(0,128,255,0.1)]'
                      : 'bg-slate-950/30 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-bold text-white truncate max-w-[170px]">{m.name}</h3>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mt-0.5">{m.area}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                      m.status === 'critical'
                        ? 'border-red-500/30 bg-red-500/10 text-red-400 animate-pulse'
                        : m.status === 'warning'
                          ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
                          : 'border-green-500/30 bg-green-500/10 text-green-400'
                    }`}>
                      {m.status === 'critical' ? 'Crítico' : m.status === 'warning' ? 'Precaución' : 'Estable'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-[10px]">
                    <div>
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Vibración</p>
                      <p className="font-bold text-slate-300 mt-0.5 font-mono">{m.vibration} mm/s</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Spindle Temp</p>
                      <p className="font-bold text-slate-300 mt-0.5 font-mono">{m.temperature} °C</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Salud</p>
                      <p className={`font-black mt-0.5 ${
                        m.healthScore > 90 ? 'text-green-400' : m.healthScore > 70 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{m.healthScore}%</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Sensor Dashboard */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-950/40 border border-white/5 p-6 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-white/5">
                <div>
                  <span className="text-[9px] bg-slate-900 border border-white/10 px-2 py-0.5 rounded-lg text-mcvill-accent font-black uppercase tracking-widest">
                    Ficha Técnica de Diagnóstico
                  </span>
                  <h2 className="text-sm font-black text-white uppercase mt-1">{activeMachine.name}</h2>
                </div>
                <div className="flex gap-4 text-xs font-mono">
                  <div className="text-slate-500 font-bold uppercase tracking-widest">
                    Uso Acumulado: <span className="text-white font-black">{activeMachine.runtimeHrs} hrs</span>
                  </div>
                </div>
              </div>

              {/* Sensor Panel & Inline Camera */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vibration Indicator */}
                <div className="bg-slate-950/50 p-4 border border-white/5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                      <Activity size={14} className="text-mcvill-accent" />
                      Espectro de Vibración
                    </span>
                    <span className="text-xs font-black text-white font-mono">{activeMachine.vibration} mm/s</span>
                  </div>
                  <div className="h-16 flex items-end gap-1 px-2 border-b border-white/10 pb-1">
                    {/* Wave Mockup */}
                    {Array.from({ length: 20 }).map((_, i) => {
                      const factor = activeMachine.status === 'critical' ? 1.0 : activeMachine.status === 'warning' ? 0.7 : 0.3;
                      const height = Math.round((Math.sin(i * 0.8) + 1.2) * 20 * factor + Math.random() * 8);
                      return (
                        <div 
                          key={i} 
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            activeMachine.status === 'critical' ? 'bg-red-500' : activeMachine.status === 'warning' ? 'bg-yellow-400' : 'bg-mcvill-accent'
                          }`} 
                          style={{ height: `${Math.max(4, Math.min(60, height))}px` }} 
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-500 uppercase tracking-widest font-black">
                    <span>Spindle X-Axis</span>
                    <span>Límite ISO: 4.5 mm/s</span>
                  </div>
                </div>

                {/* Temperature Indicator */}
                <div className="bg-slate-950/50 p-4 border border-white/5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                      <Flame size={14} className="text-yellow-400" />
                      Termografía Rodamientos
                    </span>
                    <span className="text-xs font-black text-white font-mono">{activeMachine.temperature} °C</span>
                  </div>
                  <div className="space-y-2 py-4">
                    <div className="w-full bg-slate-900 rounded-full h-3 border border-white/5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          activeMachine.status === 'critical' ? 'bg-red-500' : activeMachine.status === 'warning' ? 'bg-yellow-400' : 'bg-green-400'
                        }`}
                        style={{ width: `${Math.min(100, (activeMachine.temperature / 85) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-500 uppercase tracking-widest font-black">
                      <span>Temp Crítica: 65 °C</span>
                      <span>Máx Operativo: 80 °C</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inline Active CCTV Camera Monitor (Only if enabled) */}
              {showCameras && (
                <div className="bg-slate-950/50 p-4 border border-white/5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                      <Video size={14} className="text-mcvill-accent" />
                      Monitoreo de Cámara IA en Vivo
                    </span>
                    <span className="text-[9px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
                      Transmisión Activa
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/5 overflow-hidden bg-black relative aspect-video">
                    <video
                      src={machineCams[activeMachine.id].url}
                      className="w-full h-full object-cover opacity-80"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                    
                    <div className="absolute inset-0 bg-scanline pointer-events-none opacity-20" />
                    
                    {/* Bounding box dynamic simulation */}
                    <div className="absolute inset-4 border border-dashed border-mcvill-accent/30 pointer-events-none flex flex-col justify-between p-3 font-mono text-[8px]">
                      <div className="flex justify-between items-start text-mcvill-accent">
                        <span>DETECCIÓN ÓPTICA IA ACTIVADA</span>
                        <span>FPS: 30.0</span>
                      </div>
                      <div className="text-right text-slate-400">
                        <span>RESOLUCIÓN: 1080P</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                    Canal: {machineCams[activeMachine.id].label} — {machineCams[activeMachine.id].area}
                  </p>
                </div>
              )}

              {/* AI Diagnostics Box */}
              <div className="border-t border-white/5 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.25em] text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-mcvill-accent" />
                    <span>Análisis de Desgaste Mecánico IA</span>
                  </h3>
                  <button
                    onClick={handlePredictiveAnalysis}
                    disabled={isAnalyzing}
                    className="px-4 py-2 bg-gradient-to-r from-mcvill-accent to-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-mcvill-accent/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isAnalyzing ? 'Calculando Diagnóstico...' : 'Predecir Desgaste Spindle'}
                  </button>
                </div>

                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Activity size={20} className="text-mcvill-accent animate-pulse" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Analizando FFT (Transformada Rápida de Fourier)...</p>
                  </div>
                )}

                {!isAnalyzing && aiResponse && (
                  <div className="bg-slate-950/50 border border-mcvill-accent/20 p-5 rounded-2xl text-xs sm:text-sm text-slate-200 whitespace-pre-line border-l-4 border-l-mcvill-accent leading-relaxed">
                    {aiResponse}
                  </div>
                )}

                {!isAnalyzing && !aiResponse && (
                  <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-6 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Haz clic en "Predecir Desgaste Spindle" para procesar las lecturas vibracionales en el modelo predictivo.
                  </div>
                )}
              </div>

              {/* Scheduled Preventative Actions */}
              <div className="border-t border-white/5 pt-6 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones de Mantenimiento</h4>
                <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-300">
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                    <p className="text-slate-500 font-bold uppercase tracking-widest">Último Mantenimiento Preventivo</p>
                    <p className="text-xs font-bold text-white mt-1">{activeMachine.lastService}</p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                    <p className="text-slate-500 font-bold uppercase tracking-widest">Próxima Intervención en Agenda</p>
                    <p className="text-xs font-bold text-yellow-400 mt-1">{activeMachine.nextService}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreventiveMaintenanceIAView;
