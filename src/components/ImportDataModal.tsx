import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle,
  Loader2, Download, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean';
  default?: string | number | boolean;
  aliases?: string[];      // alternative CSV header names accepted
}

export interface ImportConfig {
  title: string;           // e.g. "Máquinas"
  table: string;           // Supabase table name
  columns: ImportColumn[];
  tenantId?: string;
  conflictTarget?: string; // column for ON CONFLICT … DO UPDATE, omit to skip
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  config: ImportConfig;
}

type Step = 'upload' | 'preview' | 'result';

interface ParsedRow {
  data: Record<string, any>;
  errors: string[];
}

// ─── CSV parser ─────────────────────────────────────────────────────────────────

function parseCSV(text: string, columns: ImportColumn[]): ParsedRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());

  const results: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, any> = {};
    const errors: string[] = [];

    for (const col of columns) {
      const candidates = [col.key.toLowerCase(), ...(col.aliases || []).map(a => a.toLowerCase())];
      const idx = headers.findIndex(h => candidates.includes(h));
      const raw = idx >= 0 ? values[idx] : '';

      if (!raw && col.default !== undefined) {
        row[col.key] = col.default;
        continue;
      }

      if (!raw && col.required) {
        errors.push(`"${col.label}" es obligatorio`);
        continue;
      }

      if (!raw) { row[col.key] = null; continue; }

      if (col.type === 'number') {
        const n = parseFloat(raw.replace(/,/g, '.'));
        if (isNaN(n)) errors.push(`"${col.label}" debe ser número`);
        else row[col.key] = n;
      } else if (col.type === 'date') {
        const d = new Date(raw);
        row[col.key] = isNaN(d.getTime()) ? null : raw;
      } else if (col.type === 'boolean') {
        row[col.key] = ['true', '1', 'si', 'yes', 'sí'].includes(raw.toLowerCase());
      } else {
        row[col.key] = raw;
      }
    }

    results.push({ data: row, errors });
  }

  return results;
}

// ─── Template CSV generator ──────────────────────────────────────────────────────

