import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Factory, Route, CalendarDays, Package, 
  Camera, Zap, Cpu, Sparkles, Shield, Clock, Terminal,
  ExternalLink, ArrowRight, Play, Pause, Activity, ChevronRight
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { useLanguage } from '../contexts/LanguageContext';

interface PortadaViewProps {
  setView: (view: string) => void;
  onToggleChat?: () => void;
  onOpenVoice?: () => void;
}

export const PortadaView: React.FC<PortadaViewProps> = ({ setView, onToggleChat, onOpenVoice }) => {
  const { config } = useConfig();
  const { t } = useLanguage();
  const [time, setTime] = useState(new Date());
  const [isMuted, setIsMuted] = useState(true);
  const [systemLogs, setSystemLogs] = useState<string[]>([
    'Iniciando Orquestador Raíz McVill...',
    'Conexión con Supabase DB establecida [OK]',
    'Red Neuronal de Inspección Visual lista en celdas 1-4',
    'Sensores de vibración CNC enviando telemetría',
    'Voice Link procesador conversacional activo'
  ]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // System logs simulation
  useEffect(() => {
    const logInterval = setInterval(() => {
      const logs = [
        'Inspección IA: Tasa de acierto del modelo de calidad en 99.8%',
        'Monitoreo CCTV: Canal 2 [Área de Soldadura] - Sin incidentes activos',
        'Consumo de Energía: Estabilizado en 185 KWh/t',
        'Licitaciones RFQ: 3 nuevas requisiciones recibidas en Kanban',
        'Mantenimiento Predictivo: Trumpf Laser calibración exitosa',
        'Sincronización de Base de Datos: Latencia 12ms',
        'Orquestador Raíz: Ejecutando auto-curación de caché [OK]'
      ];
      const randomLog = `[${new Date().toLocaleTimeString()}] ${logs[Math.floor(Math.random() * logs.length)]}`;
      setSystemLogs(prev => [randomLog, ...prev.slice(0, 4)]);
    }, 4000);
    return () => clearInterval(logInterval);
  }, []);

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      {/* ── HEADER DE BIENVENIDA PREMIUM ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-950/40 border border-mcvill-accent/20 backdrop-blur relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-mcvill-accent/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-mcvill-accent/20 border border-mcvill-accent/40 text-[9px] font-black text-mcvill-accent uppercase tracking-widest animate-pulse">
              ● Sistema de Control Maestro
            </span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">
            Bienvenido al Portal de Mando {config.brandName}
          </h1>
          <p className="text-xs text-slate-400">
            Orquestador predictivo y visual para manufactura pesada y metalmecánica.
          </p>
        </div>

        {/* Live Clock Widget */}
        <div className="relative z-10 flex items-center gap-4 bg-slate-950/60 border border-white/5 rounded-2xl p-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center text-mcvill-accent">
            <Clock size={20} className="animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-white tracking-widest font-mono">
              {formatTime(time)}
            </p>
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">
              {formatDate(time)}
            </p>
          </div>
        </div>
      </div>

      {/* ── MAIN PORTADA CONTAINER: CINEMATIC FEED & SYSTEM TELEMETRY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2/3: Live CCTV Cinematic Video Feed */}
        <div className="lg:col-span-2 rounded-3xl bg-slate-950/40 border border-mcvill-accent/20 backdrop-blur p-4 relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-slate-950/40 pointer-events-none z-10" />
          
          {/* Header Indicators */}
          <div className="relative z-10 flex items-center justify-between p-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-[9px] font-black uppercase text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CCTV Planta: En Línea
            </div>
            <span className="text-[9px] font-mono text-slate-400 px-2 py-1 rounded-xl bg-slate-950/80 border border-white/5">
              CAMARA 02: ÁREA DE SOLDADURA
            </span>
          </div>

          {/* YouTube Cinematic Live Loop */}
          <div className="absolute inset-0 w-full h-full pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-700">
            <iframe
              src="https://www.youtube.com/embed/wxx7A63LpSo?autoplay=1&mute=1&controls=0&loop=1&playlist=wxx7A63LpSo&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3"
              title="Industrial Live Loop"
              className="w-full h-[300%] -translate-y-1/3 scale-[1.3] object-cover"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>

          {/* Placeholder/Fallback container height to hold space */}
          <div className="h-64 lg:h-80" />

          {/* Footer Overlays */}
          <div className="relative z-10 p-2 space-y-3">
            <div className="max-w-md bg-slate-950/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                <Camera size={13} className="text-mcvill-accent" />
                Control de Videovigilancia Activo
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Monitoreo continuo asistido por IA para detección en caliente de fallas de EPP e intrusiones en celdas de soldadura automatizada Trumpf.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button 
                  onClick={() => setView('seguridad')}
                  className="px-3 py-1.5 rounded-xl bg-mcvill-accent text-[9px] font-black text-slate-950 uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-1 shadow-[0_0_12px_var(--theme-glow)]"
                >
                  Ver Todas las Cámaras <ArrowRight size={10} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1/3: Real-Time Telemetry & Systems Terminal */}
        <div className="rounded-3xl bg-slate-950/40 border border-mcvill-accent/20 backdrop-blur p-5 flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Title */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Terminal size={15} className="text-mcvill-accent" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Telemetría y Diagnóstico</h3>
              </div>
              <Activity size={13} className="text-emerald-400 animate-pulse" />
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">OEE Promedio</p>
                <p className="text-lg font-black text-white tracking-tight mt-1">84.6%</p>
                <div className="w-full bg-slate-900 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-mcvill-accent h-full shadow-[0_0_6px_var(--theme-glow)]" style={{ width: '84.6%' }} />
                </div>
              </div>
              <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tasa de Scrap</p>
                <p className="text-lg font-black text-emerald-400 tracking-tight mt-1">1.62%</p>
                <div className="w-full bg-slate-900 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full" style={{ width: '30%' }} />
                </div>
              </div>
            </div>

            {/* Live Terminal Log */}
            <div className="space-y-2">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Consola Orquestador</span>
              <div className="bg-black/40 border border-white/5 rounded-2xl p-3 font-mono text-[9px] text-slate-400 space-y-2 max-h-40 overflow-y-auto">
                {systemLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-mcvill-accent shrink-0 font-black">❯</span>
                    <span className="truncate">{log}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Quick AI Diagnostics Button */}
          <div className="pt-4 border-t border-white/5 mt-4 space-y-2">
            <div className="flex items-center gap-2 text-mcvill-accent text-[9px] font-black uppercase tracking-widest bg-mcvill-accent/10 border border-mcvill-accent/30 rounded-xl p-2.5">
              <Zap size={12} className="animate-pulse" />
              <span>Orquestador: Estado Óptimo</span>
            </div>
          </div>

        </div>

      </div>

      {/* ── OPERATIONAL FLOW WORKSPACE: 5 KEY MILESTONES ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-mcvill-accent" />
          <h2 className="text-[10px] font-black text-white uppercase tracking-[0.25em]">Flujo Operativo de Planta</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          
          {/* Milestone 1: Tablero */}
          <div 
            onClick={() => setView('dashboard')}
            className="group cursor-pointer rounded-2xl p-4 bg-slate-950/40 border border-white/5 hover:border-mcvill-accent/30 hover:bg-mcvill-accent/5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-mcvill-accent group-hover:border-mcvill-accent/30 group-hover:scale-105 transition-all">
              <LayoutDashboard size={16} />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mt-4">1. Tablero</h3>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              Cockpit ejecutivo y telemetría OEE.
            </p>
            <ChevronRight size={14} className="absolute bottom-4 right-4 text-slate-600 group-hover:text-mcvill-accent transition-colors" />
          </div>

          {/* Milestone 2: Planeación */}
          <div 
            onClick={() => setView('planeacion')}
            className="group cursor-pointer rounded-2xl p-4 bg-slate-950/40 border border-white/5 hover:border-mcvill-accent/30 hover:bg-mcvill-accent/5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-mcvill-accent group-hover:border-mcvill-accent/30 group-hover:scale-105 transition-all">
              <CalendarDays size={16} />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mt-4">2. Planeación</h3>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              Demanda, calendario y asignación.
            </p>
            <ChevronRight size={14} className="absolute bottom-4 right-4 text-slate-600 group-hover:text-mcvill-accent transition-colors" />
          </div>

          {/* Milestone 3: Inventarios */}
          <div 
            onClick={() => setView('inventory')}
            className="group cursor-pointer rounded-2xl p-4 bg-slate-950/40 border border-white/5 hover:border-mcvill-accent/30 hover:bg-mcvill-accent/5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-mcvill-accent group-hover:border-mcvill-accent/30 group-hover:scale-105 transition-all">
              <Package size={16} />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mt-4">3. Inventarios</h3>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              Materia prima y resguardo.
            </p>
            <ChevronRight size={14} className="absolute bottom-4 right-4 text-slate-600 group-hover:text-mcvill-accent transition-colors" />
          </div>

          {/* Milestone 4: Viajeros */}
          <div 
            onClick={() => setView('viajeros')}
            className="group cursor-pointer rounded-2xl p-4 bg-slate-950/40 border border-white/5 hover:border-mcvill-accent/30 hover:bg-mcvill-accent/5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-mcvill-accent group-hover:border-mcvill-accent/30 group-hover:scale-105 transition-all">
              <Route size={16} />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mt-4">4. Viajeros</h3>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              Procesos de ruteo y hojas viajeras.
            </p>
            <ChevronRight size={14} className="absolute bottom-4 right-4 text-slate-600 group-hover:text-mcvill-accent transition-colors" />
          </div>

          {/* Milestone 5: Planta */}
          <div 
            onClick={() => setView('production')}
            className="group cursor-pointer rounded-2xl p-4 bg-slate-950/40 border border-white/5 hover:border-mcvill-accent/30 hover:bg-mcvill-accent/5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-mcvill-accent group-hover:border-mcvill-accent/30 group-hover:scale-105 transition-all">
              <Factory size={16} />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mt-4">5. Planta</h3>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              Corte, mecanizado, forja y control.
            </p>
            <ChevronRight size={14} className="absolute bottom-4 right-4 text-slate-600 group-hover:text-mcvill-accent transition-colors" />
          </div>

        </div>
      </div>

    </div>
  );
};
