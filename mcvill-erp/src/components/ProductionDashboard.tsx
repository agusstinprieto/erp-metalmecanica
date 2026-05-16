import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle,
  Zap,
  Activity,
  Factory,
  ChevronRight,
  Gauge,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { productionService } from '../services/productionService';
import { eventBus } from '../utils/eventBus';
import clsx from 'clsx';

const mockDailyData = [
  { name: 'LUN', efficiency: 82, quality: 98, production: 450 },
  { name: 'MAR', efficiency: 85, quality: 99, production: 520 },
  { name: 'MIE', efficiency: 78, quality: 97, production: 380 },
  { name: 'JUE', efficiency: 91, quality: 99, production: 610 },
  { name: 'VIE', efficiency: 88, quality: 98, production: 580 },
  { name: 'SAB', efficiency: 84, quality: 99, production: 420 },
];

const bottleneckData = [
  { center: 'LASER', delay: 12, efficiency: 85, color: '#4FA5FF' },
  { center: 'DOBLEZ', delay: 28, efficiency: 65, color: '#f59e0b' },
  { center: 'SOLDADURA', delay: 5, efficiency: 92, color: '#10b981' },
  { center: 'PINTURA', delay: 18, efficiency: 72, color: '#6366f1' },
  { center: 'ENSAMBLE', delay: 2, efficiency: 98, color: '#4FA5FF' },
];

