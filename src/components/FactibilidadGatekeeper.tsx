import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, PenTool, Loader2, List, Plus, Search, Eye, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useConfig } from '../contexts/ConfigContext';
import { useTenant } from '../hooks/useTenant';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/dialogs';

// ── Combobox: dropdown de opciones + escritura libre ─────────────────────────
const ComboField = ({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(value.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="cyber-input h-14 text-sm w-full pr-10"
        />
        <ChevronDown
          size={14}
          onClick={() => setOpen(o => !o)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 cursor-pointer hover:text-slate-300 transition-colors"
        />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {value && !options.includes(value) && (
            <button
              onClick={() => { setOpen(false); }}
              className="w-full text-left px-4 py-3 border-b border-slate-800 text-xs text-slate-400 hover:bg-slate-800 transition-colors"
            >
              <span className="text-slate-200 font-bold">"{value}"</span>
              <span className="ml-2 text-indigo-400 text-[10px] uppercase tracking-widest">nuevo</span>
            </button>
          )}
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-500">Sin coincidencias — escribe para crear nuevo</p>
            ) : filtered.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={clsx(
                  'w-full text-left px-4 py-3 text-xs transition-colors font-medium',
                  value === opt
                    ? 'bg-indigo-600/20 text-indigo-300'
                    : 'text-slate-200 hover:bg-slate-800'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface FactibilidadState {
  bomCompleto: boolean | null;
  dibujosCompletos: boolean | null;
  toleranciasCriticas: boolean | null;
  requiereSoldaduraEspecial: boolean | null;
  requierePruebasNDT: boolean | null;
  empaqueEspecial: boolean | null;
}

interface EvaluacionRecord {
  id: string;
  cliente: string;
  numero_parte: string;
  es_factible: boolean | null;
  created_at: string;
  revision_bom: any;
  caracteristicas_especiales: any;
  requisitos_soldadura: any;
}

interface FactibilidadGatekeeperProps {
  hideHeader?: boolean;
}

export const FactibilidadGatekeeper: React.FC<FactibilidadGatekeeperProps> = ({ hideHeader }) => {
  useConfig();
  const tenantId = useTenant();
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'form' | 'list'>('form');
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clienteOptions, setClienteOptions] = useState<string[]>([]);

  const [state, setState] = useState<FactibilidadState>({
    bomCompleto: null,
    dibujosCompletos: null,
    toleranciasCriticas: null,
    requiereSoldaduraEspecial: null,
    requierePruebasNDT: null,
    empaqueEspecial: null,
  });

  const [cliente, setCliente] = useState('');
  const [numeroParte, setNumeroParte] = useState('');

  // Load unique client names from past evaluations
  useEffect(() => {
    supabase.from('evaluacion_factibilidad').select('cliente').then(({ data }) => {
      if (data) setClienteOptions([...new Set(data.map((r: any) => r.cliente).filter(Boolean))].sort());
    });
  }, []);

  const updateState = (key: keyof FactibilidadState, value: boolean) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  const getRedFlagsCount = () => {
    let flags = 0;
    if (state.bomCompleto === false) flags++;
    if (state.dibujosCompletos === false) flags++;
    if (state.toleranciasCriticas === true) flags++;
    if (state.requiereSoldaduraEspecial === true) flags++;
    if (state.requierePruebasNDT === true) flags++;
    return flags;
  };

  const redFlags = getRedFlagsCount();
  const isEvaluated = Object.values(state).some(v => v !== null);

  const loadHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('evaluacion_factibilidad')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast('Error al cargar historial: ' + error.message, 'error');
    else setEvaluaciones(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (view === 'list') loadHistory();
  }, [view]);

  const handleSave = async () => {
    if (!cliente || !numeroParte) return toast('Ingresa Cliente y Número de Parte para emitir dictamen.', 'error');
    setSaving(true);
    try {
      const payload = {
        cliente,
        numero_parte: numeroParte,
        revision_bom: { aprobado: state.bomCompleto },
        caracteristicas_especiales: { tolerancias_criticas: state.toleranciasCriticas },
        requisitos_soldadura: { especial: state.requiereSoldaduraEspecial, ndt: state.requierePruebasNDT },
        es_factible: redFlags === 0 ? true : (redFlags > 2 ? false : null),
      };
      const { error } = await supabase.from('evaluacion_factibilidad').insert(payload);
      if (error) throw error;
      toast('Dictamen FT-IG-01 generado y archivado en BD.', 'success');
      setState({ bomCompleto: null, dibujosCompletos: null, toleranciasCriticas: null, requiereSoldaduraEspecial: null, requierePruebasNDT: null, empaqueEspecial: null });
      setCliente('');
      setNumeroParte('');
    } catch (err: any) {
      toast(`Error al guardar: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Compact yes/no row
  const YesNoRow = ({ label, stateKey, danger = false }: { label: string; stateKey: keyof FactibilidadState; danger?: boolean }) => {
    const val = state[stateKey] as boolean | null;
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-800">
        <span className="text-xs font-bold text-slate-200 uppercase tracking-tight">{label}</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => updateState(stateKey, true)}
            className={clsx('px-3 py-1 rounded-md text-[10px] font-black border transition-all', val === true
              ? (danger ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400')
              : 'border-slate-700 text-slate-500 hover:border-slate-500')}
          >SÍ</button>
          <button
            onClick={() => updateState(stateKey, false)}
            className={clsx('px-3 py-1 rounded-md text-[10px] font-black border transition-all', val === false
              ? (danger ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-red-500/20 border-red-500 text-red-400')
              : 'border-slate-700 text-slate-500 hover:border-slate-500')}
          >NO</button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {!hideHeader && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <ShieldAlert className="text-indigo-400" size={15} />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tighter uppercase leading-none">DICTAMEN DE <span className="text-indigo-400">FACTIBILIDAD</span></h1>
              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">Gatekeeper · Protocolo FT-IG-01</p>
            </div>
          </div>
          <div className="flex gap-1.5 p-1 bg-slate-900/50 rounded-lg border border-slate-800">
            <button onClick={() => setView('form')} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", view === 'form' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300")}><Plus size={11} /> Nueva</button>
            <button onClick={() => setView('list')} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", view === 'list' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300")}><List size={11} /> Historial</button>
          </div>
        </div>
      )}

      {view === 'form' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2.5 cyber-panel p-4">
            {/* Client + Part comboboxes */}
            <div className="grid grid-cols-2 gap-2">
              <ComboField value={cliente} onChange={setCliente} options={clienteOptions} placeholder="Cliente" />
              <ComboField value={numeroParte} onChange={setNumeroParte} options={[]} placeholder="No. Parte" />
            </div>

            <div className="space-y-1.5">
              <YesNoRow label="BOM Completo"       stateKey="bomCompleto" />
              <YesNoRow label="Planos Claros"      stateKey="dibujosCompletos" />
              <YesNoRow label="Tolerancias Críticas" stateKey="toleranciasCriticas" danger />
              <YesNoRow label="Soldadura Especial" stateKey="requiereSoldaduraEspecial" danger />
              <YesNoRow label="Pruebas NDT"        stateKey="requierePruebasNDT" danger />
            </div>
          </div>

          <div className="cyber-panel p-4 flex flex-col justify-between gap-3">
            <div className="text-center space-y-1.5 py-1">
              {redFlags > 0
                ? <AlertTriangle className="mx-auto text-red-500" size={36} />
                : isEvaluated
                  ? <CheckCircle2 className="mx-auto text-emerald-500" size={36} />
                  : <ShieldAlert className="mx-auto text-slate-700" size={36} />}
              <h4 className="text-xl font-black text-white uppercase tracking-tighter">
                {redFlags > 2 ? 'No Factible' : redFlags > 0 ? 'Riesgo Técnico' : isEvaluated ? 'Factible' : 'Pendiente'}
              </h4>
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">
                {redFlags > 0 ? `${redFlags} alertas detectadas` : 'Proyecto dentro de capacidades'}
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={!isEvaluated || saving}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <PenTool size={16} />}
              Generar Dictamen FT-IG-01
            </button>
          </div>
        </div>
      ) : (
        <div className="cyber-panel overflow-hidden">
          <div className="p-3 border-b border-white/5 bg-slate-900/50 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por cliente..." className="cyber-input w-full pl-9 h-9 text-[11px]" />
            </div>
            <button onClick={() => setView('form')} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
              <Plus size={12} /> Nueva
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950 border-b border-white/5">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-500 tracking-widest">Dictamen</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-500 tracking-widest">Cliente</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-500 tracking-widest">No. Parte</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-500 tracking-widest">Estatus</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-500 tracking-widest text-center">Fecha</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></td></tr>
                ) : evaluaciones.filter(ev => ev.cliente?.toLowerCase().includes(searchTerm.toLowerCase())).map(ev => (
                  <tr key={ev.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-indigo-400 font-black">FT-{ev.id.substring(0,8).toUpperCase()}</td>
                    <td className="px-4 py-3 text-xs font-bold text-white uppercase">{ev.cliente}</td>
                    <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">{ev.numero_parte || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest', ev.es_factible ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')}>
                        {ev.es_factible ? 'Factible' : 'No Factible'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-500 font-mono text-center">{new Date(ev.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"><Eye size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
