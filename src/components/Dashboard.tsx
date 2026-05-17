import React, { useState, useEffect } from 'react';
import {
  Plus,
  Clock, Zap, Factory, Users, Wrench, Cpu, AlertTriangle,
  TrendingUp, Database, BarChart3, Package, FileText, Shield, Activity
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { supabase } from '../lib/supabase';

const DAY_LABELS = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

function buildEmptyWeekData(): { name: string; prod: number }[] {
  const result: { name: string; prod: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push({ name: DAY_LABELS[d.getDay()], prod: 0 });
  }
  return result;
}

export const Dashboard = () => {
  const { config, isDarkMode } = useConfig();
  const [stats, setStats] = useState({
    empleados: 0,
    presentes: 0,
    ordenes: 0,
    stockCritico: 0,
  });
  const [chartData, setChartData] = useState(buildEmptyWeekData());
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadStats();
    loadChartData();
  }, []);

  const loadStats = async () => {
    try {
      const todayISO = new Date().toISOString().split('T')[0];
      const [empRes, presentRes, ordenRes] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('date', todayISO),
        supabase.from('ordenes_mantenimiento').select('id', { count: 'exact', head: true }).in('estado', ['pendiente', 'en_proceso']),
      ]);

      // Usar la tabla unificada 'materiales'
      const { data: stockRows } = await supabase.from('materiales').select('cantidad, stock_minimo');
      const stockCritico = (stockRows ?? []).filter(
        (r: any) => r.cantidad != null && r.stock_minimo != null && Number(r.cantidad) <= Number(r.stock_minimo)
      ).length;

      setStats({
        empleados: empRes.count ?? 0,
        presentes: presentRes.count ?? 0,
        ordenes: ordenRes.count ?? 0,
        stockCritico,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setErrorMsg('No se pudieron cargar los indicadores. Verifica la conexión.');
    }
  };

  const loadChartData = async () => {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      const { data: rows } = await supabase.from('attendance_records').select('date').gte('date', sevenDaysAgo.toISOString().split('T')[0]);
      
      const countByDate: Record<string, number> = {};
      for (const row of rows ?? []) {
        countByDate[row.date] = (countByDate[row.date] ?? 0) + 1;
      }

      const series = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split('T')[0];
        series.push({ name: DAY_LABELS[d.getDay()], prod: countByDate[key] ?? 0 });
      }
      setChartData(series);
    } catch (error) {
      console.error('Error chart:', error);
      setErrorMsg('No se pudo cargar la gráfica de rendimiento.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-mcvill-bg overflow-hidden animate-in fade-in duration-700 -m-8">
      {/* Header Panel */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-emerald-400" />
          <h2 className="text-[10px] font-black text-mcvill-text uppercase tracking-[0.3em]">DATA CENTER & KPI CONTROL</h2>
        </div>
        <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
          Estado: <span className="text-emerald-500">ÓPTIMO</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold">
          <AlertTriangle size={13} className="shrink-0" />
          {errorMsg}
        </div>
      )}
      {/* Header Compacto */}
      <div className="relative overflow-hidden bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-mcvill-accent animate-pulse" />
            <span className="text-[9px] font-black text-mcvill-accent/80 uppercase tracking-[0.3em]">Control Maestro / {config.brandName}</span>
          </div>
          <h1 className="text-base font-black text-white tracking-tighter uppercase">
            OPERACIONES <span className="text-mcvill-accent">INDUSTRIALES</span>
            <span className="text-[8px] px-1.5 py-0.5 bg-mcvill-accent/10 text-mcvill-accent border border-mcvill-accent/20 rounded tracking-[0.2em] font-black hidden sm:inline">DATA-CENTER</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 relative z-10">
          <button className="h-9 px-4 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white transition-all flex items-center gap-2">
            <Database size={14} /> ENLAZAR BANCO
          </button>
          <button className="h-9 px-5 rounded-xl bg-mcvill-accent text-[10px] font-black text-slate-950 hover:opacity-90 transition-all flex items-center gap-2 shadow-[0_0_15px_var(--theme-glow)]">
            <Plus size={14} /> LANZAR ORDEN
          </button>
        </div>
      </div>

      {/* Grid de Stats Micro */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: 'Empleados', value: stats.empleados, icon: Users, color: 'text-blue-400', trend: '+0%' },
          { label: 'Presentes Hoy', value: stats.presentes, icon: Clock, color: 'text-emerald-400', trend: 'OK' },
          { label: 'OTs Activas', value: stats.ordenes, icon: Wrench, color: 'text-amber-400', trend: 'Activo' },
          { label: 'Stock Crítico', value: stats.stockCritico, icon: AlertTriangle, color: 'text-red-400', trend: stats.stockCritico > 0 ? 'ALERTA' : 'OK' },
          { label: 'ROI Mensual', value: '18.4%', icon: TrendingUp, color: 'text-mcvill-accent', trend: '+2.1%' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/40 border border-slate-800/40 p-3 rounded-xl hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 ${stat.color}`}>
                <stat.icon size={14} />
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{stat.trend}</span>
            </div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{stat.label}</p>
            <p className="text-lg font-black text-mcvill-text tracking-tight leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfica Compacta */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/40 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-mcvill-accent" size={16} />
              <h3 className="text-[10px] font-black text-mcvill-text uppercase tracking-widest">Rendimiento Operativo (7D)</h3>
            </div>
          </div>
          <div className="h-40 flex items-end gap-1 px-2">
            {chartData.map((d, i) => {
              const maxVal = Math.max(stats.empleados, ...chartData.map(cd => cd.prod), 10);
              const pct = (d.prod / maxVal) * 100;
              return (
                <div 
                  key={i} 
                  className="flex-1 bg-gradient-to-t from-mcvill-accent/20 to-mcvill-accent/40 rounded-t-sm hover:from-mcvill-accent transition-all cursor-pointer relative group/bar"
                  style={{ height: `${Math.max(2, pct)}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-mcvill-card border border-mcvill-card-border text-[8px] font-bold text-mcvill-text px-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity z-10">
                    {d.prod}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 px-1 text-[8px] font-bold text-slate-600 uppercase tracking-widest">
            {chartData.map(d => <span key={d.name}>{d.name}</span>)}
          </div>
        </div>

        {/* Eventos Compactos */}
        <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="text-amber-400" size={16} />
            <h3 className="text-[10px] font-black text-mcvill-text uppercase tracking-widest">Log de Eventos</h3>
          </div>
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar text-[10px]">
            <div className="flex gap-2 text-slate-500">
              <span className="font-mono text-mcvill-accent">14:20</span>
              <p>Sistema sincronizado con Supabase Cloud</p>
            </div>
            <div className="flex gap-2 text-slate-500">
              <span className="font-mono text-emerald-500">13:45</span>
              <p>Carga de catálogo de materiales completada</p>
            </div>
            <div className="flex gap-2 text-slate-500">
              <span className="font-mono text-amber-500">12:10</span>
              <p>Auditoría de inventario crítico iniciada</p>
            </div>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos Micro */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Inventario', icon: Package, count: '100%' },
          { label: 'Reportes', icon: FileText, count: 'PDF' },
          { label: 'Seguridad', icon: Shield, count: 'ACTIVO' },
          { label: 'Planta', icon: Factory, count: 'ON' },
          { label: 'Mantenimiento', icon: Wrench, count: '3' },
          { label: 'Red Neuronal', icon: Cpu, count: 'LIVE' },
        ].map((item, i) => (
          <button key={i} className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/30 border border-slate-800/40 hover:bg-slate-800/40 hover:border-mcvill-accent/30 transition-all group">
            <item.icon size={16} className="text-slate-500 group-hover:text-mcvill-accent mb-1 transition-colors" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
    </div>
  );
};
