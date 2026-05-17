import React, { useState, useEffect, useCallback, useRef } from 'react';
import clsx from 'clsx';
import {
  X, FileText, Upload, Trash2, Download, Info,
  BrainCircuit, DollarSign, Zap, AlertTriangle,
  CheckCircle2, File, Box, Package, List,
  RefreshCw, Shield,
} from 'lucide-react';
import type { RFQCotizacion, RFQDocumento, DocumentoTipo } from '../types/quote.types';
import {
  fetchDocumentos, uploadDocumento, deleteDocumento,
  updateRFQ, createViajeroFromRFQ,
} from '../services/quoteService';
import { getHistorial } from '../services/factibilidadIAService';
import { useTenant } from '../hooks/useTenant';

// ─── Config ──────────────────────────────────────────────────────────────────

type TabId = 'info' | 'documentos' | 'factibilidad' | 'cotizacion' | 'viajero';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'info',         label: 'Info',         icon: <Info size={12} /> },
  { id: 'documentos',   label: 'Documentos',   icon: <FileText size={12} /> },
  { id: 'factibilidad', label: 'Factibilidad', icon: <BrainCircuit size={12} /> },
  { id: 'cotizacion',   label: 'Cotización',   icon: <DollarSign size={12} /> },
  { id: 'viajero',      label: 'Viajero',      icon: <Zap size={12} /> },
];

