import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, ChevronDown, CheckCircle, Circle, AlertCircle, Download, Plus, Loader2, X } from 'lucide-react';
import clsx from 'clsx';
import { reportUtils } from '../utils/reportUtils';

interface PPAPItem {
  numero: number;
  elemento: string;
  descripcion: string;
  requerido: boolean;
  completado: boolean;
}

interface PPAPRecord {
  id: string;
  parte: string;
  cliente: string;
  nivel: 1 | 2 | 3 | 4 | 5;
  fecha: string;
  estatus: 'BORRADOR' | 'EN REVISIÓN' | 'APROBADO' | 'RECHAZADO';
  items: PPAPItem[];
}

const PPAP_ELEMENTOS: Omit<PPAPItem, 'completado'>[] = [
  { numero: 1,  elemento: 'Registros de diseño',                  descripcion: 'Dibujos de ingeniería, especificaciones y revisiones aplicables',     requerido: true },
  { numero: 2,  elemento: 'Documentos de cambio de ingeniería',   descripcion: 'Registros de cambios autorizados no reflejados en planos actuales',    requerido: false },
  { numero: 3,  elemento: 'Aprobación de ingeniería del cliente', descripcion: 'Aprobación de muestra de ingeniería (si aplica)',                       requerido: false },
  { numero: 4,  elemento: 'DFMEA',                                descripcion: 'Análisis de modo y efecto de falla de diseño',                           requerido: true },
  { numero: 5,  elemento: 'Diagrama de flujo del proceso',        descripcion: 'Flujo que incluye todas las etapas de manufactura',                      requerido: true },
  { numero: 6,  elemento: 'PFMEA',                                descripcion: 'Análisis de modo y efecto de falla del proceso',                          requerido: true },
  { numero: 7,  elemento: 'Plan de control',                      descripcion: 'Control plan incluyendo características especiales',                      requerido: true },
  { numero: 8,  elemento: 'Estudios MSA',                         descripcion: 'Estudios R&R para cada dispositivo de medición',                          requerido: true },
  { numero: 9,  elemento: 'Resultados dimensionales',             descripcion: 'Mediciones de todas las características del plano',                       requerido: true },
  { numero: 10, elemento: 'Registros de pruebas de material',     descripcion: 'Certificados de material y resultados de pruebas funcionales',            requerido: true },
  { numero: 11, elemento: 'Estudios de capacidad inicial',        descripcion: 'Cpk para características especiales (≥ 1.67 requerido)',                  requerido: true },
  { numero: 12, elemento: 'Muestras de piezas de producción',     descripcion: 'Cantidad mínima definida por el cliente',                                 requerido: true },
  { numero: 13, elemento: 'Muestra maestra',                      descripcion: 'Pieza retenida como referencia',                                          requerido: false },
  { numero: 14, elemento: 'Ayudas de verificación',               descripcion: 'Dispositivos y herramientas de inspección',                               requerido: false },
  { numero: 15, elemento: 'Requisitos de cumplimiento',           descripcion: 'Lista de verificación de requisitos específicos del cliente',              requerido: true },
  { numero: 16, elemento: 'Informe de aprobación (PSW)',          descripcion: 'Part Submission Warrant firmado',                                          requerido: true },
  { numero: 17, elemento: 'Aprobación de apariencia',             descripcion: 'Approval Investigation Report (si aplica estética)',                       requerido: false },
];

const NIVEL_DESC: Record<number, string> = {
  1: 'Solo PSW — sin documentos al cliente',
  2: 'PSW + muestras + datos dimensionales',
  3: 'PSW + documentación completa al cliente',
  4: 'PSW + registros retenidos en sitio',
  5: 'PSW + documentación completa revisada en sitio',
};

