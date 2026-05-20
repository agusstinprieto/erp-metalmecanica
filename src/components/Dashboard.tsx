import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, X, Loader2, CheckCircle2, Link2, Upload, Key, BookOpen,
  Clock, Zap, Factory, Users, Wrench, Cpu, AlertTriangle,
  TrendingUp, Database, BarChart3, Package, FileText, Shield, Activity,
  ChevronDown, ChevronRight, Info, FileDown, Award
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { supabase, getActiveTenantId } from '../lib/supabase';
import { productionService } from '../services/productionService';
import { reportUtils } from '../utils/reportUtils';
import { shiftService } from '../services/shiftService';

const DAY_LABELS = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
const BANK_API_KEY = 'mcvill_bank_api_key';

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

// ── LANZAR ORDEN MODAL ────────────────────────────────────────────────────────
interface LanzarOrdenModalProps { onClose: () => void; onCreated: () => void; }

const LanzarOrdenModal: React.FC<LanzarOrdenModalProps> = ({ onClose, onCreated }) => {
  const [tipo, setTipo] = useState<'produccion' | 'mantenimiento'>('produccion');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [asignadoA, setAsignadoA] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      if (tipo === 'produccion') {
        await productionService.createWorkOrder({
          priority: prioridad,
          due_date: fechaEstimada || null,
          assigned_to: asignadoA || null,
          metadata: { descripcion },
        });
      } else {
        const { error: e } = await supabase.from('ordenes_mantenimiento').insert({
          descripcion,
          prioridad,
          fecha_programada: fechaEstimada || null,
          asignado_a: asignadoA || null,
          estado: 'pendiente',
          tipo: 'correctivo',
        });
        if (e) throw e;
      }
      setDone(true);
      timerRef.current = setTimeout(() => { onCreated(); onClose(); }, 1400);
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear la orden');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md bg-slate-900 border border-slate-700/60 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Lanzar Nueva Orden</h3>
            <p className="text-[9px] text-slate-500 mt-0.5">Producción o Mantenimiento</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-8 text-emerald-400">
            <CheckCircle2 size={36} />
            <p className="font-black text-sm uppercase tracking-widest">Orden Creada</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2">
              {(['produccion', 'mantenimiento'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTipo(t)}
                  className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    tipo === t
                      ? 'bg-mcvill-accent/15 border-mcvill-accent text-mcvill-accent'
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}>
                  {t === 'produccion' ? '⚙️ Producción' : '🔧 Mantenimiento'}
                </button>
              ))}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descripción *</label>
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} required rows={3}
                placeholder={tipo === 'produccion' ? 'Ej: Fabricación de 10 piezas A-203...' : 'Ej: Revisión preventiva torno CNC #2...'}
                className="w-full cyber-input resize-none text-[11px] placeholder:text-slate-700" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Prioridad */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Prioridad</label>
                <select value={prioridad} onChange={e => setPrioridad(e.target.value as typeof prioridad)}
                  className="w-full cyber-input text-[11px]">
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              {/* Fecha */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Est.</label>
                <input type="date" value={fechaEstimada} onChange={e => setFechaEstimada(e.target.value)}
                  className="w-full cyber-input text-[11px]" />
              </div>
            </div>

            {/* Asignar */}
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asignado a</label>
              <input type="text" value={asignadoA} onChange={e => setAsignadoA(e.target.value)}
                placeholder="Nombre del responsable"
                className="w-full cyber-input text-[11px]" />
            </div>

            {error && (
              <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving || !descripcion.trim()}
                className="flex-1 h-10 rounded-xl bg-mcvill-accent text-[10px] font-black text-slate-950 hover:opacity-90 disabled:opacity-50 uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_var(--theme-glow)]">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {isSaving ? 'Creando...' : 'Crear Orden'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ── ENLAZAR BANCO MODAL ───────────────────────────────────────────────────────
interface EnlazarBancoModalProps { onClose: () => void; onNavigateToBanco: () => void; }

const BANK_GUIDE = [
  {
    banco: 'BBVA México',
    pasos: [
      'Entra a bbvanetcash.com y accede con tu empresa',
      'Ve a "API & Desarrolladores" en el menú principal',
      'Solicita credenciales de tipo "Open Banking API"',
      'Genera tu Client ID y Client Secret',
      'Pega el token generado en el campo de arriba',
    ],
  },
  {
    banco: 'Santander',
    pasos: [
      'Accede a Supernet o Santander Business',
      'Contacta a tu ejecutivo de cuenta para activar APIs',
      'Solicita acceso a "Santander Open Banking"',
      'Recibirás un token vía email o portal seguro',
    ],
  },
  {
    banco: 'Banorte',
    pasos: [
      'Entra a Banorte en Línea Empresas',
      'Busca la sección "Integraciones y API"',
      'Llena el formulario de solicitud API Banking',
      'El área de soporte te envía el token en 2-3 días hábiles',
    ],
  },
  {
    banco: 'HSBC / Banamex / Otros',
    pasos: [
      'Contacta a tu ejecutivo de banca empresarial',
      'Solicita acceso a sus servicios de "Open Banking" o "API de Consulta"',
      'Proporciona el dominio de tu sistema ERP si lo requieren',
      'Activa el token en el panel del banco y pégalo aquí',
    ],
  },
];

const EnlazarBancoModal: React.FC<EnlazarBancoModalProps> = ({ onClose, onNavigateToBanco }) => {
  const [tab, setTab] = useState<'api' | 'manual'>('api');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(BANK_API_KEY) ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openBank, setOpenBank] = useState<number | null>(null);

  const isConnected = !!localStorage.getItem(BANK_API_KEY);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 600));
    localStorage.setItem(BANK_API_KEY, apiKey.trim());
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(BANK_API_KEY);
    setApiKey('');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg bg-slate-900 border border-slate-700/60 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800/60 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-mcvill-accent/10 border border-mcvill-accent/20">
              <Database size={15} className="text-mcvill-accent" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Conexión Bancaria</h3>
              <p className="text-[9px] text-slate-500">API directa o carga manual</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800/60">
          {([
            { id: 'api', label: '🔗 Conectar API', icon: Link2 },
            { id: 'manual', label: '📂 Subir Estado', icon: Upload },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                tab === t.id
                  ? 'text-mcvill-accent border-mcvill-accent'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {tab === 'api' && (
            <>
              {/* Status */}
              <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-[10px] font-bold ${
                isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {isConnected ? 'API bancaria conectada' : 'Sin conexión API — configura tu token abajo'}
              </div>

              {/* API Key field */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Token / API Key del Banco
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="Token de integración bancaria..."
                      className="w-full cyber-input pl-8 text-[11px] font-mono"
                    />
                  </div>
                  <button onClick={handleSave} disabled={isSaving || !apiKey.trim()}
                    className="px-4 rounded-xl bg-mcvill-accent text-[10px] font-black text-slate-950 hover:opacity-90 disabled:opacity-40 uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-[0_0_12px_var(--theme-glow)]">
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : null}
                    {saved ? 'Guardado' : 'Guardar'}
                  </button>
                </div>
                {isConnected && (
                  <button onClick={handleDisconnect}
                    className="mt-2 text-[9px] text-red-400/70 hover:text-red-400 underline transition-colors">
                    Desconectar banco
                  </button>
                )}
                <p className="mt-2 text-[9px] text-slate-600 flex items-start gap-1.5">
                  <Info size={10} className="shrink-0 mt-0.5" />
                  El token se guarda localmente en este dispositivo y se usa para consultar saldos y movimientos automáticamente durante la conciliación.
                </p>
              </div>

              {/* Guide */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={13} className="text-mcvill-accent" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Guía por Banco</span>
                  <span className="text-[9px] text-slate-500">¿Cómo obtengo mi token?</span>
                </div>
                <div className="space-y-2">
                  {BANK_GUIDE.map((b, i) => (
                    <div key={i} className="rounded-xl border border-slate-800/60 overflow-hidden">
                      <button
                        onClick={() => setOpenBank(openBank === i ? null : i)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-black text-slate-300 hover:text-white hover:bg-slate-800/40 transition-all uppercase tracking-widest">
                        {b.banco}
                        {openBank === i ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                      {openBank === i && (
                        <div className="px-4 pb-3 space-y-1.5 bg-slate-950/40">
                          {b.pasos.map((paso, j) => (
                            <div key={j} className="flex gap-2.5 text-[10px] text-slate-400">
                              <span className="text-[9px] font-black text-mcvill-accent shrink-0">{j + 1}.</span>
                              <span>{paso}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[9px] text-slate-600 bg-slate-950/40 border border-slate-800/40 rounded-xl p-3">
                  <strong className="text-slate-400">Nota:</strong> Algunos bancos requieren que el sistema ERP esté registrado como aplicación autorizada. Si tienes dudas, comparte este acceso con tu ejecutivo de banca empresarial.
                </p>
              </div>
            </>
          )}

          {tab === 'manual' && (
            <>
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto">
                  <Upload size={28} className="text-mcvill-accent" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">Carga Manual de Estado de Cuenta</h4>
                  <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                    Si prefieres no conectar la API del banco, puedes subir tu estado de cuenta en formato CSV para la conciliación automática con IA.
                  </p>
                </div>
                <div className="space-y-2 text-left bg-slate-950/40 border border-slate-800/40 rounded-xl p-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cómo hacerlo:</p>
                  {[
                    'Descarga tu estado de cuenta en formato CSV o Excel desde el portal de tu banco',
                    'Ve al módulo de Banco → pestaña Conciliación IA',
                    'Arrastra o selecciona el archivo CSV',
                    'El sistema lo analiza y lo concilia automáticamente con tus registros ERP',
                  ].map((step, i) => (
                    <div key={i} className="flex gap-2 text-[10px] text-slate-400">
                      <span className="text-mcvill-accent font-black shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { sessionStorage.setItem('mcvill_banco_tab', 'conciliacion'); onNavigateToBanco(); onClose(); }}
                  className="w-full h-11 rounded-xl bg-mcvill-accent text-[10px] font-black text-slate-950 hover:opacity-90 uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_var(--theme-glow)]">
                  <Database size={14} /> Ir a Conciliación IA
                </button>
                <p className="text-[9px] text-slate-600">
                  También puedes conectar la API del banco en cualquier momento desde la pestaña anterior para automatizar este proceso.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
interface DashboardProps { onNavigateToBanco?: () => void; }

type PlantaKey = 'todas' | 'torreon_laser' | 'torreon_mecanizado' | 'torreon_forja';
type TurnoKey = string;
type CategoryKey = 'asistencia' | 'produccion' | 'calidad' | 'seguridad' | 'energia';
type TimeRange = '1d' | '7d' | '30d' | '365d' | 'all';

const TIME_RANGES: { id: TimeRange; label: string; points: number }[] = [
  { id: '1d',   label: 'Día',       points: 8  },
  { id: '7d',   label: 'Semana',    points: 7  },
  { id: '30d',  label: 'Mes',       points: 12 },
  { id: '365d', label: 'Año',       points: 12 },
  { id: 'all',  label: 'Histórico', points: 18 },
];

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToBanco }) => {
  const { config } = useConfig();
  const [selectedPlanta, setSelectedPlanta] = useState<PlantaKey>('todas');
  const [selectedTurno, setSelectedTurno] = useState<TurnoKey>('todos');
  const [shifts, setShifts] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');


  const [dbStats, setDbStats] = useState({
    empleados: 0,
    presentes: 0,
    ordenes: 0,
    stockCritico: 0,
    safetyDays: 0,
  });

  const [activeEmployeesList, setActiveEmployeesList] = useState<any[]>([]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [positionStats, setPositionStats] = useState<Array<{puesto: string, total: number, presentes: number}>>([]);

  const [primaData, setPrimaData] = useState<{
    totalPasivo: number;
    elegibles: number;
    top5: Array<{ nombre: string; anos: number; prima: number; salarioDiario: number }>;
  } | null>(null);

  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isBancoModalOpen, setIsBancoModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadDbStats();
    loadPrimaAntiguedad();
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const data = await shiftService.listShifts();
      setShifts(data || []);
    } catch (e) {
      console.error('Error loading shifts:', e);
    }
  };

  useEffect(() => {
    loadTelemetryData();
  }, [selectedPlanta, selectedTurno, timeRange, shifts]);

  const loadTelemetryData = async () => {
    try {
      let query = supabase.from('telemetry_records').select('*').order('created_at', { ascending: true });
      
      if (selectedPlanta !== 'todas') {
        query = query.eq('planta_slug', selectedPlanta);
      }
      
      if (selectedTurno !== 'todos') {
        const activeShiftObj = shifts.find((s: any) => s.id === selectedTurno);
        const shiftName = activeShiftObj ? activeShiftObj.name.toLowerCase() : '';
        
        let mappedTurno = 'matutino'; // default
        if (shiftName.includes('vespertino') || shiftName.includes('t2')) {
          mappedTurno = 'vespertino';
        } else if (shiftName.includes('nocturno') || shiftName.includes('t3')) {
          mappedTurno = 'nocturno';
        }
        
        query = query.eq('turno', mappedTurno);
      }
      
      const now = new Date();
      if (timeRange === '1d') {
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', oneDayAgo);
      } else if (timeRange === '7d') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', sevenDaysAgo);
      } else if (timeRange === '30d') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', thirtyDaysAgo);
      } else if (timeRange === '365d') {
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', oneYearAgo);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setTelemetryData(data ?? []);
    } catch (e) {
      console.error('Error loading telemetry data:', e);
    }
  };

  const loadDbStats = async () => {
    try {
      const todayISO = new Date().toISOString().split('T')[0];
      const [empRes, presentRes, ordenRes, safetyRes, empDetailRes, attendDetailRes] = await Promise.all([
        supabase.from('empleados').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('asistencia').select('id', { count: 'exact', head: true }).eq('date', todayISO),
        supabase.from('ordenes_mantenimiento').select('id', { count: 'exact', head: true }).in('estado', ['pendiente', 'en_proceso']),
        supabase.from('seguridad_metricas').select('dias_sin_accidente').limit(1),
        supabase.from('empleados').select('id, shift_id, job_title').eq('status', 'active'),
        supabase.from('asistencia').select('employee_id').eq('date', todayISO),
      ]);

      let stockCritico = 0;
      const { data: stockRows, error: stockErr } = await supabase.from('materiales').select('peso_mp, stock_minimo_mp');
      if (!stockErr && stockRows && stockRows.length > 0) {
        stockCritico = stockRows.filter(
          (r: any) => r.peso_mp != null && r.stock_minimo_mp != null && Number(r.peso_mp) <= Number(r.stock_minimo_mp)
        ).length;
      } else {
        const { data: altRows } = await supabase.from('suministros').select('stock_quantity, min_stock');
        stockCritico = (altRows ?? []).filter(
          (r: any) => r.stock_quantity != null && r.min_stock != null && Number(r.stock_quantity) <= Number(r.min_stock)
        ).length;
      }

      setDbStats({
        empleados: empRes.count ?? 0,
        presentes: presentRes.count ?? 0,
        ordenes: ordenRes.count ?? 0,
        stockCritico,
        safetyDays: safetyRes.data && safetyRes.data.length > 0 ? safetyRes.data[0].dias_sin_accidente : 0,
      });

      const empList = (empDetailRes.data || []) as Array<{id: string, shift_id: string | null, job_title: string | null}>;
      const presentSet = new Set<string>((attendDetailRes.data || []).map((a: any) => a.employee_id));
      setActiveEmployeesList(empList);
      setPresentIds(presentSet);

      const posMap: Record<string, {total: number, presentes: number}> = {};
      for (const e of empList) {
        const key = e.job_title || 'Sin Puesto';
        if (!posMap[key]) posMap[key] = { total: 0, presentes: 0 };
        posMap[key].total++;
        if (presentSet.has(e.id)) posMap[key].presentes++;
      }
      setPositionStats(
        Object.entries(posMap)
          .map(([puesto, v]) => ({ puesto, ...v }))
          .sort((a, b) => b.total - a.total)
      );
    } catch (error) {
      console.error('Error loading stats:', error);
      setErrorMsg('No se pudieron cargar los indicadores de base de datos. Usando simulación de planta activa.');
    }
  };

  const loadPrimaAntiguedad = async () => {
    try {
      // Art. 162 LFT: 12 días de salario × años de servicio
      // Tope salario: 2 × Salario Mínimo General diario (SMG 2026 zona general)
      const SMG_DIARIO = 278.80;
      const TOPE_DIARIO = SMG_DIARIO * 2; // $557.60
      const hoy = new Date();

      const { data: empleados, error } = await supabase
        .from('empleados')
        .select('first_name, last_name, hire_date, daily_salary')
        .eq('status', 'active')
        .not('hire_date', 'is', null);

      if (error || !empleados) return;

      const elegibles = empleados
        .map(emp => {
          const ingreso = new Date(emp.hire_date);
          const anos = (hoy.getTime() - ingreso.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          if (anos < 15) return null;
          const anosCompletos = Math.floor(anos);
          const salarioDiario = Number(emp.daily_salary) || 0;
          const salarioBase = Math.min(salarioDiario, TOPE_DIARIO);
          return {
            nombre: `${emp.first_name} ${emp.last_name}`,
            anos: anosCompletos,
            salarioDiario,
            prima: 12 * anosCompletos * salarioBase,
          };
        })
        .filter(Boolean) as Array<{ nombre: string; anos: number; prima: number; salarioDiario: number }>;

      const totalPasivo = elegibles.reduce((s, e) => s + e.prima, 0);
      const top5 = [...elegibles].sort((a, b) => b.prima - a.prima).slice(0, 5);

      setPrimaData({ totalPasivo, elegibles: elegibles.length, top5 });
    } catch (e) {
      console.error('Error cargando prima de antigüedad:', e);
    }
  };

  // ── DYNAMIC METRIC GENERATORS (FILTER BASED) ────────────────────────────────
  const getFilteredMetrics = () => {
    const lastRecord = telemetryData.length > 0 ? telemetryData[telemetryData.length - 1] : null;

    let baseEmpleados = dbStats.empleados;
    let basePresentes = dbStats.presentes;
    let baseOEE = lastRecord ? Number(lastRecord.oee_pct) : 0;
    let baseScrap = lastRecord ? Number(lastRecord.scrap_pct) : 0;
    let baseEnergyKWh = lastRecord ? Number(lastRecord.consumo_kwh) : 0;

    if (dbStats.empleados > 0) {
      // If we have database stats, apply active headcount limit modifiers
      if (selectedPlanta === 'torreon_laser') {
        baseEmpleados = Math.round(baseEmpleados * 0.35);
        basePresentes = Math.min(basePresentes, baseEmpleados);
      } else if (selectedPlanta === 'torreon_mecanizado') {
        baseEmpleados = Math.round(baseEmpleados * 0.45);
        basePresentes = Math.min(basePresentes, baseEmpleados);
      } else if (selectedPlanta === 'torreon_forja') {
        baseEmpleados = Math.round(baseEmpleados * 0.20);
        basePresentes = Math.min(basePresentes, baseEmpleados);
      }
    }

    return {
      empleados: baseEmpleados,
      presentes: Math.min(basePresentes, baseEmpleados),
      oee: Number(baseOEE.toFixed(1)),
      scrap: Number(baseScrap.toFixed(2)),
      safetyDays: dbStats.safetyDays,
      energy: Math.round(baseEnergyKWh),
      ordenes: dbStats.ordenes,
      stockCritico: dbStats.stockCritico,
      calidad: Number((100 - baseScrap).toFixed(1)),
    };
  };

  const metrics = getFilteredMetrics();

  const handleExportPDF = () => {
    const m = metrics;
    const data = [
      { KPI: 'Empleados Activos',  VALOR: String(m.empleados),    META: '45',    PCT_CUMPLIMIENTO: `${Math.round((m.empleados / 45) * 100)}%`,       SEMAFORO: m.empleados >= 40 ? 'VERDE' : 'ROJO' },
      { KPI: 'Asistencia Hoy',     VALOR: String(m.presentes),    META: String(m.empleados), PCT_CUMPLIMIENTO: m.empleados > 0 ? `${Math.round((m.presentes / m.empleados) * 100)}%` : '—', SEMAFORO: m.presentes >= m.empleados * 0.9 ? 'VERDE' : 'AMARILLO' },
      { KPI: 'OEE Global (%)',     VALOR: `${m.oee}%`,            META: '85%',   PCT_CUMPLIMIENTO: `${Math.round((m.oee / 85) * 100)}%`,               SEMAFORO: m.oee >= 85 ? 'VERDE' : m.oee >= 75 ? 'AMARILLO' : 'ROJO' },
      { KPI: 'Scrap (%)',          VALOR: `${m.scrap}%`,          META: '<2%',   PCT_CUMPLIMIENTO: m.scrap <= 2 ? 'CUMPLE' : 'EXCEDE',                 SEMAFORO: m.scrap <= 2 ? 'VERDE' : 'ROJO' },
      { KPI: 'Ordenes Activas',    VALOR: String(m.ordenes),      META: '<10',   PCT_CUMPLIMIENTO: m.ordenes <= 10 ? 'CUMPLE' : 'EXCEDE',              SEMAFORO: m.ordenes <= 10 ? 'VERDE' : 'AMARILLO' },
      { KPI: 'Stock Critico',      VALOR: String(m.stockCritico), META: '0',     PCT_CUMPLIMIENTO: m.stockCritico === 0 ? '100%' : '—',                SEMAFORO: m.stockCritico === 0 ? 'VERDE' : 'ROJO' },
      { KPI: 'Dias sin Accidente', VALOR: String(m.safetyDays),   META: '365',   PCT_CUMPLIMIENTO: `${Math.round((m.safetyDays / 365) * 100)}%`,       SEMAFORO: m.safetyDays >= 100 ? 'VERDE' : 'AMARILLO' },
      { KPI: 'Energia KWh/t',      VALOR: String(m.energy),       META: '<200',  PCT_CUMPLIMIENTO: m.energy <= 200 ? 'CUMPLE' : 'EXCEDE',              SEMAFORO: m.energy <= 200 ? 'VERDE' : 'ROJO' },
    ];
    reportUtils.exportToPDF('Dashboard de KPIs — McVill Control Predictivo', data, 'dashboard_kpis', 'GERENCIA');
  };

  // ── MULTI-CHART DATA GENERATION (all 5 KPIs, dynamic range) ──────────────
  const getAllChartsData = () => {
    const today = new Date();
    const cfg = TIME_RANGES.find(t => t.id === timeRange) ?? TIME_RANGES[1];
    const pts = cfg.points;
    const seed = (i: number, f: number) => {
      const x = Math.sin(i + selectedPlanta.length * 2 + selectedTurno.length * 3) * 1000;
      return Math.abs(x - Math.floor(x)) * f;
    };
    const getLabel = (i: number) => {
      const d = new Date(today);
      if (timeRange === '1d')   { d.setHours(d.getHours() - (pts - 1 - i) * 3); return `${String(d.getHours()).padStart(2,'0')}h`; }
      if (timeRange === '30d')  { d.setDate(d.getDate() - (pts - 1 - i) * 2); return `${d.getDate()}/${d.getMonth()+1}`; }
      if (timeRange === '365d') { d.setMonth(d.getMonth() - (pts - 1 - i)); return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()]; }
      if (timeRange === 'all')  { d.setMonth(d.getMonth() - (pts - 1 - i)); return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()]; }
      d.setDate(d.getDate() - (pts - 1 - i)); return DAY_LABELS[d.getDay()];
    };

    if (telemetryData.length > 0) {
      const slotSize = Math.max(1, Math.floor(telemetryData.length / pts));
      return Array.from({ length: pts }, (_, i) => {
        const startIdx = i * slotSize;
        const endIdx = Math.min(telemetryData.length, (i + 1) * slotSize);
        const subset = telemetryData.slice(startIdx, endIdx);
        const label = getLabel(i);

        if (subset.length > 0) {
          const avgOEE = subset.reduce((acc, r) => acc + Number(r.oee_pct || 0), 0) / subset.length;
          const avgScrap = subset.reduce((acc, r) => acc + Number(r.scrap_pct || 0), 0) / subset.length;
          const avgEnergy = subset.reduce((acc, r) => acc + Number(r.consumo_kwh || 0), 0) / subset.length;
          const sumProd = subset.reduce((acc, r) => acc + Number(r.piezas_producidas || 0), 0);
          return {
            name: label,
            oee: Number(avgOEE.toFixed(1)),
            asistencia: Math.max(1, Math.round(metrics.presentes + seed(i, 2) - 1)),
            scrap: Number(avgScrap.toFixed(2)),
            produccion: Number((sumProd / subset.length).toFixed(1)),
            energia: Math.round(avgEnergy),
          };
        } else {
          return {
            name: label,
            oee: Number(Math.max(70, metrics.oee + seed(i, 6) - 3).toFixed(1)),
            asistencia: Math.max(1, Math.round(metrics.presentes + seed(i, 4) - 2)),
            scrap: Number(Math.max(0.3, metrics.scrap + seed(i, 0.8) - 0.4).toFixed(2)),
            produccion: Number(Math.max(4, 20 + seed(i, 6) - 3).toFixed(1)),
            energia: Math.round(Math.max(60, metrics.energy + seed(i, 30) - 15)),
          };
        }
      });
    }

    return Array.from({ length: pts }, (_, i) => {
      const label = getLabel(i);
      return {
        name: label,
        oee: 0,
        asistencia: 0,
        scrap: 0,
        produccion: 0,
        energia: 0,
        calidad: 0,
      };
    });
  };
  const allCharts = getAllChartsData();

  // ── AI REAL-TIME DIAGNOSTIC GENERATION (DYNAMIC TEXT) ─────────────────────
  const getAIDiagnostic = () => {
    const plantNames: Record<PlantaKey, string> = {
      todas: 'Todas las Plantas McVill',
      torreon_laser: 'Planta Torreón (Corte Láser)',
      torreon_mecanizado: 'Planta Torreón (Mecanizado CNC)',
      torreon_forja: 'Planta Torreón (Forja Pesada)'
    };

    const activeShiftObj = shifts.find((s: any) => s.id === selectedTurno);
    const shift = activeShiftObj ? activeShiftObj.name : 'Todos los Turnos';
    const shiftNameLower = activeShiftObj ? activeShiftObj.name.toLowerCase() : '';
    const isNocturno = shiftNameLower.includes('nocturno') || shiftNameLower.includes('t3');

    const plant = plantNames[selectedPlanta];

    if (selectedPlanta === 'todas' && selectedTurno === 'todos') {
      return {
        score: 'A+',
        summary: 'Rendimiento general estable en planta. La integración de la Red Neuronal de Inspección Visual redujo el Scrap global un 1.2% esta semana.',
        alert: 'Consumo energético en Planta Torreón Forja muestra picos inusuales entre las 02:00 y 04:00 AM. Se sugiere validar el estado de los hornos de inducción.',
        tag: 'ÓPTIMO GLOBAL'
      };
    }

    if (isNocturno) {
      return {
        score: 'B-',
        summary: `Turno Nocturno en ${plant} presenta una caída del ${100 - metrics.oee}% en la disponibilidad de operadores, afectando la continuidad de OEE.`,
        alert: 'La fatiga operativa del tercer turno correlaciona con un alza en el indicador PPM de Defectos en el área de ensamble. Inspección Visual IA incrementó la sensibilidad para contención.',
        tag: 'PREVENCIÓN URGENTE'
      };
    }

    if (selectedPlanta === 'torreon_laser') {
      return {
        score: 'A',
        summary: `El Corte Láser en Torreón opera con un Scrap mínimo del ${metrics.scrap}%, maximizando el anidamiento. El flujo de viajeros inteligentes es óptimo.`,
        alert: 'La cortadora Trumpf Laser #1 reporta vibraciones anómalas en el cabezal de corte óptico. Mantenimiento Preventivo IA programó calibración al cierre de turno.',
        tag: 'INSPECCIÓN ACTIVA'
      };
    }

    return {
      score: 'A',
      summary: `Operación estables para ${plant} en el ${shift}. Eficiencia energética se mantiene dentro del presupuesto de ${metrics.energy} KWh/T.`,
      alert: 'Ninguna alerta crítica activa. Los sensores térmicos e infrarrojos en las estaciones críticas operan dentro de rangos normales de seguridad.',
      tag: 'CONTROL TOTAL'
    };
  };

  const aiDiag = getAIDiagnostic();
  const bancoConectado = !!localStorage.getItem(BANK_API_KEY);

  return (
    <>
      {/* ── TOP CONTROL PANEL (FILTERBAR) ────────────────────────────────────── */}
      <div className="px-6 py-3.5 border-b border-white/5 bg-slate-950/80 backdrop-blur flex flex-col gap-3 z-20">
        
        {/* Row 1: Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded bg-mcvill-accent animate-pulse shadow-[0_0_8px_rgba(var(--mcvill-accent-rgb),0.7)]" />
            <div>
              <h2 className="text-[10px] font-black text-white uppercase tracking-[0.25em]">McVill Predictive Control</h2>
              <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">Industrial IoT Core v2.5</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
            >
              <FileDown size={11} /> EXPORTAR PDF
            </button>
            <button
              onClick={() => setIsBancoModalOpen(true)}
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-white text-[9px] font-black uppercase rounded-xl tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Database size={12} className="text-blue-400" /> BANCOS
            </button>
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="px-4 py-2 bg-mcvill-accent hover:opacity-90 text-slate-950 text-[9px] font-black uppercase rounded-xl tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_12px_var(--theme-glow)] whitespace-nowrap"
            >
              <Plus size={12} /> ORDEN
            </button>
          </div>
        </div>

        {/* Row 2: Selectors & Time Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Planta Selector */}
            <div className="relative">
              <select
                value={selectedPlanta}
                onChange={e => setSelectedPlanta(e.target.value as PlantaKey)}
                className="bg-slate-900 border border-slate-800 text-[10px] font-black uppercase text-white rounded-xl px-3 py-2 outline-none focus:border-mcvill-accent/50 cursor-pointer appearance-none pr-8 transition-all"
              >
                <option value="todas">🏭 Todas las Plantas</option>
                <option value="torreon_laser">⚡ Torreón - Corte Láser</option>
                <option value="torreon_mecanizado">⚙️ Torreón - Mecanizado CNC</option>
                <option value="torreon_forja">🔥 Torreón - Forja Pesada</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Turno Selector */}
            <div className="relative">
              <select
                value={selectedTurno}
                onChange={e => setSelectedTurno(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-[10px] font-black uppercase text-white rounded-xl px-3 py-2 outline-none focus:border-mcvill-accent/50 cursor-pointer appearance-none pr-8 transition-all"
              >
                <option value="todos">⏰ Todos los Turnos</option>
                {shifts.map((s: any) => {
                  const isMat = s.name.toLowerCase().includes('matutino') || s.name.toLowerCase().includes('admin');
                  const isVesp = s.name.toLowerCase().includes('vespertino');
                  const emoji = isMat ? '☀️' : isVesp ? '⛅' : '🌙';
                  return (
                    <option key={s.id} value={s.id}>
                      {emoji} {s.name} ({s.start_time.substring(0, 5)}-{s.end_time.substring(0, 5)}h)
                    </option>
                  );
                })}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Time Range Pills */}
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            {TIME_RANGES.map(t => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${
                  timeRange === t.id
                    ? 'bg-mcvill-accent/20 border border-mcvill-accent/40 text-mcvill-accent'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ── MAIN SCROLLABLE CONTENT ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        
        {errorMsg && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── 5 PREMIUM INDUSTRIAL KPI CARDS ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          {/* Card 1: Asistencia & Ausentismo */}
          <div title="Fórmula: (Operadores Presentes / Plantilla Total) * 100" className="bg-slate-900/40 border border-slate-800/40 p-3.5 rounded-2xl hover:border-slate-700/60 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Users size={15} />
              </div>
              <div className="flex gap-1.5">
                <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase font-black">
                  {Math.round((metrics.presentes / (metrics.empleados || 1)) * 100)}% PRES
                </span>
                <span className="text-[8px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded uppercase font-black">
                  {Math.round(((metrics.empleados - metrics.presentes) / (metrics.empleados || 1)) * 100)}% AUS
                </span>
              </div>
            </div>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Asistencia Operativa</p>
            <p className="text-xl font-black text-white tracking-tight leading-none">
              {metrics.presentes} <span className="text-[10px] font-bold text-slate-500">/ {metrics.empleados}</span>
            </p>
          </div>

          {/* Card 2: OEE Producción */}
          <div title="Fórmula OEE: Disponibilidad × Rendimiento × Calidad (Meta ≥ 85%)" className="bg-slate-900/40 border border-slate-800/40 p-3.5 rounded-2xl hover:border-slate-700/60 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-mcvill-accent/5 rounded-full blur-2xl group-hover:bg-mcvill-accent/10 transition-all" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="p-2 rounded-xl bg-mcvill-accent/10 border border-mcvill-accent/20 text-mcvill-accent">
                <Clock size={15} />
              </div>
              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-black ${
                metrics.oee >= 85 ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
              }`}>
                {metrics.oee >= 85 ? 'Clase Mundial' : 'Estable'}
              </span>
            </div>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Eficiencia OEE Global</p>
            <p className="text-xl font-black text-white tracking-tight leading-none">
              {metrics.oee}%
            </p>
          </div>

          {/* Card 3: Calidad / Scrap */}
          <div title="Fórmula Scrap: (Piezas Defectuosas / Producción Total) * 100" className="bg-slate-900/40 border border-slate-800/40 p-3.5 rounded-2xl hover:border-slate-700/60 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 size={15} />
              </div>
              <span className="text-[8px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded uppercase font-black">
                {Math.round(metrics.scrap * 1500)} PPM
              </span>
            </div>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Porcentaje de Scrap</p>
            <p className="text-xl font-black text-white tracking-tight leading-none">
              {metrics.scrap}%
            </p>
          </div>

          {/* Card 4: Seguridad LTI */}
          <div title="LTI (Lost Time Injury): Días consecutivos operando sin accidentes incapacitantes" className="bg-slate-900/40 border border-slate-800/40 p-3.5 rounded-2xl hover:border-slate-700/60 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <Shield size={15} />
              </div>
              <span className="text-[8px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded uppercase font-black">
                LTI FREE
              </span>
            </div>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Días Sin Accidentes</p>
            <p className="text-xl font-black text-white tracking-tight leading-none">
              {metrics.safetyDays} <span className="text-[10px] font-bold text-slate-500">DÍAS</span>
            </p>
          </div>

          {/* Card 5: Eficiencia Energética */}
          <div title="Fórmula Energía: Consumo Total KWh / Toneladas Métricas Producidas" className="bg-slate-900/40 border border-slate-800/40 p-3.5 rounded-2xl hover:border-slate-700/60 transition-all group relative overflow-hidden col-span-2 sm:col-span-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Zap size={15} />
              </div>
              <span className="text-[8px] font-mono text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded uppercase font-black">
                🎯 {metrics.energy < 200 ? 'EXCELENTE' : 'CRÍTICO'}
              </span>
            </div>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Consumo Específico</p>
            <p className="text-xl font-black text-white tracking-tight leading-none">
              {metrics.energy} <span className="text-[10px] font-bold text-slate-500">KWh/T</span>
            </p>
          </div>

        </div>

        {/* ── MULTI-CHART GRID + AI PANEL ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* 6 KPI Mini Charts (5 Line, 1 Bar) — 2 cols wide container */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {([
              { key: 'oee',        label: 'OEE Producción', unit: '%',    color: '#4fa5ff',              colorRgb: '79,165,255',              icon: '⚙️', good: (v: number) => v >= 85, type: 'line' },
              { key: 'asistencia', label: 'Asistencia',     unit: ' op',  color: '#60a5fa',              colorRgb: '96,165,250',              icon: '👥', good: (v: number) => v >= metrics.empleados * 0.9, type: 'line' },
              { key: 'scrap',      label: 'Scrap %',        unit: '%',    color: '#34d399',              colorRgb: '52,211,153',              icon: '✅', good: (v: number) => v <= 2, type: 'line' },
              { key: 'produccion', label: 'Producción',     unit: ' ton', color: '#f59e0b',              colorRgb: '245,158,11',              icon: '🏭', good: () => true, type: 'line' },
              { key: 'energia',    label: 'Energía',        unit: ' KWh', color: '#f87171',              colorRgb: '248,113,113',             icon: '⚡', good: (v: number) => v <= metrics.energy, type: 'line' },
              { key: 'calidad',    label: 'Calidad FPY',    unit: '%',    color: '#a855f7',              colorRgb: '168,85,247',              icon: '🎯', good: (v: number) => v >= 98, type: 'bar' },
            ] as const).map(({ key, label, unit, color, colorRgb, icon, good, type }) => {
              const rawVals = allCharts.map(d => d[key as keyof typeof d] as number);
              const vals = rawVals.map(v => isNaN(v) ? 0 : v);
              const min = Math.min(...vals); const max = Math.max(...vals);
              const range = max - min || 1;
              const last = vals[vals.length - 1];
              const isGood = good(last);
              const pts = vals.map((v, i) => {
                const x = (i / (vals.length - 1)) * 100;
                const y = 100 - ((v - min) / range) * 80 - 10;
                return `${x},${y}`;
              }).join(' ');
              const trend = last > vals[0] ? '▲' : last < vals[0] ? '▼' : '─';
              const trendColor = key === 'scrap' || key === 'energia'
                ? (last > vals[0] ? 'text-red-400' : 'text-emerald-400')
                : (last > vals[0] ? 'text-emerald-400' : 'text-red-400');
              return (
                <div key={key} title={`Histórico: ${label}. Cálculo de tendencia: (Valor Actual - Valor Inicial).`} className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-3.5 hover:border-slate-700/60 transition-all group relative overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(circle at top right, rgba(${colorRgb},0.04), transparent 70%)` }} />
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px]">{icon}</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                    </div>
                    <span className={`text-[8px] font-black ${trendColor}`}>{trend} {last}{unit}</span>
                  </div>
                  <svg viewBox="0 0 100 100" className="w-full h-14" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    {type === 'line' ? (
                      <>
                        <polygon points={`0,100 ${pts} 100,100`} fill={`url(#g-${key})`} />
                        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {vals.map((v, i) => {
                          const x = (i / (Math.max(1, vals.length - 1))) * 100;
                          const y = isNaN(v) ? 100 : 100 - ((v - min) / range) * 80 - 10;
                          return <circle key={i} cx={x} cy={y} r="2" fill={color} opacity={i === vals.length - 1 ? 1 : 0.5} />;
                        })}
                      </>
                    ) : (
                      <>
                        {vals.map((v, i) => {
                          const x = (i / (Math.max(1, vals.length - 1))) * 100;
                          const y = isNaN(v) ? 100 : 100 - ((v - min) / range) * 80 - 10;
                          const barWidth = 100 / (vals.length * 1.8);
                          return (
                            <rect 
                              key={i}
                              x={Math.max(0, x - barWidth/2)}
                              y={y}
                              width={barWidth}
                              height={Math.max(0, 100 - y)}
                              fill={`url(#g-${key})`}
                              stroke={color}
                              strokeWidth="1"
                              opacity={i === vals.length - 1 ? 1 : 0.7}
                              rx="1"
                            />
                          );
                        })}
                      </>
                    )}
                  </svg>
                  <div className="flex justify-between mt-1">
                    {allCharts.map((d, i) => <span key={i} className="text-[7px] font-black text-slate-600 flex-1 text-center uppercase">{d.name}</span>)}
                  </div>
                  <div className={`absolute top-3 right-3 w-1.5 h-1.5 rounded-full ${isGood ? 'bg-emerald-400' : 'bg-red-400'} shadow-[0_0_6px_currentColor]`} />
                </div>
              );
            })}

            {/* End of 6 charts */}
          </div>

          {/* AI Neural Diagnostics & Event Log: Column 3 */}
          <div className="bg-slate-900/30 border border-slate-800/40 rounded-2xl p-4 flex flex-col justify-between gap-4">
            
            {/* AI Diagnosis Header */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="text-mcvill-accent animate-pulse" size={15} />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Gemini 2.5 Diagnóstico</h3>
                </div>
                <span className="text-[9px] font-black font-mono text-mcvill-accent bg-mcvill-accent/15 border border-mcvill-accent/30 px-2 py-0.5 rounded-lg">
                  Score: {aiDiag.score}
                </span>
              </div>

              {/* AI Diagnosis Box Content */}
              <div className="bg-slate-950/70 border border-slate-800/50 rounded-xl p-3.5 space-y-3">
                
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                  <p className="text-[10px] text-slate-300 leading-normal">
                    {aiDiag.summary}
                  </p>
                </div>

                <div className="border-t border-slate-900 pt-2 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1 shrink-0" />
                  <p className="text-[9px] text-slate-500 leading-normal italic">
                    <strong className="text-slate-400 not-italic uppercase text-[8px] tracking-wider block mb-0.5">Alerta Predictiva:</strong>
                    {aiDiag.alert}
                  </p>
                </div>

              </div>
            </div>

            {/* Quick Actions Panel removido para colocar botones en la cabecera */}

          </div>

        </div>

        {/* ── ESCENARIO DE ASISTENCIA: OPERADORES POR TURNO Y PUESTO ──────────── */}
        <div title="Fórmula Ausentismo: 1 - (Presentes / Empleados). Penalización de Nómina = 1 día base x Falta Injustificada." className="bg-slate-900/30 border border-slate-800/40 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="text-blue-400" size={15} />
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Escenario de Asistencia</h3>
              <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-lg uppercase tracking-widest">
                {selectedTurno === 'todos' ? 'Todos los Turnos' : shifts.find((s: any) => s.id === selectedTurno)?.name || 'Turno Activo'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[8px] text-slate-500 font-black uppercase">Presentes: {metrics.presentes}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[8px] text-slate-500 font-black uppercase">Ausentes: {metrics.empleados - metrics.presentes}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Por Turno */}
            <div className="bg-slate-950/50 border border-slate-800/40 rounded-xl p-3">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5"><Clock size={10} /> Por Turno</p>
              <div className="space-y-2">
                {shifts.filter((s: any) => s.is_active).length > 0 ? (
                  shifts.filter((s: any) => s.is_active).map((shift: any, i: number) => {
                    const shiftColors = ['bg-amber-400', 'bg-blue-400', 'bg-purple-400', 'bg-emerald-400', 'bg-rose-400'];
                    const color = shiftColors[i % shiftColors.length];
                    const shiftEmps = activeEmployeesList.filter((e: any) => e.shift_id === shift.id);
                    const shiftTotal = shiftEmps.length;
                    const shiftPresent = shiftEmps.filter((e: any) => presentIds.has(e.id)).length;
                    const label = `${shift.name} ${(shift.start_time || '').slice(0, 5)}-${(shift.end_time || '').slice(0, 5)}`;
                    return (
                      <div key={shift.id}>
                        <div className="flex justify-between text-[8px] font-black mb-1">
                          <span className="text-slate-400">{label}</span>
                          <span className="text-white">{shiftPresent}<span className="text-slate-600">/{shiftTotal}</span></span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all duration-700`}
                            style={{ width: shiftTotal > 0 ? `${Math.round((shiftPresent / shiftTotal) * 100)}%` : '0%' }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[8px] text-slate-600 text-center py-4">Sin turnos configurados</p>
                )}
              </div>
            </div>

            {/* Por Puesto */}
            <div className="bg-slate-950/50 border border-slate-800/40 rounded-xl p-3">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5"><Factory size={10} /> Por Puesto</p>
              <div className="space-y-1.5">
                {positionStats.length > 0 ? (
                  positionStats.slice(0, 5).map(p => {
                    const missing = p.total - p.presentes;
                    return (
                      <div key={p.puesto} className="flex items-center justify-between">
                        <span className="text-[8px] text-slate-400 font-black truncate flex-1">{p.puesto}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[8px] font-black text-white">{p.presentes}/{p.total}</span>
                          {missing > 0 && (
                            <span className="text-[7px] font-black text-red-400 bg-red-500/10 px-1 rounded">-{missing}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[8px] text-slate-600 text-center py-4">Sin datos de puestos</p>
                )}
              </div>
            </div>

            {/* Alertas de Cobertura */}
            <div title="Lógica Cobertura: Riesgo detona si capacidad < 85%. Generación predictiva de Horas Extras al 200% para cubrir huecos." className="bg-slate-950/50 border border-slate-800/40 rounded-xl p-3">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5"><AlertTriangle size={10} className="text-amber-400" /> Cobertura</p>
              <div className="space-y-2">
                {metrics.empleados - metrics.presentes > 0 ? (
                  <>
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      <p className="text-[8px] text-red-300 font-black">{metrics.empleados - metrics.presentes} operadores sin registrar entrada</p>
                    </div>
                    {positionStats.filter(p => p.total > 0 && (p.presentes / p.total) < 0.85).slice(0, 1).map(p => (
                      <div key={p.puesto} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <p className="text-[8px] text-amber-300 font-black">
                          {p.puesto} con cobertura del {Math.round((p.presentes / p.total) * 100)}% — riesgo medio
                        </p>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-2">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <p className="text-[8px] text-emerald-300 font-black">Cobertura completa en todos los puestos</p>
                  </div>
                )}
                <div className="mt-3 pt-2 border-t border-slate-800/50">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Cobertura global</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-mcvill-accent to-emerald-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((metrics.presentes / (metrics.empleados || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-white">{Math.round((metrics.presentes / (metrics.empleados || 1)) * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── DEMOGRAFÍA OPERATIVA ─────────────────────────────────────────── */}
        <div title="Fórmulas RRHH: Porcentajes calculados base total (Headcount). Pirámide evalúa índice de jubilación y planes de sucesión (8% personal > 55 años)." className="bg-slate-900/30 border border-slate-800/40 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-pink-400" size={15} />
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Demografía Operativa</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Distribución por Género (Pie Chart de Rebanadas) */}
            <div className="bg-slate-950/50 border border-slate-800/40 p-5 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-pink-500/10 transition-colors" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
              
              {/* Gráfica Circular (Doughnut) */}
              <div className="relative flex items-center justify-center shrink-0">
                {/* Outer Glow */}
                <div className="absolute inset-0 rounded-full bg-mcvill-accent/5 blur-xl scale-110" />
                
                {/* SVG Pie Chart */}
                <svg width="140" height="140" viewBox="0 0 100 100" className="relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-500">
                  {/* Fondo Rosa (Mujeres) */}
                  <circle cx="50" cy="50" r="35" fill="none" stroke="#f472b6" strokeWidth="18" className="opacity-90" />
                  
                  {/* Progreso Azul (Hombres) dinámico */}
                  <circle 
                    cx="50" cy="50" r="35" 
                    fill="none" 
                    stroke="var(--theme-accent)" 
                    strokeWidth="18" 
                    strokeDasharray={`${(Math.round(metrics.empleados * 0.68) / metrics.empleados) * 219.91} 219.91`} 
                    strokeDashoffset={219.91 * 0.25} 
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                    style={{ filter: 'drop-shadow(0 0 6px var(--theme-glow))' }}
                  />
                  
                  {/* Centro oscuro */}
                  <circle cx="50" cy="50" r="26" className="fill-slate-950" />
                  
                  {/* Texto Central */}
                  <text x="50" y="46" textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="900" className="uppercase tracking-widest">TOTAL</text>
                  <text x="50" y="60" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="900">{metrics.empleados}</text>
                </svg>
              </div>

              {/* Leyenda y Datos */}
              <div className="flex flex-col gap-5 flex-1 w-full">
                {/* Hombres */}
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded bg-mcvill-accent shadow-[0_0_10px_rgba(0,128,255,0.6)]" />
                    <div>
                      <span className="text-[11px] font-black text-white uppercase tracking-widest block leading-none mb-1">Hombres</span>
                      <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">{Math.round(metrics.empleados * 0.68)} operarios</span>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-mcvill-accent drop-shadow-[0_0_8px_rgba(0,128,255,0.4)]">{Math.round((Math.round(metrics.empleados * 0.68) / metrics.empleados) * 100)}%</span>
                </div>

                {/* Mujeres */}
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded bg-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.6)]" />
                    <div>
                      <span className="text-[11px] font-black text-white uppercase tracking-widest block leading-none mb-1">Mujeres</span>
                      <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">{metrics.empleados - Math.round(metrics.empleados * 0.68)} operarias</span>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.4)]">{Math.round(((metrics.empleados - Math.round(metrics.empleados * 0.68)) / metrics.empleados) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Distribución por Edades (Pirámide Real) */}
            <div className="bg-slate-950/50 border border-slate-800/40 p-4 rounded-xl flex flex-col">
              <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest mb-3">
                <span className="text-slate-400">Pirámide Poblacional</span>
                <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Sucesión: 8% (55+)</span>
              </div>
              
              <div className="flex-1 flex flex-col justify-between gap-1.5">
                <div className="flex justify-between px-8 text-[6px] font-black text-slate-500 mb-1">
                  <span>HOMBRES</span>
                  <span>MUJERES</span>
                </div>
                {[
                  { range: '55+',   m: 5,  f: 3 },
                  { range: '46-55', m: 8,  f: 4 },
                  { range: '36-45', m: 15, f: 10 },
                  { range: '26-35', m: 22, f: 18 },
                  { range: '18-25', m: 10, f: 5 }
                ].map(b => (
                  <div key={b.range} className="flex items-center gap-2 w-full group">
                    {/* Hombres (Barra Izquierda) */}
                    <div className="flex-1 flex justify-end items-center h-2.5">
                      <div className="h-full bg-mcvill-accent/60 group-hover:bg-mcvill-accent transition-all rounded-l-full relative" style={{ width: `${(b.m / 25) * 100}%` }}>
                         <span className="absolute -left-5 top-1/2 -translate-y-1/2 text-[6px] font-bold text-slate-400 opacity-0 group-hover:opacity-100">{b.m}%</span>
                      </div>
                    </div>
                    {/* Rango de Edad */}
                    <span className="text-[7px] font-black text-slate-300 w-10 text-center bg-slate-900 border border-slate-800/60 rounded py-0.5 whitespace-nowrap">{b.range}</span>
                    {/* Mujeres (Barra Derecha) */}
                    <div className="flex-1 flex justify-start items-center h-2.5">
                      <div className="h-full bg-pink-500/60 group-hover:bg-pink-400 transition-all rounded-r-full relative" style={{ width: `${(b.f / 25) * 100}%` }}>
                         <span className="absolute -right-5 top-1/2 -translate-y-1/2 text-[6px] font-bold text-slate-400 opacity-0 group-hover:opacity-100">{b.f}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── PRIMA DE ANTIGÜEDAD 15 AÑOS (Art. 162 LFT) ─────────────────── */}
        <div className="bg-slate-900/40 border border-amber-500/20 rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Award size={16} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Prima de Antigüedad — 15 años</h3>
                <p className="text-[9px] text-slate-500 mt-0.5">Art. 162 LFT · 12 días × años · tope 2× SMG ($557.60/día)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-amber-400/70 uppercase tracking-widest">Pasivo Total</p>
              <p className="text-2xl font-black text-amber-400 tracking-tight leading-none">
                {primaData
                  ? `$${primaData.totalPasivo.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  : '—'}
              </p>
              <p className="text-[8px] text-slate-500 mt-0.5">
                {primaData ? `${primaData.elegibles} empleado${primaData.elegibles !== 1 ? 's' : ''} elegible${primaData.elegibles !== 1 ? 's' : ''}` : 'Cargando...'}
              </p>
            </div>
          </div>

          {primaData && primaData.top5.length > 0 ? (
            <div className="relative z-10">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 mb-1.5 px-2">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Empleado</span>
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-right">Años</span>
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-right">Sal. diario</span>
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-right">Prima</span>
              </div>
              <div className="space-y-1">
                {primaData.top5.map((emp, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center bg-slate-800/30 rounded-xl px-2 py-2 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-black text-amber-500/60 w-4 shrink-0">#{i + 1}</span>
                      <span className="text-[10px] font-semibold text-slate-200 truncate">{emp.nombre}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 text-right tabular-nums">{emp.anos} <span className="text-slate-600 font-normal">años</span></span>
                    <span className="text-[10px] font-mono text-slate-400 text-right tabular-nums">${emp.salarioDiario.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[10px] font-black text-amber-400 text-right tabular-nums">${emp.prima.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
              {primaData.elegibles > 5 && (
                <p className="text-[8px] text-slate-600 text-center mt-2">
                  + {primaData.elegibles - 5} empleado{primaData.elegibles - 5 !== 1 ? 's' : ''} más · ver detalle en módulo RH
                </p>
              )}
            </div>
          ) : primaData && primaData.elegibles === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-3 relative z-10">
              Ningún empleado activo cumple 15 años de antigüedad aún.
            </p>
          ) : (
            <div className="flex items-center justify-center py-3 relative z-10">
              <Loader2 size={14} className="animate-spin text-amber-500/50" />
            </div>
          )}
        </div>

        {/* ── GRID DE ACCESOS RÁPIDOS ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Inventario Físico', icon: Package, val: 'Materia' },
            { label: 'Reportes PDF', icon: FileText, val: 'Export' },
            { label: 'Incidentes HSE', icon: Shield, val: 'Seguro' },
            { label: 'Layout de Planta', icon: Factory, val: 'Digital' },
            { label: 'Órdenes Activas', icon: Wrench, val: metrics.ordenes.toString() },
            { label: 'Inspección Neural', icon: Cpu, val: 'Visual IA' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/20 border border-slate-800/30 p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all hover:border-slate-700/50">
              <item.icon size={15} className="text-slate-500 mb-1" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
              <span className="text-[7px] font-mono text-mcvill-accent tracking-widest uppercase mt-0.5 font-black">{item.val}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Modals */}
      {isOrderModalOpen && (
        <LanzarOrdenModal
          onClose={() => setIsOrderModalOpen(false)}
          onCreated={() => { setIsOrderModalOpen(false); loadDbStats(); }}
        />
      )}
      {isBancoModalOpen && (
        <EnlazarBancoModal
          onClose={() => setIsBancoModalOpen(false)}
          onNavigateToBanco={onNavigateToBanco ?? (() => setIsBancoModalOpen(false))}
        />
      )}
    </>
  );
};
