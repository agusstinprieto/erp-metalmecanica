import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { comprasViaService } from '../services/comprasViaService';
import { toast } from '../lib/dialogs';
import type { ComprasItem, ComprasEtapa, ComprasEstatus, ComprasPrioridad, ComprasMoneda } from '../types/compras';

const DEFAULT_ETAPAS = ['COT_PROVEEDOR', 'APROBACIÓN', 'OC_EMITIDA', 'EN_TRÁNSITO'];

const ESTATUS_OPTIONS: ComprasEstatus[] = [
  'REQUISICION', 'COT_PROVEEDOR', 'APROBACION', 'OC_EMITIDA',
  'EN_TRANSITO', 'RECIBIDA', 'CERRADA', 'CANCELADA',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string | null;
  onSaved: () => void;
}

const EMPTY_ITEM: Partial<ComprasItem> = {
  folio: '', proveedor: '', proveedor_contacto: '', concepto: '', descripcion: '',
  solicitante: '', aprobador: '', estatus: 'REQUISICION', prioridad: 'NORMAL',
  urgente: false, monto_total: 0, moneda: 'MXN', avance_porcentaje: 0,
  numero_oc: '', condiciones_pago: '', notas: '',
  fecha_requisicion: '', fecha_entrega_requerida: '',
};

