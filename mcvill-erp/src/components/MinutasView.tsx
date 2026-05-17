import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollText, Plus, Loader2, Download, Mail, MessageSquare, Zap,
  Trash2, Calendar, Users, FileText, X, ClipboardList, Clock, CheckCircle2,
  AlertCircle, Save
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { aiService } from '../services/aiService';
import { whatsappService } from '../services/whatsappService';
import { reportUtils } from '../utils/reportUtils';
import { appConfirm } from '../lib/dialogs';
import { Toast } from './common/Toast';
import { useConfig } from '../contexts/ConfigContext';

type Tab = 'nueva' | 'historial';

const HISTORIAL_KEY = 'mcvill_minutas_historial';

const TIPOS = ['Reunión Interna', 'Llamada con Cliente', 'Visita a Planta', 'Reunión de Proyecto', 'Demo / Presentación', 'Revisión de KPIs', 'Junta de Seguimiento'];

interface MinutaForm {
  tipo:          string;
  fecha:         string;
  hora:          string;
  proyecto:      string;
  lugar:         string;
  asistentes:    string;
  puntos:        string;
  acuerdos:      string;
  seguimiento:   string;
}

interface Minuta {
  id:        string;
  tipo:      string;
  fecha:     string;
  proyecto:  string;
  contenido: string;
  created_at: string;
}

// Shape returned by Supabase (maps minutas table columns)
interface MinutaDB {
  id:          string;
  titulo:      string;
  fecha:       string;
  lugar:       string | null;
  participantes: string | null;
  acta_texto:  string | null;
  acuerdos:    string | null;
  created_at:  string;
}

const emptyForm: MinutaForm = {
  tipo:        'Reunión Interna',
  fecha:       new Date().toISOString().slice(0, 10),
  hora:        new Date().toTimeString().slice(0, 5),
  proyecto:    '',
  lugar:       '',
  asistentes:  '',
  puntos:      '',
  acuerdos:    '',
  seguimiento: '',
};

function getSystemPrompt(companyName: string, logoText: string, developerName: string): string { return `Eres el asistente ejecutivo de ${companyName}, empresa metalmecánica industrial.
Tu única función es generar ACTAS DE REUNIÓN formales, ejecutivas y completas en español.

El formato obligatorio de cada acta es:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTA DE REUNIÓN — **${companyName}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Tipo:** [tipo]            **Fecha:** [fecha]     **Hora:** [hora]
**Proyecto / Tema:** [proyecto]
**Lugar / Modalidad:** [lugar]

### PARTICIPANTES:
[lista de participantes, uno por renglón con nombre y cargo si se proveyó]

### PUNTOS TRATADOS:
[desarrolla y numera cada punto tratado con detalle ejecutivo, usa **negritas** para resaltar conceptos clave]

### ACUERDOS Y COMPROMISOS:
[lista los acuerdos con **responsable** y **fecha límite** si se indicó]

### PRÓXIMO SEGUIMIENTO:
[fecha y puntos a revisar en la siguiente reunión]

---
**APROBADO POR:**
_________________________          _________________________
[Primer participante]               [Segundo participante]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Generado por ${logoText} | ${developerName}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usa lenguaje formal y conciso. Desarrolla cada punto con claridad. No omitas ninguna sección. Usa **Markdown** para resaltar lo importante.
Usa lenguaje formal y conciso. Desarrolla cada punto con claridad. No omitas ninguna sección.`; }

// Convert a MinutaDB row → the local Minuta shape used by UI
function dbToMinuta(row: MinutaDB): Minuta {
  return {
    id:         row.id,
    tipo:       row.titulo.split(' | ')[0] || row.titulo,
    fecha:      row.fecha,
    proyecto:   row.titulo.split(' | ')[1] || row.titulo,
    contenido:  row.acta_texto || '',
    created_at: row.created_at,
  };
}