function downloadTemplate(config: ImportConfig) {
  const headers = config.columns.map(c => c.key).join(',');
  const example = config.columns.map(c => {
    if (c.type === 'number') return '0';
    if (c.type === 'date')   return '2026-06-01';
    if (c.type === 'boolean') return 'true';
    return c.label;
  }).join(',');
  const blob = new Blob([headers + '\n' + example], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `template_${config.table}.csv`;
  a.click();
}

// ─── Component ──────────────────────────────────────────────────────────────────

export const ImportDataModal: React.FC<Props> = ({ isOpen, onClose, onImportComplete, config }) => {
  const [step, setStep]           = useState<Step>('upload');
  const [file, setFile]           = useState<File | null>(null);
  const [rows, setRows]           = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [dragging, setDragging]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { tenantId } = useConfig();

  const reset = () => { setStep('upload'); setFile(null); setRows([]); setResult(null); };

  const handleClose = () => { reset(); onClose(); };

  const processFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text, config.columns);
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(f, 'UTF-8');
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.txt'))) processFile(f);
  }, []);

  const validRows   = rows.filter(r => r.errors.length === 0);
  const invalidRows = rows.filter(r => r.errors.length > 0);

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);

    const activeTenantId = config.tenantId || tenantId || 'mcvill';

    const payload = validRows.map(r => ({
      ...r.data,
      tenant_id: activeTenantId,
      updated_at: new Date().toISOString(),
    }));

    let success = 0;
    let failed  = 0;
    const errs: string[] = [];

    // Insert in batches of 50
    const BATCH = 50;
    for (let i = 0; i < payload.length; i += BATCH) {
      const batch = payload.slice(i, i + BATCH);
      const { error } = await supabase.from(config.table).insert(batch);
      if (error) { failed += batch.length; errs.push(error.message); }
      else        success += batch.length;
    }

    setResult({ success, failed, errors: errs });
    setStep('result');
    setImporting(false);
    if (success > 0) onImportComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl bg-slate-950 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                Importar {config.title}
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Formato CSV — codificación UTF-8</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-white/5 bg-slate-900/30">
          {(['upload', 'preview', 'result'] as Step[]).map((s, i) => {
            const labels = ['Archivo', 'Previsualizar', 'Resultado'];
            const isDone = step === 'preview' && i === 0
                        || step === 'result' && i <= 1;
            const isActive = step === s;
            return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  isActive ? 'text-blue-400' : isDone ? 'text-emerald-400' : 'text-slate-600'
                }`}>
                  {isDone
                    ? <CheckCircle2 size={12} />
                    : <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] ${
                        isActive ? 'border-blue-400 text-blue-400' : 'border-slate-600 text-slate-600'
                      }`}>{i+1}</span>
                  }
                  {labels[i]}
                </div>
                {i < 2 && <ChevronRight size={12} className="text-slate-700 mx-2" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* ── STEP 1: Upload ── */}
            {step === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl py-12 cursor-pointer transition-all ${
                    dragging
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/10 hover:border-blue-500/50 hover:bg-white/3'
                  }`}
                >
                  <Upload className={`w-10 h-10 transition-colors ${dragging ? 'text-blue-400' : 'text-slate-600'}`} />
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">Arrastra tu archivo CSV aquí</p>
                    <p className="text-xs text-slate-500 mt-1">o haz clic para seleccionar</p>
                  </div>
                  <span className="px-4 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                    .csv / .txt
                  </span>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />

                {/* Template + column guide */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => downloadTemplate(config)}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    <Download size={13} />
                    Descargar plantilla CSV
                  </button>
                  <span className="text-[10px] text-slate-600">{config.columns.filter(c => c.required).length} campos obligatorios</span>
                </div>

                {/* Column reference */}
                <div className="bg-black/30 rounded-2xl border border-white/5 p-4 space-y-1.5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Columnas del CSV</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {config.columns.map(c => (
                      <div key={c.key} className="flex items-center gap-2 text-[10px]">
                        <code className="text-blue-300/80 font-mono">{c.key}</code>
                        <span className="text-slate-600">→ {c.label}</span>
                        {c.required && <span className="text-rose-400 text-[8px] font-black">REQ</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Preview ── */}
            {step === 'preview' && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Summary */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 text-center">
                    <p className="text-xl font-black text-emerald-400">{validRows.length}</p>
                    <p className="text-[9px] text-emerald-500/70 uppercase tracking-widest font-bold">Válidos</p>
                  </div>
                  <div className={`flex-1 rounded-2xl px-4 py-3 text-center border ${
                    invalidRows.length > 0
                      ? 'bg-rose-500/10 border-rose-500/20'
                      : 'bg-slate-800/40 border-white/5'
                  }`}>
                    <p className={`text-xl font-black ${invalidRows.length > 0 ? 'text-rose-400' : 'text-slate-500'}`}>{invalidRows.length}</p>
                    <p className={`text-[9px] uppercase tracking-widest font-bold ${invalidRows.length > 0 ? 'text-rose-500/70' : 'text-slate-600'}`}>Con errores</p>
                  </div>
                  <div className="flex-1 bg-slate-800/40 border border-white/5 rounded-2xl px-4 py-3 text-center">
                    <p className="text-xl font-black text-slate-300">{rows.length}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Total filas</p>
                  </div>
                </div>

                {/* File name */}
                <div className="flex items-center gap-2 bg-white/3 rounded-xl px-4 py-2 text-xs text-slate-400">
                  <FileSpreadsheet size={13} className="text-blue-400" />
                  {file?.name}
                  <button onClick={reset} className="ml-auto text-slate-600 hover:text-slate-400 transition-colors">
                    <X size={12} />
                  </button>
                </div>

                {/* Error rows preview */}
                {invalidRows.length > 0 && (
                  <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 max-h-36 overflow-y-auto space-y-1.5">
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={10} /> Filas con errores (se omitirán)
                    </p>
                    {invalidRows.slice(0, 5).map((r, i) => (
                      <div key={i} className="text-[10px] text-rose-300/70">
                        Fila {rows.indexOf(r) + 2}: {r.errors.join(' · ')}
                      </div>
                    ))}
                    {invalidRows.length > 5 && (
                      <p className="text-[10px] text-rose-500/50">…y {invalidRows.length - 5} más</p>
                    )}
                  </div>
                )}

                {/* Valid rows preview table */}
                {validRows.length > 0 && (
                  <div className="border border-white/5 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto max-h-48">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5 bg-slate-900/60">
                            {config.columns.slice(0, 5).map(c => (
                              <th key={c.key} className="px-3 py-2 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                {c.label}
                              </th>
                            ))}
                            {config.columns.length > 5 && (
                              <th className="px-3 py-2 text-slate-600 text-[9px]">+{config.columns.length - 5}</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {validRows.slice(0, 8).map((r, i) => (
                            <tr key={i} className="border-b border-white/3 hover:bg-white/2">
                              {config.columns.slice(0, 5).map(c => (
                                <td key={c.key} className="px-3 py-2 text-slate-300 font-mono whitespace-nowrap max-w-[120px] truncate">
                                  {r.data[c.key] ?? '—'}
                                </td>
                              ))}
                              {config.columns.length > 5 && <td className="px-3 py-2 text-slate-600">…</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {validRows.length > 8 && (
                      <p className="text-center text-[10px] text-slate-600 py-2 border-t border-white/5">
                        …y {validRows.length - 8} filas más
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button onClick={reset}
                    className="px-6 py-2.5 rounded-xl font-black text-[11px] tracking-widest uppercase text-slate-500 hover:text-white bg-white/5 border border-white/5 transition-all">
                    Atrás
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={validRows.length === 0 || importing}
                    className="flex-1 py-2.5 rounded-xl font-black text-[11px] tracking-widest uppercase text-blue-400 bg-blue-500/10 border border-blue-500/30 hover:opacity-80 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                  >
                    {importing
                      ? <><Loader2 size={13} className="animate-spin" /> Importando...</>
                      : <><Upload size={13} /> Importar {validRows.length} registro{validRows.length !== 1 ? 's' : ''}</>
                    }
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Result ── */}
            {step === 'result' && result && (
              <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {result.success > 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                      ¡Importación completada!
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-black text-emerald-400">{result.success}</p>
                        <p className="text-[9px] text-emerald-500/70 uppercase tracking-widest font-bold">Importados</p>
                      </div>
                      {result.failed > 0 && (
                        <div className="text-center">
                          <p className="text-3xl font-black text-rose-400">{result.failed}</p>
                          <p className="text-[9px] text-rose-500/70 uppercase tracking-widest font-bold">Fallidos</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="p-4 bg-rose-500/10 rounded-full border border-rose-500/20">
                      <AlertCircle className="w-10 h-10 text-rose-400" />
                    </div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">Error al importar</h3>
                  </div>
                )}

                {result.errors.length > 0 && (
                  <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 space-y-1">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-rose-300/70 font-mono">{e}</p>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={reset}
                    className="flex-1 py-2.5 rounded-xl font-black text-[11px] tracking-widest uppercase text-slate-400 bg-white/5 border border-white/5 hover:text-white transition-all">
                    Importar otro archivo
                  </button>
                  <button onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl font-black text-[11px] tracking-widest uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:opacity-80 transition-all">
                    Listo
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Pre-built configs ───────────────────────────────────────────────────────────

export const IMPORT_CONFIGS: Record<string, ImportConfig> = {
  maquinas: {
    title: 'Máquinas',
    table: 'activos_maquinas',
    // tenantId removed from static config, now dynamic
    columns: [
      { key: 'codigo',                label: 'Código',               required: true,  aliases: ['code'] },
      { key: 'nombre',                label: 'Nombre',               required: true,  aliases: ['name'] },
      { key: 'modelo',                label: 'Modelo',               type: 'text' },
      { key: 'fabricante',            label: 'Fabricante',           type: 'text',    aliases: ['marca', 'brand'] },
      { key: 'numero_serie',          label: 'N° Serie',             type: 'text',    aliases: ['serie', 'serial'] },
      { key: 'ubicacion',             label: 'Ubicación',            type: 'text' },
      { key: 'area',                  label: 'Área',                 type: 'text' },
      { key: 'horas_uso',             label: 'Horas de Uso',         type: 'number',  default: 0 },
      { key: 'proximo_mantenimiento', label: 'Próx. Mantenimiento',  type: 'date' },
      { key: 'estado',                label: 'Estado',               default: 'operativa' },
      { key: 'notas',                 label: 'Notas',                type: 'text' },
    ],
  },

  materiales: {
    title: 'Materiales / Inventario',
    table: 'suministros',
    // tenantId removed from static config, now dynamic
    columns: [
      { key: 'sku',         label: 'SKU',            required: true },
      { key: 'name',        label: 'Nombre',         required: true, aliases: ['nombre'] },
      { key: 'description', label: 'Descripción',    aliases: ['descripcion'] },
      { key: 'category',    label: 'Categoría',      aliases: ['categoria'], default: 'general' },
      { key: 'quantity',    label: 'Cantidad',        type: 'number', required: true, aliases: ['cantidad', 'qty'] },
      { key: 'unit',        label: 'Unidad',          default: 'pza', aliases: ['unidad'] },
      { key: 'min_stock',   label: 'Stock Mínimo',   type: 'number', default: 0, aliases: ['minimo', 'min'] },
      { key: 'unit_cost',   label: 'Costo Unitario', type: 'number', default: 0, aliases: ['precio', 'costo', 'price'] },
      { key: 'location',    label: 'Ubicación',      aliases: ['ubicacion'] },
      { key: 'supplier',    label: 'Proveedor',      aliases: ['proveedor'] },
    ],
  },

  edificio: {
    title: 'Instalaciones',
    table: 'activos_edificio',
    // tenantId removed from static config, now dynamic
    columns: [
      { key: 'nombre',                label: 'Nombre',           required: true, aliases: ['name'] },
      { key: 'tipo',                  label: 'Tipo',             default: 'civil' },
      { key: 'ubicacion',             label: 'Ubicación',        aliases: ['location'] },
      { key: 'area_m2',               label: 'Área m²',          type: 'number' },
      { key: 'responsable',           label: 'Responsable',      aliases: ['encargado'] },
      { key: 'proximo_mantenimiento', label: 'Próx. Mant.',      type: 'date' },
      { key: 'estado',                label: 'Estado',           default: 'bueno' },
      { key: 'notas',                 label: 'Notas',            type: 'text' },
    ],
  },
};