export const ComprasManagerModal: React.FC<Props> = ({ isOpen, onClose, itemId, onSaved }) => {
  const [tab,     setTab]     = useState<'general' | 'etapas'>('general');
  const [form,    setForm]    = useState<Partial<ComprasItem>>(EMPTY_ITEM);
  const [etapas,  setEtapas]  = useState<Partial<ComprasEtapa>[]>([]);
  const [saving,  setSaving]  = useState(false);

  // ── Load item ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    setTab('general');
    if (itemId) {
      comprasViaService.getById(itemId).then(item => {
        if (item) {
          setForm(item);
          setEtapas(item.etapas || []);
        }
      });
    } else {
      setForm({ ...EMPTY_ITEM });
      setEtapas(DEFAULT_ETAPAS.map((n, i) => ({ nombre_etapa: n, orden: i, estado: 'pendiente' })));
    }
  }, [isOpen, itemId]);

  // ── Field helpers ────────────────────────────────────────────────────────

  const set = (key: keyof ComprasItem, val: any) => setForm(f => ({ ...f, [key]: val }));

  // ── Etapas helpers ───────────────────────────────────────────────────────

  const addEtapa = () =>
    setEtapas(prev => [...prev, { nombre_etapa: '', orden: prev.length, estado: 'pendiente' }]);

  const removeEtapa = (idx: number) =>
    setEtapas(prev => prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, orden: i })));

  const moveEtapa = (idx: number, dir: -1 | 1) => {
    const arr = [...etapas];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setEtapas(arr.map((e, i) => ({ ...e, orden: i })));
  };

  const setEtapaField = (idx: number, key: keyof ComprasEtapa, val: any) =>
    setEtapas(prev => prev.map((e, i) => i === idx ? { ...e, [key]: val } : e));

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.folio?.trim())     { toast('El folio es obligatorio.', 'warning'); return; }
    if (!form.proveedor?.trim()) { toast('El proveedor es obligatorio.', 'warning'); return; }
    if (!form.concepto?.trim())  { toast('El concepto es obligatorio.', 'warning'); return; }
    if (!form.solicitante?.trim()) { toast('El solicitante es obligatorio.', 'warning'); return; }

    setSaving(true);
    try {
      let savedId = itemId || '';
      if (itemId) {
        await comprasViaService.update(itemId, form);
      } else {
        const created = await comprasViaService.create(form);
        savedId = created.id;
      }
      if (etapas.length) {
        await comprasViaService.upsertEtapas(savedId, etapas);
      }
      toast(itemId ? 'OC actualizada correctamente.' : 'OC creada correctamente.', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      toast(`Error al guardar: ${err.message || 'Error desconocido'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Input helpers ────────────────────────────────────────────────────────

  const inputCls = 'w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-600/50 transition-colors';
  const labelCls = 'block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/50 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/30 shrink-0">
              <h2 className="text-base font-black text-white tracking-tight">
                {itemId ? 'Editar OC Compras' : 'Nueva OC Compras'}
              </h2>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 shrink-0">
              {(['general', 'etapas'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={clsx(
                    'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border',
                    tab === t
                      ? 'bg-blue-600/20 text-blue-400 border-blue-600/40'
                      : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                  )}
                >
                  {t === 'general' ? 'General' : 'Etapas'}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {tab === 'general' && (
                <>
                  {/* Row 1 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Folio <span className="text-red-400">*</span></label>
                      <input className={inputCls} value={form.folio || ''} onChange={e => set('folio', e.target.value)} placeholder="OC-2024-001" />
                    </div>
                    <div>
                      <label className={labelCls}>N° OC</label>
                      <input className={inputCls} value={form.numero_oc || ''} onChange={e => set('numero_oc', e.target.value)} placeholder="OC-0001" />
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Proveedor <span className="text-red-400">*</span></label>
                      <input className={inputCls} value={form.proveedor || ''} onChange={e => set('proveedor', e.target.value)} placeholder="Nombre del proveedor" />
                    </div>
                    <div>
                      <label className={labelCls}>Contacto Proveedor</label>
                      <input className={inputCls} value={form.proveedor_contacto || ''} onChange={e => set('proveedor_contacto', e.target.value)} placeholder="Tel / Email" />
                    </div>
                  </div>

                  {/* Concepto */}
                  <div>
                    <label className={labelCls}>Concepto <span className="text-red-400">*</span></label>
                    <input className={inputCls} value={form.concepto || ''} onChange={e => set('concepto', e.target.value)} placeholder="Descripción breve del material / servicio" />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className={labelCls}>Descripción Detallada</label>
                    <textarea
                      className={clsx(inputCls, 'resize-none h-20')}
                      value={form.descripcion || ''}
                      onChange={e => set('descripcion', e.target.value)}
                      placeholder="Detalles adicionales..."
                    />
                  </div>

                  {/* Row 3 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Solicitante <span className="text-red-400">*</span></label>
                      <input className={inputCls} value={form.solicitante || ''} onChange={e => set('solicitante', e.target.value)} placeholder="Nombre del solicitante" />
                    </div>
                    <div>
                      <label className={labelCls}>Aprobador</label>
                      <input className={inputCls} value={form.aprobador || ''} onChange={e => set('aprobador', e.target.value)} placeholder="Nombre del aprobador" />
                    </div>
                  </div>

                  {/* Row 4 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Monto Total</label>
                      <input
                        type="number" min="0" className={inputCls}
                        value={form.monto_total || 0}
                        onChange={e => set('monto_total', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Moneda</label>
                      <select className={inputCls} value={form.moneda || 'MXN'} onChange={e => set('moneda', e.target.value as ComprasMoneda)}>
                        <option value="MXN">MXN</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Prioridad</label>
                      <select className={inputCls} value={form.prioridad || 'NORMAL'} onChange={e => set('prioridad', e.target.value as ComprasPrioridad)}>
                        <option value="NORMAL">Normal</option>
                        <option value="ALTA">Alta</option>
                        <option value="URGENTE">Urgente</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 5 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Estatus</label>
                      <select className={inputCls} value={form.estatus || 'REQUISICION'} onChange={e => set('estatus', e.target.value as ComprasEstatus)}>
                        {ESTATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Condiciones de Pago</label>
                      <input className={inputCls} value={form.condiciones_pago || ''} onChange={e => set('condiciones_pago', e.target.value)} placeholder="Ej. 30 días, contado..." />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Fecha Requisición</label>
                      <input type="date" className={inputCls} value={form.fecha_requisicion || ''} onChange={e => set('fecha_requisicion', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Fecha Entrega Requerida</label>
                      <input type="date" className={inputCls} value={form.fecha_entrega_requerida || ''} onChange={e => set('fecha_entrega_requerida', e.target.value)} />
                    </div>
                  </div>

                  {/* Urgente toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => set('urgente', !form.urgente)}
                      className={clsx(
                        'relative w-10 h-6 rounded-full transition-all border',
                        form.urgente ? 'bg-orange-500/30 border-orange-500/50' : 'bg-slate-700/50 border-slate-600/50'
                      )}
                    >
                      <span className={clsx(
                        'absolute top-0.5 w-5 h-5 rounded-full transition-all shadow-sm',
                        form.urgente ? 'left-4 bg-orange-400' : 'left-0.5 bg-slate-500'
                      )} />
                    </button>
                    <span className="text-sm font-bold text-slate-300">Urgente</span>
                  </div>

                  {/* Notas */}
                  <div>
                    <label className={labelCls}>Notas</label>
                    <textarea
                      className={clsx(inputCls, 'resize-none h-16')}
                      value={form.notas || ''}
                      onChange={e => set('notas', e.target.value)}
                      placeholder="Observaciones adicionales..."
                    />
                  </div>
                </>
              )}

              {tab === 'etapas' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500 mb-3">
                    Define las etapas del flujo de compra. Puedes reordenar, agregar o eliminar.
                  </p>
                  {etapas.map((etapa, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveEtapa(idx, -1)} disabled={idx === 0} className="text-slate-500 hover:text-slate-300 disabled:opacity-30"><ChevronUp size={12} /></button>
                        <button onClick={() => moveEtapa(idx, 1)} disabled={idx === etapas.length - 1} className="text-slate-500 hover:text-slate-300 disabled:opacity-30"><ChevronDown size={12} /></button>
                      </div>
                      <span className="text-[10px] font-mono text-slate-600 w-4">{idx + 1}</span>
                      <input
                        className="flex-1 px-2 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-200 text-xs focus:outline-none focus:border-blue-600/50"
                        value={etapa.nombre_etapa || ''}
                        onChange={e => setEtapaField(idx, 'nombre_etapa', e.target.value)}
                        placeholder="Nombre de etapa"
                      />
                      <input
                        className="w-28 px-2 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-200 text-xs focus:outline-none focus:border-blue-600/50"
                        value={etapa.responsable_etapa || ''}
                        onChange={e => setEtapaField(idx, 'responsable_etapa', e.target.value)}
                        placeholder="Responsable"
                      />
                      <select
                        className="w-28 px-2 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-200 text-xs focus:outline-none focus:border-blue-600/50"
                        value={etapa.estado || 'pendiente'}
                        onChange={e => setEtapaField(idx, 'estado', e.target.value)}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="completado">Completado</option>
                      </select>
                      <button onClick={() => removeEtapa(idx)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-600/20 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addEtapa}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-600/50 text-slate-400 hover:border-blue-600/40 hover:text-blue-400 text-xs font-bold transition-all w-full justify-center"
                  >
                    <Plus size={14} /> Agregar Etapa
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-700/50 border border-slate-600/50 text-slate-300 text-sm font-bold hover:bg-slate-600/50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                {saving ? 'Guardando...' : itemId ? 'Actualizar OC' : 'Crear OC'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
