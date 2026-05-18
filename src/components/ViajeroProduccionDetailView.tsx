import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Printer, Hammer, Box, Activity,
  Calendar, User, Clock, FileText, Image as ImageIcon,
  CheckCircle2, AlertTriangle, Play, Shield, Sparkles, GitBranch, X
} from 'lucide-react';
import { eventBus } from '../utils/eventBus';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import clsx from 'clsx';
import { TraceTimeline } from './TraceTimeline';
import { reportUtils } from '../utils/reportUtils';

interface Props {
  viajeroId: string;
  onBack: () => void;
}

export const ViajeroProduccionDetailView: React.FC<Props> = ({ viajeroId, onBack }) => {
  const { isDarkMode, config } = useConfig();
  const [data, setData] = useState<any>(null);
  const [ops, setOps] = useState<any[]>([]);
  const [mats, setMats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    fetchData();
  }, [viajeroId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, oRes, mRes] = await Promise.all([
        supabase.from('viajeros').select('*').eq('id', viajeroId).single(),
        supabase.from('viajero_operaciones').select('*').eq('viajero_id', viajeroId).order('orden', { ascending: true }),
        supabase.from('viajero_materiales').select('*').eq('viajero_id', viajeroId).order('created_at', { ascending: true })
      ]);

      if (vRes.data) setData(vRes.data);
      if (oRes.data) setOps(oRes.data);
      if (mRes.data) setMats(mRes.data);
      setFetchError(null);
    } catch (err) {
      console.error('Error fetching traveler detail:', err);
      setFetchError('No se pudieron cargar los datos del viajero. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleConsultarIA = () => {
    const prompt = `Actúa como experto en manufactura. Analiza técnicamente el Viajero ${data.id} (${data.numero_parte}) para el cliente ${data.cliente || 'S/C'}.
Descripción: ${data.descripcion || 'Sin descripción'}
Notas: ${data.notas || 'Sin notas'}
Ruta: ${ops.map(o => o.centro_trabajo).join(' -> ')}

Dame recomendaciones de optimización, posibles riesgos de calidad y sugerencias para mejorar el tiempo de entrega.`;
    
    eventBus.emit('CHAT_ASK', { prompt });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Activity className="text-blue-500 animate-pulse" size={40} />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Cargando Datos Técnicos...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    if (fetchError) {
      return (
        <div className="h-full flex items-center justify-center bg-slate-950 p-8">
          <div className="px-6 py-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[12px] font-bold text-center max-w-md">
            {fetchError}
          </div>
        </div>
      );
    }
    return null;
  }

  const statusColors: any = {
    'EN PROCESO': 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    'COMPLETADO': 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    'DETENIDO':   'text-amber-400 border-amber-500/30 bg-amber-500/10',
    'RECHAZADO':  'text-rose-400 border-rose-500/30 bg-rose-500/10',
    'PENDIENTE':  'text-slate-400 border-slate-500/30 bg-slate-500/10',
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden text-slate-200">
      {/* Header — Ultra Compact */}
      <div className="px-6 py-4 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          
          <div className="h-10 w-px bg-white/5" />

          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">VIAJERO INDUSTRIAL</span>
              <span className={clsx("px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest", statusColors[data.estatus] || statusColors.PENDIENTE)}>
                {data.estatus}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter leading-none">
              {data.id} <span className="text-slate-600 font-medium">/</span> {data.numero_parte}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end pr-6 border-r border-white/5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">AVANCE DE PRODUCCIÓN</span>
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-blue-400">{data.avance_porcentaje}%</span>
              <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${data.avance_porcentaje}%` }} />
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowTimeline(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-mcvill-accent/10 hover:bg-mcvill-accent/20 border border-mcvill-accent/30 text-mcvill-accent rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            <GitBranch size={14} /> Trazabilidad
          </button>
          <button
            onClick={handleConsultarIA}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Sparkles size={14} /> Consultar IA
          </button>
          <button
            onClick={() => reportUtils.exportViajeroPDF(data, ops, mats)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Printer size={14} /> Imprimir Hoja
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent">
        <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-6">
          
          {/* Left Column: Technical Specs & BOM */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Cliente', value: data.cliente, icon: <User size={14} />, color: 'text-emerald-400' },
                { label: 'Cantidad', value: data.cantidad_orden, icon: <Activity size={14} />, color: 'text-blue-400' },
                { label: 'Entrega', value: data.fecha_entrega ? new Date(data.fecha_entrega).toLocaleDateString() : 'S/F', icon: <Calendar size={14} />, color: 'text-amber-400' },
                { label: 'Prioridad', value: data.prioridad, icon: <Shield size={14} />, color: data.prioridad === 'URGENTE' ? 'text-rose-400' : 'text-slate-400' }
              ].map((stat, i) => (
                <div key={i} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl backdrop-blur-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={clsx("p-1.5 rounded-lg bg-white/5", stat.color)}>{stat.icon}</div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <p className="text-sm font-black text-white uppercase truncate">{stat.value || '---'}</p>
                </div>
              ))}
            </div>

            {/* Operations Flow (The "Route") */}
            <div className="bg-white/[0.03] border border-white/5 rounded-[30px] p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <Hammer size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Ruta de Operaciones</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Secuencia de procesos en piso</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-black/40 rounded-full border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {ops.length} Pasos Totales
                </div>
              </div>

              <div className="space-y-3">
                {ops.length === 0 && (
                  <p className="text-center text-[10px] font-black text-slate-700 uppercase tracking-widest py-6">Sin registros</p>
                )}
                {ops.map((op, idx) => (
                  <div key={op.id} className={clsx(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                    op.estado === 'completed' ? "bg-emerald-500/5 border-emerald-500/20" : 
                    op.estado === 'in_progress' ? "bg-blue-500/5 border-blue-500/30 ring-1 ring-blue-500/20" : 
                    "bg-white/[0.02] border-white/5"
                  )}>
                    <div className={clsx(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black border",
                      op.estado === 'completed' ? "bg-emerald-500 border-emerald-400 text-white" :
                      op.estado === 'in_progress' ? "bg-blue-500 border-blue-400 text-white animate-pulse" :
                      "bg-slate-800 border-white/10 text-slate-500"
                    )}>
                      {idx + 1}
                    </div>
                    
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Centro de Trabajo</p>
                        <p className="text-[11px] font-black text-white uppercase">{op.centro_trabajo}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Operación</p>
                        <p className="text-[11px] font-black text-white uppercase truncate">{op.nombre_operacion}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Tiempo Est.</p>
                        <p className="text-[11px] font-black text-blue-400 uppercase">{op.tiempo_estimado} Hrs</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-4 border-l border-white/5">
                      {op.estado === 'completed' ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : op.estado === 'in_progress' ? (
                        <Play size={16} className="text-blue-500 fill-blue-500" />
                      ) : (
                        <Clock size={16} className="text-slate-700" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill of Materials (BOM) */}
            <div className="bg-white/[0.03] border border-white/5 rounded-[30px] p-6 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <Box size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Lista de Materiales (BOM)</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Insumos y componentes requeridos</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5">
                      <th className="pb-3">Descripción / Clave</th>
                      <th className="pb-3 text-center">Cantidad</th>
                      <th className="pb-3 text-center">Unidad</th>
                      <th className="pb-3 text-right">Ubicación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mats.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[10px] font-black text-slate-700 uppercase tracking-widest">
                          Sin registros
                        </td>
                      </tr>
                    )}
                    {mats.map(mat => (
                      <tr key={mat.id} className="group">
                        <td className="py-3">
                          <p className="text-[11px] font-black text-white uppercase group-hover:text-emerald-400 transition-colors">{mat.descripcion}</p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">{mat.clave || 'S/K'}</p>
                        </td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-1 bg-black/40 rounded-lg text-[11px] font-black text-slate-300 border border-white/5">
                            {mat.cantidad}
                          </span>
                        </td>
                        <td className="py-3 text-center text-[10px] font-black text-slate-500 uppercase">{mat.unidad}</td>
                        <td className="py-3 text-right">
                          <span className="text-[10px] font-black text-emerald-500/80 uppercase">{mat.ubicacion || 'ALMACÉN GRAL'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Visuals & Technical Docs */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            
            {/* Main Visual */}
            <div className="bg-white/[0.03] border border-white/5 rounded-[30px] p-2 backdrop-blur-md overflow-hidden group">
              <div className="relative aspect-square rounded-[22px] bg-slate-900 flex items-center justify-center overflow-hidden border border-white/5">
                {data.image_url ? (
                  <img 
                    src={data.image_url} 
                    alt="Visualización Técnica" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-700">
                    <ImageIcon size={48} strokeWidth={1} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sin Visualización</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    Render Técnico IA
                  </span>
                </div>
              </div>
            </div>

            {/* Technical Notes */}
            <div className="bg-white/[0.03] border border-white/5 rounded-[30px] p-6 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <FileText size={18} className="text-amber-400" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Notas Técnicas</h3>
              </div>
              <div className="p-4 bg-black/30 rounded-2xl border border-white/5 min-h-[100px]">
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic whitespace-pre-wrap">
                  {data.notas || 'No se han registrado observaciones técnicas adicionales para este Job.'}
                </p>
              </div>
            </div>

            {/* Compliance & Safety */}
            <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-[30px] p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={20} className="text-blue-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Protocolo de Seguridad</h3>
              </div>
              <ul className="space-y-2">
                {[
                  'Uso obligatorio de EPP completo',
                  'Verificar tolerancias en dibujo rev. ' + (data.revision || '0'),
                  'Reportar anomalías al supervisor',
                  'Limpieza de área post-proceso'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[10px] font-bold text-blue-200/70 uppercase tracking-tight">
                    <div className="w-1 h-1 rounded-full bg-blue-500 mt-1" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>
      </div>

      {/* Footer info */}
      <div className="px-6 py-3 border-t border-white/5 bg-slate-900/60 flex items-center justify-between text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {`CONSULTA TÉCNICA AUTORIZADA · ${config.logoText} PRO`}
        </div>
        <div>Creado: {new Date(data.created_at).toLocaleString()}</div>
      </div>

      {/* Timeline modal */}
      {showTimeline && (
        <div className="fixed inset-0 top-16 left-0 md:left-64 z-[200] flex flex-col bg-slate-950/95 backdrop-blur-xl">
          <div className="px-5 py-3 border-b border-white/5 bg-slate-900/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <GitBranch size={15} className="text-mcvill-accent" />
              <span className="text-[11px] font-black text-white uppercase tracking-widest">
                Trazabilidad — <span className="text-mcvill-accent">{data.numero_parte}</span>
              </span>
            </div>
            <button onClick={() => setShowTimeline(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-white transition-all">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <TraceTimeline initialViajeroId={viajeroId} />
          </div>
        </div>
      )}
    </div>
  );
};