const DOC_TIPOS: {
  id: DocumentoTipo; label: string; exts: string;
  color: string; icon: React.ReactNode;
}[] = [
  { id: 'plano_2d',       label: 'Plano 2D',       exts: 'PDF, DWG, DXF',             color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',      icon: <FileText size={11} /> },
  { id: 'modelo_3d',      label: 'Modelo 3D',      exts: 'STEP, STL, SLDPRT, SFX',   color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', icon: <Box size={11} /> },
  { id: 'especificacion', label: 'Especificación', exts: 'PDF, DOCX, XLSX',           color: 'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-accent/30',       icon: <List size={11} /> },
  { id: 'bom',            label: 'BOM',            exts: 'XLSX, CSV, PDF',            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <Package size={11} /> },
  { id: 'otro',           label: 'Otro',           exts: 'Cualquier formato',         color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',    icon: <File size={11} /> },
];

const ESTADO_LABELS: Record<string, string> = {
  factibilidad: 'FACTIBILIDAD',
  cotizacion:   'COTIZACIÓN',
  revision:     'DIRECCIÓN',
  enviada:      'ENVIADA',
  declinada:    'DECLINADA',
};

const ESTADO_COLOR: Record<string, string> = {
  factibilidad: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  cotizacion:   'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-accent/30',
  revision:     'text-amber-400 bg-amber-500/10 border-amber-500/30',
  enviada:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  declinada:    'text-red-400 bg-red-500/10 border-red-500/30',
};

function fmtSize(b?: number) {
  if (!b) return '';
  if (b < 1_048_576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

function diasElapsed(fecha?: string) {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}

// ─── Tab Info ─────────────────────────────────────────────────────────────────

const TabInfo: React.FC<{ rfq: RFQCotizacion }> = ({ rfq }) => {
  const elapsed = diasElapsed(rfq.fecha_recepcion);
  const slaOver = elapsed > rfq.sla_dias && rfq.estado !== 'enviada' && rfq.estado !== 'declinada';

  const Row = ({ label, value }: { label: string; value?: string | number | null }) =>
    value != null && value !== '' ? (
      <div>
        <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-xs text-white font-mono">{value}</p>
      </div>
    ) : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Row label="Cliente"          value={rfq.cliente} />
        <Row label="Contacto Externo" value={rfq.contacto_cliente} />
        <Row label="PM Asignado"      value={rfq.pm_asignado} />
        <Row label="RFQ Externo"      value={rfq.rfq_externo} />
        <Row label="RFQ Interno"      value={rfq.rfq_interno} />
        <Row label="Alcance"          value={rfq.alcance_general} />
        <Row label="Cant. NPs"        value={rfq.cant_np} />
        <Row label="EAU"              value={rfq.eau} />
        <Row label="Fecha Recepción"  value={rfq.fecha_recepcion} />
        <Row label="Fecha Compromiso" value={rfq.fecha_compromiso} />
        <Row label="Revisión NP"      value={rfq.revision_np} />
        <Row label="Prototipos / PPAP" value={rfq.cant_prototipos} />
        <Row label="Empaque"          value={rfq.metodo_empaque} />
        <Row label="Forecast"         value={rfq.aceros_forecast ? 'SÍ (Aceros en Forecast)' : 'NO'} />
      </div>

      {rfq.descripcion && (
        <div>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Descripción / Alcance</p>
          <p className="text-xs text-slate-300 leading-relaxed">{rfq.descripcion}</p>
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Riesgo F001</p>
          <span className={clsx('px-2 py-0.5 rounded text-[9px] font-black border',
            rfq.riesgo_nivel === 'HIGH'   ? 'text-red-400 bg-red-500/10 border-red-500/30' :
            rfq.riesgo_nivel === 'MEDIUM' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                                            'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
          )}>
            {rfq.riesgo_nivel}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[8px] text-slate-600 uppercase tracking-wider">Score</p>
            <p className="text-2xl font-black font-mono text-white">{rfq.riesgo_score}</p>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-[9px] font-mono mb-1">
              <span className={slaOver ? 'text-red-400' : 'text-slate-500'}>{elapsed}d transcurridos</span>
              <span className="text-slate-500">SLA {rfq.sla_dias}d</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all',
                  slaOver ? 'bg-red-500' :
                  (elapsed / rfq.sla_dias) > 0.7 ? 'bg-amber-400' : 'bg-mcvill-accent'
                )}
                style={{ width: `${Math.min((elapsed / rfq.sla_dias) * 100, 100)}%` }}
              />
            </div>
            {slaOver && (
              <p className="text-[8px] text-red-400 font-black uppercase mt-1">
                ⚠ SLA VENCIDO +{elapsed - rfq.sla_dias}d
              </p>
            )}
          </div>
        </div>
      </div>

      {rfq.comentario_pm && (
        <div>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Comentario PM</p>
          <p className="text-xs text-slate-300 italic">{rfq.comentario_pm}</p>
        </div>
      )}
    </div>
  );
};

// ─── Tab Documentos ───────────────────────────────────────────────────────────

const TabDocumentos: React.FC<{ rfq: RFQCotizacion; tenantId: string }> = ({ rfq, tenantId }) => {
  const [docs, setDocs]         = useState<RFQDocumento[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [tipoSel, setTipoSel]   = useState<DocumentoTipo>('plano_2d');
  const [drag, setDrag]         = useState(false);
  const [error, setError]       = useState('');
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocumentos(rfq.id, tenantId).then(setDocs).finally(() => setLoading(false));
  }, [rfq.id, tenantId]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    const results = await Promise.all(
      Array.from(files).map(f => uploadDocumento(rfq.id, tipoSel, f, tenantId))
    );
    const ok = results.filter(Boolean) as RFQDocumento[];
    if (ok.length < files.length) {
      setError(`${files.length - ok.length} archivo(s) no se pudieron subir. Verifica permisos de Supabase Storage en bucket erp-assets.`);
    }
    setDocs(prev => [...ok, ...prev]);
    setUploading(false);
  }, [rfq.id, tipoSel]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (doc: RFQDocumento) => {
    setDeleting(doc.id);
    await deleteDocumento(doc.id, doc.storage_path, tenantId);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    setDeleting(null);
  };

  const byTipo = DOC_TIPOS.map(t => ({ ...t, docs: docs.filter(d => d.tipo === t.id) }));

  return (
    <div className="space-y-4">
      {/* Tipo selector */}
      <div>
        <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-2">Tipo de Documento</p>
        <div className="flex flex-wrap gap-1.5">
          {DOC_TIPOS.map(t => (
            <button
              key={t.id}
              onClick={() => setTipoSel(t.id)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all',
                tipoSel === t.id ? t.color : 'text-slate-500 bg-slate-900 border-slate-700 hover:border-slate-500'
              )}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <p className="text-[8px] text-slate-600 mt-1.5 font-mono">
          Formatos aceptados: {DOC_TIPOS.find(t => t.id === tipoSel)?.exts}
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none',
          drag ? 'border-mcvill-accent bg-mcvill-accent/5' : 'border-slate-700 hover:border-slate-500 bg-slate-900/30'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw size={20} className="text-mcvill-accent animate-spin" />
            <p className="text-xs text-mcvill-accent font-bold">Subiendo archivos…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={20} className={drag ? 'text-mcvill-accent' : 'text-slate-600'} />
            <p className="text-xs text-slate-400">
              Arrastra archivos aquí o{' '}
              <span className="text-mcvill-accent font-bold">haz clic para seleccionar</span>
            </p>
            <p className="text-[9px] text-slate-600 font-mono">
              {DOC_TIPOS.find(t => t.id === tipoSel)?.exts} · máx 50 MB por archivo
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-400">{error}</p>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw size={16} className="text-slate-600 animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 text-[10px] text-slate-600 uppercase tracking-widest border border-dashed border-slate-800 rounded-xl">
          Sin documentos adjuntos
        </div>
      ) : (
        <div className="space-y-4">
          {byTipo.filter(t => t.docs.length > 0).map(t => (
            <div key={t.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className={clsx('flex items-center gap-1 text-[9px] font-black uppercase tracking-widest', t.color.split(' ')[0])}>
                  {t.icon}{t.label}
                </span>
                <span className="text-[8px] font-mono text-slate-600 bg-slate-800 px-1 rounded">
                  {t.docs.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {t.docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white font-mono truncate">{doc.nombre}</p>
                      <p className="text-[8px] text-slate-600">
                        {fmtSize(doc.tamano)}{doc.tamano ? ' · ' : ''}{new Date(doc.created_at).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-mcvill-accent hover:bg-mcvill-accent/10 transition-all"
                      title="Descargar"
                    >
                      <Download size={12} />
                    </a>
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deleting === doc.id}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                      title="Eliminar"
                    >
                      {deleting === doc.id
                        ? <RefreshCw size={12} className="animate-spin" />
                        : <Trash2 size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tab Factibilidad ─────────────────────────────────────────────────────────

const VEREDICTO_CFG = {
  VIABLE:       { cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <CheckCircle2 size={14} /> },
  CONDICIONADA: { cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30',       icon: <AlertTriangle size={14} /> },
  NO_VIABLE:    { cls: 'text-red-400 bg-red-500/10 border-red-500/30',             icon: <X size={14} /> },
};

const TabFactibilidad: React.FC<{
  rfq: RFQCotizacion;
  tenantId: string;
  onAnalyzeRFQ?: () => void;
}> = ({ rfq, tenantId, onAnalyzeRFQ }) => {
  const [analisis, setAnalisis] = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getHistorial(tenantId).then(hist => {
      const found = hist.find(a => a.rfq_id === rfq.id);
      if (found) setAnalisis(found.analisis);
    }).finally(() => setLoading(false));
  }, [rfq.id, tenantId]);

  const veredicto: string | undefined =
    analisis?.veredicto ?? analisis?.resultado?.veredicto;
  const confianza: number | undefined =
    analisis?.confianza ?? analisis?.resultado?.confianza;
  const resumen: string | undefined =
    analisis?.resumen ?? analisis?.resultado?.resumen ?? analisis?.resultado?.justificacion;
  const riesgos: any[] =
    analisis?.riesgos ?? analisis?.resultado?.riesgos ?? [];

  const cfg = veredicto ? VEREDICTO_CFG[veredicto as keyof typeof VEREDICTO_CFG] : null;

  if (loading) return (
    <div className="flex justify-center py-12">
      <RefreshCw size={20} className="text-slate-700 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {analisis && cfg ? (
        <>
          <div className={clsx('flex items-center gap-3 border rounded-xl p-4', cfg.cls)}>
            {cfg.icon}
            <div>
              <p className="text-xs font-black uppercase tracking-widest">{veredicto}</p>
              {confianza != null && (
                <p className="text-[9px] opacity-70 mt-0.5">Confianza IA: {confianza}%</p>
              )}
            </div>
          </div>

          {resumen && (
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Resumen IA</p>
              <p className="text-xs text-slate-300 leading-relaxed">{resumen}</p>
            </div>
          )}

          {riesgos.length > 0 && (
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-2">Riesgos Identificados</p>
              <div className="space-y-1.5">
                {riesgos.map((r: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2">
                    <AlertTriangle size={10} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-300">
                      {typeof r === 'string' ? r : r.descripcion ?? r.riesgo ?? JSON.stringify(r)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[8px] text-slate-600 font-mono">
            Análisis: {analisis.fecha ? new Date(analisis.fecha).toLocaleString('es-MX') : '—'}
          </p>

          {onAnalyzeRFQ && (
            <button
              onClick={onAnalyzeRFQ}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 text-[9px] font-black uppercase tracking-wider hover:border-slate-500 hover:text-white transition-all"
            >
              <BrainCircuit size={12} />
              Re-analizar en módulo Factibilidad
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-10 space-y-4">
          <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto">
            <BrainCircuit size={20} className="text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Sin análisis de factibilidad</p>
            <p className="text-[9px] text-slate-600 mt-1">
              Ejecuta el análisis IA desde el módulo de Factibilidad
            </p>
          </div>
          {onAnalyzeRFQ && (
            <button
              onClick={onAnalyzeRFQ}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-[10px] font-black uppercase tracking-wider hover:bg-mcvill-accent/25 transition-all"
            >
              <BrainCircuit size={13} />
              Ir a Factibilidad IA
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Tab Cotización ───────────────────────────────────────────────────────────

const TabCotizacion: React.FC<{
  rfq: RFQCotizacion;
  onUpdate: (rfq: RFQCotizacion) => void;
  tenantId: string;
}> = ({ rfq, onUpdate, tenantId }) => {
  const [monto, setMonto] = useState(rfq.monto_estimado?.toString() ?? '');
  const [notas, setNotas] = useState(rfq.comentario_pm ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updates: Partial<RFQCotizacion> = {
      monto_estimado: parseFloat(monto) || undefined,
      comentario_pm: notas,
    };
    await updateRFQ(rfq.id, updates, tenantId);
    onUpdate({ ...rfq, ...updates });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const montoNum = parseFloat(monto);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1.5">
          Monto Estimado (USD)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">$</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={monto}
            onChange={e => setMonto(e.target.value)}
            placeholder="0.00"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-mcvill-accent/50 transition-colors"
          />
        </div>
        {!isNaN(montoNum) && montoNum > 0 && (
          <p className="text-[9px] text-slate-500 font-mono mt-1">
            ≈ MXN ${(montoNum * 17.5).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
            <span className="text-slate-600"> (T.C. ref. 17.50)</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Aceros',       value: rfq.cant_aceros },
          { label: 'Procesos',     value: rfq.cant_procesos },
          { label: 'Subensambles', value: rfq.cant_subensambles },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
            <p className="text-[8px] text-slate-500 uppercase tracking-widest">{label}</p>
            <p className="text-xl font-black font-mono text-white mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <label className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1.5">
          Notas de Cotización / PM
        </label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={5}
          placeholder="Condiciones, supuestos, tiempos de entrega, notas para el cliente…"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 resize-none focus:outline-none focus:border-mcvill-accent/50 transition-colors"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={clsx(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
          saved
            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
            : 'bg-mcvill-accent text-slate-950 hover:bg-mcvill-accent/90 disabled:opacity-40'
        )}
      >
        {saving ? <RefreshCw size={13} className="animate-spin" /> :
         saved   ? <CheckCircle2 size={13} /> : <DollarSign size={13} />}
        {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar Cotización'}
      </button>
    </div>
  );
};

// ─── Tab Viajero ──────────────────────────────────────────────────────────────

const TabViajero: React.FC<{
  rfq: RFQCotizacion;
  onNavigateToViajeros?: () => void;
  tenantId: string;
}> = ({ rfq, onNavigateToViajeros, tenantId }) => {
  const [creating, setCreating]   = useState(false);
  const [viajeroId, setViajeroId] = useState<string | null>(null);
  const [error, setError]         = useState('');

  const canCreate = rfq.estado === 'revision' || rfq.estado === 'enviada';

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const id = await createViajeroFromRFQ(rfq, tenantId);
      setViajeroId(id);
    } catch (e: any) {
      setError(e.message ?? 'Error al crear la orden de trabajo');
    }
    setCreating(false);
  };

  if (!canCreate) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto">
          <Shield size={20} className="text-slate-600" />
        </div>
        <p className="text-xs text-slate-400">La RFQ debe estar en DIRECCIÓN o ENVIADA</p>
        <p className="text-[9px] text-slate-600">para poder generar una Orden de Trabajo</p>
        <div className="flex items-center justify-center gap-2 text-[9px] text-slate-600 font-mono">
          <span className="px-2 py-0.5 rounded border border-slate-700">FACTIBILIDAD</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded border border-slate-700">COTIZACIÓN</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded border border-amber-500/40 text-amber-400">DIRECCIÓN</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-400">ENVIADA</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
          Orden de Trabajo — Vista Previa
        </p>
        {([
          ['Cliente',     rfq.cliente],
          ['RFQ',         rfq.rfq_externo ?? rfq.rfq_interno],
          ['Descripción', rfq.descripcion],
          ['PM',          rfq.pm_asignado],
          ['NPs',         `${rfq.cant_np} número(s) de parte`],
          ['EAU',         rfq.eau],
          ['Monto',       rfq.monto_estimado
            ? `$${rfq.monto_estimado.toLocaleString()} USD`
            : '— pendiente de cotización'],
        ] as [string, string | undefined][]).filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider shrink-0">{k}</span>
            <span className="text-[10px] text-white font-mono text-right">{v}</span>
          </div>
        ))}
      </div>

      {viajeroId ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-emerald-400 font-black">Viajero creado exitosamente</p>
              <p className="text-[9px] text-emerald-400/70 font-mono mt-0.5">ID: {viajeroId}</p>
            </div>
          </div>
          {onNavigateToViajeros && (
            <button
              onClick={onNavigateToViajeros}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-black uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all"
            >
              <Zap size={13} />
              Ir al módulo de Producción
            </button>
          )}
          <p className="text-[8px] text-slate-600 text-center">
            Completa el número de parte, operaciones y materiales en el módulo de Viajeros
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-400">{error}</p>
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-mcvill-accent text-slate-950 text-sm font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-mcvill-accent/20"
          >
            {creating ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
            {creating ? 'Creando Viajero…' : 'Generar Orden de Trabajo'}
          </button>
          <p className="text-[8px] text-slate-600 text-center">
            Esta acción crea el viajero en el módulo de Producción y no se puede deshacer
          </p>
        </>
      )}
    </div>
  );
};

// ─── Main Drawer ──────────────────────────────────────────────────────────────

interface RFQDetailDrawerProps {
  rfq: RFQCotizacion;
  onClose: () => void;
  onUpdate?: (updated: RFQCotizacion) => void;
  onAnalyzeRFQ?: () => void;
  onNavigateToViajeros?: () => void;
}

export const RFQDetailDrawer: React.FC<RFQDetailDrawerProps> = ({
  rfq: initialRfq, onClose, onUpdate, onAnalyzeRFQ, onNavigateToViajeros,
}) => {
  const tenantId = useTenant();
  const [rfq, setRfq] = useState(initialRfq);
  const [tab, setTab] = useState<TabId>('info');

  const handleUpdate = (updated: RFQCotizacion) => {
    setRfq(updated);
    onUpdate?.(updated);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="w-full max-w-2xl bg-slate-950 border-l border-slate-800 flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {rfq.ident && (
                <span className="font-mono text-[10px] text-mcvill-accent/70 font-bold">#{rfq.ident}</span>
              )}
              {rfq.rfq_externo && (
                <span className="font-mono text-[9px] text-slate-500">{rfq.rfq_externo}</span>
              )}
              <span className={clsx(
                'px-2 py-0.5 rounded text-[9px] font-black border uppercase',
                ESTADO_COLOR[rfq.estado]
              )}>
                {ESTADO_LABELS[rfq.estado]}
              </span>
            </div>
            <h2 className="text-base font-black text-white uppercase mt-1 truncate">{rfq.cliente}</h2>
            {rfq.descripcion && (
              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{rfq.descripcion}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-3 text-[10px] font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all',
                tab === t.id
                  ? 'border-mcvill-accent text-mcvill-accent'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              )}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {tab === 'info'         && <TabInfo rfq={rfq} />}
          {tab === 'documentos'   && <TabDocumentos rfq={rfq} tenantId={tenantId} />}
          {tab === 'factibilidad' && <TabFactibilidad rfq={rfq} tenantId={tenantId} onAnalyzeRFQ={onAnalyzeRFQ} />}
          {tab === 'cotizacion'   && <TabCotizacion rfq={rfq} onUpdate={handleUpdate} tenantId={tenantId} />}
          {tab === 'viajero'      && <TabViajero rfq={rfq} onNavigateToViajeros={onNavigateToViajeros} tenantId={tenantId} />}
        </div>
      </div>
    </div>
  );
};

export default RFQDetailDrawer;