export const MinutasView: React.FC = () => {
  const { config } = useConfig();
  const SYSTEM_PROMPT = getSystemPrompt(config.companyName, config.logoText, config.developerName);
  const [activeTab, setActiveTab]         = useState<Tab>('nueva');
  const [form, setForm]                   = useState<MinutaForm>({ ...emptyForm });
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating]   = useState(false);
  const [shareEmail, setShareEmail]       = useState('');
  const [shareWhatsApp, setShareWhatsApp] = useState('');
  const [shareTeams, setShareTeams]       = useState('');
  const [notification, setNotification]   = useState<{ message: string; type: 'success'|'error'|'info' } | null>(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistorial, setSelectedHistorial] = useState<Minuta | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');

  // Historial: try to preload from localStorage while Supabase loads
  const [historial, setHistorial] = useState<Minuta[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORIAL_KEY) || '[]'); } catch { return []; }
  });

  const notify = (message: string, type: 'success'|'error'|'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // ── Load history from Supabase ────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('minutas')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(20);

      if (error) throw error;

      const rows = (data as MinutaDB[] || []).map(dbToMinuta);
      setHistorial(rows);
      // Keep localStorage in sync as a backup
      localStorage.setItem(HISTORIAL_KEY, JSON.stringify(rows));
    } catch (err) {
      console.error('Error loading minutas from Supabase:', err);
      notify('Error al cargar historial de minutas.', 'error');
      // Fall back to localStorage if Supabase fails
      try {
        const cached = JSON.parse(localStorage.getItem(HISTORIAL_KEY) || '[]');
        setHistorial(cached);
      } catch { /* ignore */ }
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Generate minuta with AI ───────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!form.proyecto.trim() || !form.asistentes.trim()) {
      notify('Completa al menos el Proyecto y los Participantes', 'error');
      return;
    }
    setIsGenerating(true);
    setGeneratedText('');
    try {
      const prompt = `Genera el acta formal para la siguiente reunión:

TIPO: ${form.tipo}
FECHA: ${form.fecha}   HORA: ${form.hora}
PROYECTO / TEMA: ${form.proyecto}
LUGAR / MODALIDAD: ${form.lugar || `Oficinas ${config.brandName}`}
PARTICIPANTES: ${form.asistentes}
PUNTOS TRATADOS: ${form.puntos || '(No especificados)'}
ACUERDOS Y COMPROMISOS: ${form.acuerdos || '(No especificados)'}
PRÓXIMO SEGUIMIENTO: ${form.seguimiento || '(No especificado)'}`;

      const result = await aiService.askGemini(prompt, undefined, [], SYSTEM_PROMPT);
      setGeneratedText(result);
    } catch (e) {
      console.error(e);
      notify('Error al generar la minuta. Verifica la conexión IA.', 'error');
    }
    setIsGenerating(false);
  }, [form]);

  // ── Save to Supabase (with localStorage fallback) ─────────────────────────
  const handleSave = async () => {
    if (!generatedText) { notify('Genera la minuta primero', 'error'); return; }
    setIsSaving(true);

    // Build the titulo as "tipo | proyecto" so we can reconstruct both fields
    const titulo = `${form.tipo} | ${form.proyecto}`;

    // Attempt Supabase insert
    let savedToSupabase = false;
    try {
      // Get tenant_id from profiles
      const { data: { user } } = await supabase.auth.getUser();
      let tenantId: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
        tenantId = profile?.tenant_id ?? null;
      }

      const { error } = await supabase.from('minutas').insert({
        titulo,
        fecha:         form.fecha,
        lugar:         form.lugar || null,
        participantes: form.asistentes || null,
        acta_texto:    generatedText,
        acuerdos:      form.acuerdos || null,
        created_by:    user?.id ?? null,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });

      if (error) throw error;
      savedToSupabase = true;
      await loadHistory();
      notify('Minuta guardada en Supabase');
    } catch (err) {
      console.error('Supabase save failed, falling back to localStorage:', err);
    }

    // Fallback to localStorage if Supabase failed
    if (!savedToSupabase) {
      const entry: Minuta = {
        id:         Date.now().toString(),
        tipo:       form.tipo,
        fecha:      form.fecha,
        proyecto:   form.proyecto,
        contenido:  generatedText,
        created_at: new Date().toISOString(),
      };
      const next = [entry, ...historial];
      setHistorial(next);
      localStorage.setItem(HISTORIAL_KEY, JSON.stringify(next));
      notify('Minuta guardada localmente (sin conexión)', 'info');
    }

    setIsSaving(false);
  };

  // ── Delete from Supabase (with localStorage fallback) ────────────────────
  const handleDelete = async (id: string) => {
    if (!await appConfirm('¿ELIMINAR ESTA MINUTA DEL HISTORIAL?')) return;

    // Try Supabase delete first (works for UUIDs); fallback for localStorage IDs
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      try {
        const { error } = await supabase.from('minutas').delete().eq('id', id);
        if (error) throw error;
        await loadHistory();
        return;
      } catch (err) {
        console.error('Supabase delete failed:', err);
      }
    }

    // localStorage fallback
    const next = historial.filter(m => m.id !== id);
    setHistorial(next);
    localStorage.setItem(HISTORIAL_KEY, JSON.stringify(next));
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const buildShareText = (minuta?: string) => minuta || generatedText;

  const handleShareEmail = (minuta?: string) => {
    if (!shareEmail) { notify('Ingresa un correo electrónico', 'error'); return; }
    const text = buildShareText(minuta);
    const subject = encodeURIComponent(`Acta de Reunión — ${form.proyecto} (${form.fecha})`);
    const body    = encodeURIComponent(text);
    window.open(`mailto:${shareEmail}?subject=${subject}&body=${body}`, '_blank');
    notify('Cliente de correo abierto');
  };

  const handleShareWhatsApp = (minuta?: string) => {
    if (!shareWhatsApp) { notify('Ingresa un número de WhatsApp', 'error'); return; }
    const text = buildShareText(minuta);
    window.open(whatsappService.generateLink(shareWhatsApp, text), '_blank');
    notify('WhatsApp abierto con la minuta');
  };

  const handleShareTeams = (minuta?: string) => {
    if (!shareTeams) { notify('Ingresa el email del destinatario en Teams', 'error'); return; }
    const text = encodeURIComponent(buildShareText(minuta));
    window.open(`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(shareTeams)}&message=${text}`, '_blank');
    notify('Teams abierto con la minuta');
  };

  const handleExportPDF = (minuta?: string, proyecto?: string) => {
    const content = buildShareText(minuta);
    const rows = content.split('\n').filter(Boolean).map(line => ({ CONTENIDO: line }));
    reportUtils.exportToPDF(
      `Acta — ${proyecto || form.proyecto}`,
      rows,
      `acta_${(proyecto || form.proyecto).replace(/\s+/g, '_').toLowerCase()}`,
      'MINUTAS'
    );
    notify('PDF generado');
  };

  // Load a saved minuta into the viewer when clicked in historial
  const handleLoadMinuta = (m: Minuta) => {
    setSelectedHistorial(m);
    setViewMode('preview');
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    // Simple executive renderer
    const lines = text.split('\n');
    return (
      <div className="font-sans text-slate-300 space-y-2">
        {lines.map((line, i) => {
          let content = line;
          
          // Bold: **text**
          const boldParts = content.split(/(\*\*.*?\*\*)/g);
          const renderedLine = boldParts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="text-white font-black">{part.slice(2, -2)}</strong>;
            }
            return part;
          });

          if (line.startsWith('###')) {
            return <h4 key={i} className="text-[11px] font-black text-blue-500 uppercase tracking-widest mt-6 mb-2">{line.replace('###', '').trim()}</h4>;
          }
          if (line.startsWith('---')) {
            return <hr key={i} className="border-white/10 my-4" />;
          }
          if (line.startsWith('━━━━━━━━')) {
            return <div key={i} className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent my-4" />;
          }
          
          return <p key={i} className="text-[10px] leading-relaxed">{renderedLine}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {notification && <Toast message={notification.message} type={notification.type} isVisible={!!notification} onClose={() => setNotification(null)} />}

      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ScrollText className="text-blue-500" size={16} />
            <h1 className="text-base font-black text-white tracking-tighter uppercase">
              MINUTAS <span className="text-blue-500">& ACTAS</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              Gestión Ejecutiva <span className="hidden sm:inline px-1.5 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[8px]">MINUTA-PRO</span>
            </p>
          </div>

        </div>
        <div className="flex items-center gap-2">
          {isLoadingHistory && <Loader2 size={12} className="animate-spin text-slate-500" role="status" aria-label="Cargando" />}
          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
            {historial.length} actas guardadas
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 flex items-center gap-3 shrink-0">
        <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
          {([{ id: 'nueva', label: 'Nueva Minuta' }, { id: 'historial', label: `Historial (${historial.length})` }] as { id: Tab; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={clsx('px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all',
                activeTab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {/* ── Nueva Minuta ─────────────────────────────────────────────────── */}
        {activeTab === 'nueva' && (
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 h-full">

            {/* Left: Form */}
            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList size={14} className="text-blue-500" /> Datos de la Reunión
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Tipo</label>
                    <select className="cyber-select w-full" value={form.tipo}
                      onChange={e => setForm({ ...form, tipo: e.target.value })}>
                      {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Fecha</label>
                    <input type="date" className="cyber-input w-full" value={form.fecha}
                      onChange={e => setForm({ ...form, fecha: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Hora</label>
                    <input type="time" className="cyber-input w-full" value={form.hora}
                      onChange={e => setForm({ ...form, hora: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Lugar / Modalidad</label>
                    <input className="cyber-input w-full" placeholder={`Oficinas ${config.brandName} / Teams`}
                      value={form.lugar} onChange={e => setForm({ ...form, lugar: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Proyecto / Tema *</label>
                  <input className="cyber-input w-full" placeholder="Ej: Revisión Q2 — Línea de Corte"
                    value={form.proyecto} onChange={e => setForm({ ...form, proyecto: e.target.value })} />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Participantes * (uno por línea)</label>
                  <textarea rows={3} className="cyber-input w-full resize-none"
                    placeholder="Ing. Manuel Chávez — Gerente General&#10;Sandra Rodríguez — Proyectos&#10;Jorge Herrera — Calidad"
                    value={form.asistentes} onChange={e => setForm({ ...form, asistentes: e.target.value })} />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Puntos Tratados</label>
                  <textarea rows={3} className="cyber-input w-full resize-none"
                    placeholder="1. Revisión de indicadores de producción&#10;2. Estado del pedido #OT-2026-045&#10;3. Propuesta de mejora en soldadura"
                    value={form.puntos} onChange={e => setForm({ ...form, puntos: e.target.value })} />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Acuerdos y Compromisos</label>
                  <textarea rows={3} className="cyber-input w-full resize-none"
                    placeholder="1. Sandra enviará cotización revisada el lunes&#10;2. Jorge auditará estación de soldadura esta semana"
                    value={form.acuerdos} onChange={e => setForm({ ...form, acuerdos: e.target.value })} />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Próximo Seguimiento</label>
                  <input className="cyber-input w-full" placeholder="Próxima semana — revisar avance de acuerdos"
                    value={form.seguimiento} onChange={e => setForm({ ...form, seguimiento: e.target.value })} />
                </div>

                <button onClick={handleGenerate} disabled={isGenerating}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-xl text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60">
                  {isGenerating
                    ? <><Loader2 size={16} className="animate-spin" role="status" aria-label="Cargando" /> Generando Acta IA...</>
                    : <><ScrollText size={14} /> Generar Minuta con IA</>}
                </button>
              </div>
            </div>

            {/* Right: Result + Share */}
            <div className="space-y-4">
              {/* Generated minuta */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden flex flex-col" style={{ minHeight: 320 }}>
                <div className="px-4 py-2 border-b border-white/5 bg-slate-900/60 flex items-center justify-between shrink-0">
                  <div className="flex bg-black/40 p-0.5 rounded-lg">
                    <button onClick={() => setViewMode('editor')} className={clsx("px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all", viewMode === 'editor' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white')}>Editor</button>
                    <button onClick={() => setViewMode('preview')} className={clsx("px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all", viewMode === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white')}>Vista Ejecutiva</button>
                  </div>
                  {generatedText && (
                    <button onClick={handleSave} disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                      {isSaving ? <Loader2 size={11} className="animate-spin" role="status" aria-label="Cargando" /> : <CheckCircle2 size={11} />}
                      {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                  )}
                </div>
                {generatedText ? (
                  <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                    {viewMode === 'editor' ? (
                      <textarea 
                        className="w-full h-full bg-transparent border-none text-[10px] text-slate-300 font-mono leading-relaxed resize-none focus:outline-none"
                        value={generatedText}
                        onChange={(e) => setGeneratedText(e.target.value)}
                      />
                    ) : (
                      <div className="bg-slate-900/30 p-6 rounded-lg border border-white/5 shadow-2xl">
                        {renderMarkdown(generatedText)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center px-8">
                      <ScrollText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-600 font-black text-[11px] uppercase tracking-widest">
                        {isGenerating ? 'Generando acta...' : 'Completa el formulario y presiona "Generar"'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Share panel */}
              {generatedText && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                    Compartir Acta
                  </h3>

                  {/* PDF */}
                  <button onClick={() => handleExportPDF()}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5">
                    <Download size={12} /> Descargar PDF
                  </button>

                  {/* Email */}
                  <div className="flex gap-2">
                    <input className="cyber-input flex-1 text-[10px]" type="email" placeholder={`correo@${config.supportEmail.split('@')[1]}`}
                      value={shareEmail} onChange={e => setShareEmail(e.target.value)} />
                    <button onClick={() => handleShareEmail()}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase rounded-lg transition-all active:scale-95 flex items-center gap-1">
                      <Mail size={11} /> Email
                    </button>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex gap-2">
                    <input className="cyber-input flex-1 text-[10px]" type="tel" placeholder="+52 81 1234 5678"
                      value={shareWhatsApp} onChange={e => setShareWhatsApp(e.target.value)} />
                    <button onClick={() => handleShareWhatsApp()}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg transition-all active:scale-95 flex items-center gap-1">
                      <MessageSquare size={11} /> WA
                    </button>
                  </div>

                  {/* Teams */}
                  <div className="flex gap-2">
                    <input className="cyber-input flex-1 text-[10px]" type="email" placeholder={`usuario@${config.supportEmail.split('@')[1]}`}
                      value={shareTeams} onChange={e => setShareTeams(e.target.value)} />
                    <button onClick={() => handleShareTeams()}
                      className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-[9px] font-black uppercase rounded-lg transition-all active:scale-95 flex items-center gap-1.5">
                      <Zap size={11} /> Teams
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Historial ────────────────────────────────────────────────────── */}
        {activeTab === 'historial' && (
          <div className="p-5 flex gap-4 h-full">
            {/* Left panel: list */}
            <div className="w-72 shrink-0 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  {isLoadingHistory ? 'Cargando...' : `${historial.length} minutas`}
                </h3>
                <button onClick={loadHistory} disabled={isLoadingHistory}
                  className="text-[8px] font-black text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-all disabled:opacity-40">
                  {isLoadingHistory ? <Loader2 size={10} className="animate-spin" role="status" aria-label="Cargando" /> : 'Actualizar'}
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12 gap-2">
                  <Loader2 className="w-5 h-5 text-slate-500 animate-spin" role="status" aria-label="Cargando" />
                  <span className="text-sm text-slate-500">Cargando...</span>
                </div>
              ) : historial.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <ScrollText className="w-10 h-10 text-slate-700" />
                  <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">Sin minutas</p>
                  <button onClick={() => setActiveTab('nueva')}
                    className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-500 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                    + Nueva
                  </button>
                </div>
              ) : (
                historial.map(m => (
                  <button key={m.id} onClick={() => handleLoadMinuta(m)}
                    className={clsx(
                      'w-full text-left px-3 py-2.5 rounded-xl border transition-all',
                      selectedHistorial?.id === m.id
                        ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.04] hover:border-white/10'
                    )}>
                    <p className="text-[10px] font-black uppercase truncate text-white">{m.proyecto}</p>
                    <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">{m.tipo} · {m.fecha}</p>
                  </button>
                ))
              )}
            </div>

            {/* Right panel: selected minuta viewer */}
            <div className="flex-1 min-w-0">
              {selectedHistorial ? (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden flex flex-col h-full">
                  <div className="px-4 py-3 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                        <ScrollText size={14} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-white uppercase">{selectedHistorial.proyecto}</p>
                        <p className="text-[8px] text-slate-500 uppercase tracking-widest">{selectedHistorial.tipo} · {selectedHistorial.fecha}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedHistorial && (
                        <button onClick={async () => {
                          setIsSaving(true);
                          try {
                            const { error } = await supabase.from('minutas').update({ acta_texto: selectedHistorial.contenido }).eq('id', selectedHistorial.id);
                            if (error) throw error;
                            notify('Cambios guardados en Supabase');
                          } catch (e) {
                            console.error(e);
                            notify('Error al guardar cambios', 'error');
                          } finally {
                            setIsSaving(false);
                          }
                        }} disabled={isSaving}
                          className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                          {isSaving ? <Loader2 size={11} className="animate-spin" role="status" aria-label="Cargando" /> : <Save size={11} />}
                          {isSaving ? 'Sincronizando...' : 'Guardar Cambios'}
                        </button>
                      )}
                      <button onClick={() => handleExportPDF(selectedHistorial.contenido, selectedHistorial.proyecto)}
                        className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all">
                        <Download size={12} />
                      </button>
                      <button onClick={() => { setShareEmail(''); handleShareEmail(selectedHistorial.contenido); }}
                        className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-blue-400 transition-all">
                        <Mail size={12} />
                      </button>
                      <button onClick={() => { setShareWhatsApp(''); handleShareWhatsApp(selectedHistorial.contenido); }}
                        className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-emerald-400 transition-all">
                        <MessageSquare size={12} />
                      </button>
                      <button onClick={() => handleDelete(selectedHistorial.id)}
                        className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-rose-500 transition-all">
                        <Trash2 size={12} />
                      </button>
                      <button onClick={() => setSelectedHistorial(null)}
                        className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                    <div className="flex bg-black/20 p-1 rounded-lg w-fit mb-4">
                      <button onClick={() => setViewMode('editor')} className={clsx("px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all", viewMode === 'editor' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white')}>Editor</button>
                      <button onClick={() => setViewMode('preview')} className={clsx("px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all", viewMode === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white')}>Vista Ejecutiva</button>
                    </div>
                    {viewMode === 'editor' ? (
                      <textarea 
                        className="w-full h-full bg-transparent border-none text-[10px] text-slate-300 font-mono leading-relaxed resize-none focus:outline-none"
                        value={selectedHistorial.contenido}
                        onChange={(e) => {
                          const newText = e.target.value;
                          setSelectedHistorial({ ...selectedHistorial, contenido: newText });
                          // Actualizar en el historial local
                          setHistorial(prev => prev.map(h => h.id === selectedHistorial.id ? { ...h, contenido: newText } : h));
                        }}
                      />
                    ) : (
                      <div className="bg-slate-900/30 p-8 rounded-lg border border-white/5 shadow-2xl mx-auto max-w-2xl">
                        {renderMarkdown(selectedHistorial.contenido)}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                  <FileText className="w-12 h-12 text-slate-700" />
                  <p className="text-slate-600 font-black text-[11px] uppercase tracking-widest">
                    Selecciona una minuta para verla
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinutasView;