export const ProductionDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // In a real scenario, fetch real stats from Supabase
    setTimeout(() => {
      setStats({
        oee: 84.5,
        availability: 88,
        performance: 96,
        quality: 99.2,
        activeTravelers: 124,
        pendingJobs: 45,
        dailyProduction: 582
      });
      setLoading(false);
    }, 1000);

    // 🚀 IA.AGUS: Escuchar alertas de calidad en tiempo real
    const unsub = eventBus.subscribe('QUALITY_EVENT', (data) => {
      setAlerts(prev => [data, ...prev].slice(0, 5)); // Mantener las últimas 5
    });

    return unsub;
  }, []);

  const MetricCard = ({ title, value, subtext, icon: Icon, trend }: any) => (
    <div className="cyber-panel p-6 bg-white/5 border-mcvill-card-border relative overflow-hidden group hover:border-mcvill-accent/30 transition-all">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={48} />
      </div>
      <div className="flex flex-col gap-4">
        <div className="w-12 h-12 rounded-2xl bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center text-mcvill-accent">
          <Icon size={22} />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
            {trend && (
              <span className={clsx(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                trend > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">{subtext}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-1 w-8 bg-mcvill-accent rounded-full shadow-[0_0_10px_rgba(79,165,255,0.5)]" />
            <p className="text-[10px] font-black text-mcvill-accent uppercase tracking-[0.4em]">Intelligence Dashboard</p>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-tight">
            NÚCLEO DE <span className="text-mcvill-accent">PRODUCCIÓN</span>
          </h2>
        </div>
        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
          <Activity className="text-mcvill-accent animate-pulse" size={20} />
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sincronización</p>
            <p className="text-[10px] font-black text-white uppercase">Real-Time Cloud Active</p>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="OEE Global" 
          value={`${stats?.oee || 0}%`} 
          subtext="Efectividad de Equipo" 
          icon={Gauge} 
          trend={2.4} 
        />
        <MetricCard 
          title="Viajeros Activos" 
          value={stats?.activeTravelers || 0} 
          subtext="En Piso de Manufactura" 
          icon={Layers} 
          trend={12} 
        />
        <MetricCard 
          title="Prod. Diaria" 
          value={stats?.dailyProduction || 0} 
          subtext="Unidades Terminadas" 
          icon={Factory} 
          trend={-1.5} 
        />
        <MetricCard 
          title="Status Calidad" 
          value={`${stats?.quality || 0}%`} 
          subtext="First Pass Yield" 
          icon={ShieldCheck} 
          trend={0.8} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Production Trends Chart */}
        <div className="lg:col-span-2 cyber-panel p-8 bg-white/5 border-mcvill-card-border overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Tendencias de Manufactura</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Eficiencia vs Volumen Semanal</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-mcvill-accent shadow-[0_0_10px_rgba(79,165,255,0.4)]" />
                <span className="text-[9px] font-black text-slate-400 uppercase">Volumen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                <span className="text-[9px] font-black text-slate-400 uppercase">Eficiencia</span>
              </div>
            </div>
          </div>
          
          <div className="h-[300px] w-full overflow-hidden" style={{ minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <AreaChart data={mockDailyData}>
                <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4FA5FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4FA5FF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  fontWeight="bold"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '900',
                    textTransform: 'uppercase'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="production" 
                  stroke="#4FA5FF" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorProd)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="efficiency" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorEff)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottleneck Analysis */}
        <div className="cyber-panel p-8 bg-white/5 border-mcvill-card-border">
          <div className="mb-8">
            <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} /> Detector de Cuellos
            </h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Análisis de Retraso por Centro</p>
          </div>

          <div className="space-y-6">
            {bottleneckData.sort((a, b) => b.delay - a.delay).map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.center}</span>
                  <span className={clsx(
                    "text-[10px] font-black uppercase tracking-widest",
                    item.delay > 20 ? "text-rose-500" : "text-amber-500"
                  )}>+{item.delay}H Retraso</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000" 
                    style={{ 
                      width: `${item.efficiency}%`, 
                      backgroundColor: item.color,
                      boxShadow: `0 0 10px ${item.color}50`
                    }} 
                  />
                </div>
                <div className="flex justify-between text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                  <span>Eficiencia: {item.efficiency}%</span>
                  <span>Capacidad: Optimizada</span>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-10 p-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-mcvill-accent hover:text-slate-950 hover:border-transparent transition-all flex items-center justify-center gap-2">
            Ver Plan de Mitigación <ChevronRight size={14} />
          </button>
        </div>

      </div>

      {/* Active Traveler Status Table - Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 cyber-panel p-8 bg-white/5 border-mcvill-card-border">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Monitoreo de Carga Activa</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Viajeros Inteligentes en Tiempo Real</p>
            </div>
            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors">
              Ver Todos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { id: 'JOB-4421', part: 'M-552-X', stage: 'LASER', progress: 45, status: 'on-time' },
              { id: 'JOB-4422', part: 'P-112-R', stage: 'DOBLEZ', progress: 12, status: 'delayed' },
            ].map((job) => (
              <div key={job.id} className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl hover:border-mcvill-accent/30 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h6 className="text-xs font-black text-white uppercase tracking-widest mb-1">{job.id}</h6>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{job.part}</p>
                  </div>
                  <div className={clsx(
                    "w-2 h-2 rounded-full",
                    job.status === 'on-time' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                  )} />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Estación: {job.stage}</span>
                    <span className="text-mcvill-accent">{job.progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-mcvill-accent transition-all duration-1000" style={{ width: `${job.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🚀 IA.AGUS: Panel de Alertas IA en Tiempo Real */}
        <div className="cyber-panel p-8 bg-rose-500/5 border-rose-500/20">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Zap className="text-rose-500" size={18} /> Alertas de Calidad IA
            </h4>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </div>

          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="py-10 text-center opacity-30">
                <ShieldCheck size={40} className="mx-auto mb-4 text-emerald-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white">Sin Anomalías Críticas</p>
                <p className="text-[9px] font-bold uppercase mt-1">Sincronización Neural OK</p>
              </div>
            ) : (
              alerts.map((alert, i) => (
                <div key={i} className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-in fade-in slide-in-from-right-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Falla de Calidad</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[10px] font-black text-white uppercase leading-tight mb-2">
                    {alert.defects[0]}
                  </p>
                  <p className="text-[9px] text-slate-400 line-clamp-2">
                    {alert.analysis}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProductionDashboard;
