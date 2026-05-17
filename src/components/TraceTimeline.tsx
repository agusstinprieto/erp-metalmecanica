import React, { useState, useEffect, useRef } from 'react';
import {
  Package, FileText, Wrench, ShieldCheck, Truck, Search,
  Loader2, GitBranch, ChevronRight, AlertTriangle, CheckCircle2,
  Clock, User, Box, Zap, X
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { engineeringService } from '../services/engineeringService';
import { qualityService } from '../services/qualityService';

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = 'lote' | 'orden' | 'operacion' | 'inspeccion' | 'entrega';

interface TimelineEvent {
  id: string;
  type: EventType;
  timestamp: string;
  title: string;
  subtitle: string;
  detail?: string;
  status: 'done' | 'active' | 'pending' | 'error';
  meta?: string;
}

interface ViajeroSuggestion {
  id: string;
  numero_parte: string;
  cliente?: string;
  estatus?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s?: string) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(s?: string) {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(s?: string) {
  if (!s) return '';
  const diff = Date.now() - new Date(s).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `hace ${d}d`;
  if (h > 0) return `hace ${h}h`;
  return 'hace un momento';
}

const EVENT_CONFIG: Record<EventType, { icon: React.ElementType; label: string; line: string; dot: string; card: string }> = {
  lote:      { icon: Package,      label: 'Lote Recibido',      line: 'bg-amber-500',       dot: 'bg-amber-500 shadow-amber-500/50',     card: 'border-amber-500/20 bg-amber-500/5' },
  orden:     { icon: FileText,     label: 'Orden Registrada',   line: 'bg-mcvill-accent',   dot: 'bg-mcvill-accent shadow-mcvill-accent/50', card: 'border-mcvill-accent/20 bg-mcvill-accent/5' },
  operacion: { icon: Wrench,       label: 'Operación',          line: 'bg-blue-400',        dot: 'bg-blue-400 shadow-blue-400/50',       card: 'border-blue-400/20 bg-blue-400/5' },
  inspeccion:{ icon: ShieldCheck,  label: 'Inspección',         line: 'bg-emerald-500',     dot: 'bg-emerald-500 shadow-emerald-500/50', card: 'border-emerald-500/20 bg-emerald-500/5' },
  entrega:   { icon: Truck,        label: 'Entregado',          line: 'bg-emerald-400',     dot: 'bg-emerald-400 shadow-emerald-400/50', card: 'border-emerald-400/20 bg-emerald-400/5' },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  initialViajeroId?: string;
}

export const TraceTimeline: React.FC<Props> = ({ initialViajeroId }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ViajeroSuggestion[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [selectedViajero, setSelectedViajero] = useState<ViajeroSuggestion | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialViajeroId) loadByViajeroId(initialViajeroId);
  }, [initialViajeroId]);

  // ── Search suggestions ───────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.from('viajeros')
        .select('id, numero_parte, cliente, estatus')
        .or(`numero_parte.ilike.%${query}%,id.ilike.%${query}%,cliente.ilike.%${query}%`)
        .limit(8);
      setSuggestions(data || []);
      setSearching(false);
      setShowSugg(true);
    }, 300);
  }, [query]);

  const selectViajero = (v: ViajeroSuggestion) => {
    setSelectedViajero(v);
    setQuery(v.numero_parte);
    setShowSugg(false);
    loadByViajeroId(v.id);
  };

  // ── Load timeline ────────────────────────────────────────────────────────────
  const loadByViajeroId = async (viajeroId: string) => {
    setLoading(true);
    setEvents([]);
    try {
      const [vRes, opsRes, matsRes, usosRes, inspsRes] = await Promise.all([
        supabase.from('viajeros').select('*').eq('id', viajeroId).single(),
        supabase.from('viajero_operaciones').select('*').eq('viajero_id', viajeroId).order('orden', { ascending: true }),
        supabase.from('viajero_materiales').select('*').eq('viajero_id', viajeroId),
        engineeringService.getUsoByViajero(viajeroId),
        qualityService.getInspections(),
      ]);

      const v = vRes.data;
      const ops: any[] = opsRes.data || [];
      const usos: any[] = usosRes || [];
      const allInsps: any[] = inspsRes || [];
      const insps = allInsps.filter(i => i.order_id === v?.work_order_id || i.viajero_id === viajeroId);

      if (!v) { setLoading(false); return; }
      if (!selectedViajero) setSelectedViajero({ id: v.id, numero_parte: v.numero_parte, cliente: v.cliente, estatus: v.estatus });

      const evts: TimelineEvent[] = [];

      // 1 — Lotes recibidos (uno por uso)
      usos.forEach(uso => {
        const lot = uso.lote;
        const ts = lot?.fecha_recepcion || uso.created_at;
        evts.push({
          id: `lote-${uso.id}`,
          type: 'lote',
          timestamp: ts,
          title: lot?.numero_lote || 'Lote sin número',
          subtitle: lot?.descripcion || 'Material',
          detail: [lot?.proveedor && `Proveedor: ${lot.proveedor}`, lot?.numero_colada && `Colada: ${lot.numero_colada}`, `${uso.cantidad_usada} ${uso.unidad || 'kg'} usados`].filter(Boolean).join(' · '),
          status: 'done',
          meta: fmtDate(ts),
        });
      });

      // 2 — Orden registrada
      evts.push({
        id: `orden-${v.id}`,
        type: 'orden',
        timestamp: v.created_at,
        title: `Orden Registrada — ${v.numero_parte}`,
        subtitle: v.cliente ? `Cliente: ${v.cliente}` : 'Sin cliente asignado',
        detail: [v.descripcion, v.cantidad && `Cantidad: ${v.cantidad} pzas`].filter(Boolean).join(' · '),
        status: 'done',
        meta: fmtDate(v.created_at),
      });

      // 3 — Operaciones
      ops.forEach(op => {
        const isDone = op.status === 'COMPLETADO' || op.completado;
        const isActive = op.status === 'EN PROCESO';
        evts.push({
          id: `op-${op.id}`,
          type: 'operacion',
          timestamp: op.updated_at || op.created_at,
          title: op.nombre_operacion || op.nombre || `Operación ${op.orden}`,
          subtitle: op.centro_trabajo || 'Sin centro asignado',
          detail: [op.operador && `Operador: ${op.operador}`, op.tiempo_estandar_min && `T.Est: ${op.tiempo_estandar_min}min`, op.tiempo_real_min && `T.Real: ${op.tiempo_real_min}min`].filter(Boolean).join(' · '),
          status: isDone ? 'done' : isActive ? 'active' : 'pending',
          meta: isDone ? fmtDate(op.updated_at) : op.status || 'PENDIENTE',
        });
      });

      // 4 — Inspecciones
      insps.forEach(insp => {
        const passed = insp.status === 'passed';
        evts.push({
          id: `insp-${insp.id}`,
          type: 'inspeccion',
          timestamp: insp.created_at,
          title: passed ? 'Inspección — CERTIFICADO' : insp.status === 'failed' ? 'Inspección — RECHAZADO' : 'Inspección — OBSERVADO',
          subtitle: insp.details?.notes || 'Sin notas de inspección',
          detail: insp.inspector ? `Inspector: ${insp.inspector}` : undefined,
          status: passed ? 'done' : insp.status === 'failed' ? 'error' : 'active',
          meta: fmtDate(insp.created_at),
        });
      });

      // 5 — Entrega (si hay fecha o está COMPLETADO)
      if (v.fecha_entrega || v.estatus === 'COMPLETADO' || v.estatus === 'ENTREGADO') {
        evts.push({
          id: `entrega-${v.id}`,
          type: 'entrega',
          timestamp: v.fecha_entrega || v.updated_at,
          title: 'Pieza Entregada',
          subtitle: v.cliente ? `Entregado a: ${v.cliente}` : 'Entrega registrada',
          status: 'done',
          meta: fmtDate(v.fecha_entrega || v.updated_at),
        });
      }

      // Sort chronologically
      evts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setEvents(evts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const statusIcon = (s: TimelineEvent['status']) => {
    if (s === 'done')    return <CheckCircle2 size={12} className="text-emerald-400" />;
    if (s === 'error')   return <AlertTriangle size={12} className="text-rose-400" />;
    if (s === 'active')  return <Zap size={12} className="text-mcvill-accent animate-pulse" />;
    return <Clock size={12} className="text-slate-600" />;
  };

  return (
    <div className="h-full flex flex-col">

      {/* Search bar */}
      <div className="px-6 py-4 border-b border-white/5 bg-slate-900/30 shrink-0">
        <div className="max-w-xl relative">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-mcvill-accent transition-colors" size={14} />
            {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 animate-spin" size={14} />}
            <input
              type="text"
              placeholder="Buscar por viajero, número de parte, cliente..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSugg(true)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-[11px] font-bold text-white placeholder:text-slate-700 focus:border-mcvill-accent/50 focus:outline-none transition-all"
            />
            {selectedViajero && query && (
              <button onClick={() => { setQuery(''); setSelectedViajero(null); setEvents([]); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showSugg && suggestions.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              {suggestions.map(v => (
                <button key={v.id} onClick={() => selectViajero(v)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-all text-left">
                  <GitBranch size={13} className="text-mcvill-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white uppercase truncate">{v.numero_parte}</p>
                    {v.cliente && <p className="text-[9px] text-slate-500 uppercase tracking-wider truncate">{v.cliente}</p>}
                  </div>
                  <span className="text-[8px] font-black text-slate-600 uppercase shrink-0">{v.id.slice(0, 8)}</span>
                  <ChevronRight size={12} className="text-slate-700 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected viajero chip */}
        {selectedViajero && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-mcvill-accent/10 border border-mcvill-accent/20 rounded-full">
              <GitBranch size={11} className="text-mcvill-accent" />
              <span className="text-[10px] font-black text-mcvill-accent uppercase tracking-wider">{selectedViajero.numero_parte}</span>
              {selectedViajero.cliente && <span className="text-[9px] text-slate-500 uppercase">· {selectedViajero.cliente}</span>}
            </div>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{events.length} eventos · {events.filter(e => e.status === 'done').length} completados</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">

        {/* Empty / loading states */}
        {!selectedViajero && !loading && (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
            <GitBranch size={48} className="text-slate-700" />
            <div className="text-center">
              <p className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Trazabilidad Completa</p>
              <p className="text-[10px] text-slate-700 uppercase font-bold mt-1">Busca un viajero para ver su historial completo</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <Loader2 size={32} className="text-mcvill-accent animate-spin" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Construyendo timeline...</p>
          </div>
        )}

        {!loading && selectedViajero && events.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-3 opacity-40">
            <Box size={36} className="text-slate-700" />
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Sin eventos registrados</p>
          </div>
        )}

        {/* Events */}
        {!loading && events.length > 0 && (
          <div className="max-w-2xl mx-auto relative">

            {/* Vertical line */}
            <div className="absolute left-[19px] top-6 bottom-6 w-px bg-gradient-to-b from-mcvill-accent/60 via-mcvill-accent/30 to-transparent" />

            <div className="space-y-1">
              {events.map((evt, idx) => {
                const cfg = EVENT_CONFIG[evt.type];
                const Icon = cfg.icon;
                const isLast = idx === events.length - 1;
                const isPending = evt.status === 'pending';

                return (
                  <div key={evt.id} className={clsx('flex gap-4 group', isPending && 'opacity-40')}>

                    {/* Dot + line */}
                    <div className="flex flex-col items-center shrink-0" style={{ width: 40 }}>
                      <div className={clsx(
                        'w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 z-10 transition-all shrink-0',
                        evt.status === 'active'  && 'ring-2 ring-mcvill-accent/50 ring-offset-1 ring-offset-slate-950',
                        evt.status === 'error'   && 'bg-rose-500/15 border-rose-500/30',
                        evt.status === 'done'    && 'bg-white/[0.04]',
                        evt.status === 'pending' && 'bg-white/[0.02]',
                        evt.status === 'active'  && 'bg-mcvill-accent/10',
                      )}>
                        <Icon size={16} className={clsx(
                          evt.status === 'done'    && 'text-mcvill-accent',
                          evt.status === 'active'  && 'text-mcvill-accent',
                          evt.status === 'error'   && 'text-rose-400',
                          evt.status === 'pending' && 'text-slate-700',
                        )} />
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-white/5 mt-1" />}
                    </div>

                    {/* Card */}
                    <div className={clsx(
                      'flex-1 border rounded-xl px-4 py-3 mb-3 transition-all',
                      cfg.card,
                      'group-hover:border-mcvill-accent/30 group-hover:bg-mcvill-accent/5',
                    )}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className={clsx('text-[9px] font-black uppercase tracking-widest', 'text-slate-500')}>{cfg.label}</span>
                          {statusIcon(evt.status)}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[9px] font-black text-slate-500 uppercase">{evt.meta}</p>
                          <p className="text-[8px] text-slate-700 uppercase">{fmtTime(evt.timestamp)} · {timeAgo(evt.timestamp)}</p>
                        </div>
                      </div>

                      <p className="text-[12px] font-black text-white uppercase tracking-tight leading-tight">{evt.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">{evt.subtitle}</p>
                      {evt.detail && (
                        <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-1.5 font-bold">{evt.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* End marker */}
              {events.length > 0 && (
                <div className="flex gap-4 items-center pl-2 pt-2 opacity-30">
                  <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center ml-[7px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  </div>
                  <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Fin del historial</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TraceTimeline;
