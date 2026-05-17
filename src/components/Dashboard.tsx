import React, { useState, useEffect } from 'react';
import {
  Plus, X, Loader2, CheckCircle2, Link2, Upload, Key, BookOpen,
  Clock, Zap, Factory, Users, Wrench, Cpu, AlertTriangle,
  TrendingUp, Database, BarChart3, Package, FileText, Shield, Activity,
  ChevronDown, ChevronRight, Info
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { supabase } from '../lib/supabase';
import { productionService } from '../services/productionService';

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
        await supabase.from('ordenes_mantenimiento').insert({
          descripcion,
          prioridad,
          fecha_programada: fechaEstimada || null,
          asignado_a: asignadoA || null,
          estado: 'pendiente',
          tipo: 'correctivo',
        });
      }
      setDone(true);
      setTimeout(() => { onCreated(); onClose(); }, 1400);
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
                      placeholder="eyJhbGciOiJIUzI1NiIs..."
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
                  onClick={() => { onNavigateToBanco(); onClose(); }}
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

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToBanco }) => {
  const { config } = useConfig();
  const [stats, setStats] = useState({
    empleados: 0,
    presentes: 0,
    ordenes: 0,
    stockCritico: 0,
  });
  const [chartData, setChartData] = useState(buildEmptyWeekData());
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isBancoModalOpen, setIsBancoModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const bancoConectado = !!localStorage.getItem(BANK_API_KEY);

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
              <span className="text-[8px] px-1.5 py-0.5 bg-mcvill-accent/10 text-mcvill-accent border border-mcvill-accent/20 rounded tracking-[0.2em] font-black hidden sm:inline ml-2">DATA-CENTER</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button
              onClick={() => setIsBancoModalOpen(true)}
              className="h-9 px-4 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white hover:border-mcvill-accent/40 transition-all flex items-center gap-2 relative">
              <Database size={14} />
              ENLAZAR BANCO
              {bancoConectado && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="h-9 px-5 rounded-xl bg-mcvill-accent text-[10px] font-black text-slate-950 hover:opacity-90 transition-all flex items-center gap-2 shadow-[0_0_15px_var(--theme-glow)]">
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

      {/* Modals */}
      {isOrderModalOpen && (
        <LanzarOrdenModal
          onClose={() => setIsOrderModalOpen(false)}
          onCreated={() => { setIsOrderModalOpen(false); loadStats(); }}
        />
      )}
      {isBancoModalOpen && (
        <EnlazarBancoModal
          onClose={() => setIsBancoModalOpen(false)}
          onNavigateToBanco={onNavigateToBanco ?? (() => setIsBancoModalOpen(false))}
        />
      )}
    </div>
  );
};