const statusColor: Record<string, string> = {
  BORRADOR:      'text-slate-400 bg-slate-500/10 border-slate-500/20',
  'EN REVISIÓN': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  APROBADO:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  RECHAZADO:     'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

function makeItems(completionRate = 0): PPAPItem[] {
  return PPAP_ELEMENTOS.map(e => ({
    ...e,
    completado: Math.random() < completionRate,
  }));
}

const INIT_RECORDS: PPAPRecord[] = [
  { id: 'ppap-001', parte: 'AC-2304', cliente: 'CAT',    nivel: 3, fecha: '2026-05-10', estatus: 'EN REVISIÓN', items: makeItems(0.7) },
  { id: 'ppap-002', parte: 'WT-0812', cliente: 'WABTEC', nivel: 2, fecha: '2026-04-22', estatus: 'APROBADO',    items: makeItems(1.0) },
];

export const PPAPView: React.FC = () => {
  const [records, setRecords]         = useState<PPAPRecord[]>(INIT_RECORDS);
  const [selected, setSelected]       = useState<PPAPRecord>(INIT_RECORDS[0]);
  const [showNew, setShowNew]         = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [expandedItem, setExpanded]   = useState<number | null>(null);
  const [newParte, setNewParte]       = useState('');
  const [newCliente, setNewCliente]   = useState('CAT');
  const [newNivel, setNewNivel]       = useState<1|2|3|4|5>(3);

  const completados    = selected.items.filter(i => i.completado).length;
  const requeridos     = selected.items.filter(i => i.requerido).length;
  const requeridosOk   = selected.items.filter(i => i.requerido && i.completado).length;
  const pct            = Math.round((completados / selected.items.length) * 100);

  const toggleItem = (num: number) => {
    const updated = { ...selected, items: selected.items.map(i => i.numero === num ? { ...i, completado: !i.completado } : i) };
    setSelected(updated);
    setRecords(rs => rs.map(r => r.id === updated.id ? updated : r));
  };

  const generatePSW = () => {
    setGenerating(true);
    reportUtils.exportToPDF(
      `PSW — ${selected.parte} — ${selected.cliente} — Nivel ${selected.nivel}`,
      selected.items.filter(i => i.requerido).map(i => ({
        '#': i.numero,
        Elemento: i.elemento,
        Estado: i.completado ? 'COMPLETADO' : 'PENDIENTE',
      })),
      `PSW_${selected.parte}_${selected.fecha}`,
      'CALIDAD'
    );
    setTimeout(() => setGenerating(false), 800);
  };

  const createPPAP = () => {
    if (!newParte) return;
    const nr: PPAPRecord = {
      id: `ppap-${Date.now()}`, parte: newParte.toUpperCase(), cliente: newCliente, nivel: newNivel,
      fecha: new Date().toISOString().split('T')[0], estatus: 'BORRADOR', items: makeItems(0),
    };
    setRecords(r => [...r, nr]);
    setSelected(nr);
    setShowNew(false);
    setNewParte('');
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/20">
            <FileCheck className="text-sky-400" size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              PPAP / <span className="text-sky-400">FAI AUTOMÁTICO</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Production Part Approval Process · AIAG 4ª Ed. · McVill</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={generatePSW} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            GENERAR PSW
          </button>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95">
            <Plus size={12} strokeWidth={3} /> NUEVO PPAP
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* PPAP list */}
        <div className="w-60 shrink-0 border-r border-white/5 flex flex-col gap-2 overflow-y-auto custom-scrollbar p-3">
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-1 mb-1">Expedientes ({records.length})</p>
          {records.map((r, i) => {
            const ok = r.items.filter(it => it.completado).length;
            const total = r.items.length;
            return (
              <motion.button key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelected(r)}
                className={clsx('w-full text-left p-3 rounded-xl border transition-all',
                  selected.id === r.id ? 'border-sky-500/50 bg-sky-500/10' : 'border-white/5 bg-slate-900/40 hover:border-white/10')}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black text-white">{r.parte}</span>
                  <span className={clsx('text-[7px] font-black px-1.5 py-0.5 rounded-full border', statusColor[r.estatus])}>{r.estatus}</span>
                </div>
                <p className="text-[9px] text-slate-400">{r.cliente} · Nivel {r.nivel}</p>
                <div className="mt-2 h-1 bg-slate-800 rounded-full">
                  <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${(ok/total)*100}%` }} />
                </div>
                <p className="text-[8px] text-slate-600 mt-1">{ok}/{total} elementos</p>
              </motion.button>
            );
          })}
        </div>

        {/* Detail */}
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-4 gap-4">
          {/* Summary */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-black text-white uppercase">PPAP — {selected.parte}</h2>
              <p className="text-[10px] text-slate-400">{selected.cliente} · Nivel {selected.nivel}: {NIVEL_DESC[selected.nivel]}</p>
            </div>
            <span className={clsx('text-[9px] font-black px-2 py-1 rounded-lg border', statusColor[selected.estatus])}>{selected.estatus}</span>
          </div>

          {/* Progress KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Completitud',       value: `${pct}%`,                   color: 'text-sky-400',     bar: pct },
              { label: 'Requeridos OK',     value: `${requeridosOk}/${requeridos}`, color: 'text-emerald-400', bar: null },
              { label: 'Faltantes críticos',value: String(requeridos - requeridosOk), color: requeridos - requeridosOk > 0 ? 'text-rose-400' : 'text-emerald-400', bar: null },
            ].map((k, i) => (
              <div key={i} className="bg-slate-900/40 border border-white/5 rounded-xl p-4">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">{k.label}</p>
                <p className={clsx('text-2xl font-black', k.color)}>{k.value}</p>
                {k.bar !== null && (
                  <div className="mt-2 h-1 bg-slate-800 rounded-full">
                    <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${k.bar}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Checklist */}
          <div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3">Elementos PPAP — AIAG 4ª Edición</p>
            <div className="space-y-1.5">
              {selected.items.map(item => (
                <div key={item.numero}>
                  <div
                    onClick={() => setExpanded(expandedItem === item.numero ? null : item.numero)}
                    className={clsx('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      item.completado ? 'border-emerald-500/20 bg-emerald-500/5' : item.requerido ? 'border-rose-500/10 bg-rose-500/5' : 'border-white/5 bg-slate-900/30')}>
                    <button onClick={e => { e.stopPropagation(); toggleItem(item.numero); }} className="shrink-0">
                      {item.completado
                        ? <CheckCircle size={15} className="text-emerald-400" />
                        : item.requerido
                        ? <AlertCircle size={15} className="text-rose-400/60" />
                        : <Circle size={15} className="text-slate-600" />}
                    </button>
                    <span className="text-[9px] font-black text-slate-500 shrink-0 w-5">{item.numero}.</span>
                    <p className="text-[11px] text-white flex-1 font-bold">{item.elemento}</p>
                    {item.requerido && <span className="text-[7px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-black">REQ</span>}
                    <ChevronDown size={12} className={clsx('text-slate-500 transition-transform', expandedItem === item.numero && 'rotate-180')} />
                  </div>
                  <AnimatePresence>
                    {expandedItem === item.numero && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <p className="text-[10px] text-slate-400 px-4 py-2 pb-3 leading-relaxed">{item.descripcion}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Nuevo PPAP modal */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setShowNew(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-[420px] bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-black text-white uppercase">Nuevo Expediente PPAP</h3>
                <button onClick={() => setShowNew(false)}><X size={16} className="text-slate-400" /></button>
              </div>
              <div className="space-y-3">
                <input placeholder="Número de parte (ej: AC-2304)" value={newParte}
                  onChange={e => setNewParte(e.target.value)}
                  className="cyber-input w-full" />
                <select value={newCliente} onChange={e => setNewCliente(e.target.value)} className="cyber-select w-full">
                  {['CAT', 'WABTEC', 'JABIL', 'KONE', 'TRANE', 'BUHLER', 'KOMATSU', 'ALFAGOMMA'].map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={newNivel} onChange={e => setNewNivel(Number(e.target.value) as 1|2|3|4|5)} className="cyber-select w-full">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>Nivel {n} — {NIVEL_DESC[n]}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={createPPAP}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-[9px] uppercase tracking-widest transition-all">
                  CREAR PPAP
                </button>
                <button onClick={() => setShowNew(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-[9px] font-black uppercase transition-all">
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PPAPView;
