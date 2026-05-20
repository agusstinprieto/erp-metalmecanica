import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { cotizacionViaService } from '../services/cotizacionViaService';
import {
  COT_ESTATUS_OPTIONS, COT_ESTATUS_LABELS, DEFAULT_ETAPAS,
} from '../types/cotizacion';
import type { CotizacionItem, CotizacionEtapa, CotizacionEtapaEstado } from '../types/cotizacion';
import { useConfig } from '../contexts/ConfigContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string | null;
  onSaved: () => void;
}

type TabId = 'general' | 'etapas';

const emptyForm = (): Partial<CotizacionItem> => ({
  folio:                '',
  cliente:              '',
  contacto:             '',
  descripcion:          '',
  responsable:          '',
  estatus:              'RFQ_RECIBIDA',
  prioridad:            'NORMAL',
  valor_estimado:       0,
  probabilidad_cierre:  50,
  avance_porcentaje:    0,
  fecha_recepcion:      new Date().toISOString().split('T')[0],
  fecha_entrega_requerida: '',
  notas:                '',
});

const inputCls = (dark: boolean) => clsx(
  'w-full px-3 py-2 rounded-xl border text-xs font-bold transition-all focus:outline-none',
  dark
    ? 'bg-white/5 border-white/10 text-slate-200 placeholder-slate-600 focus:border-blue-500/50'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-400'
);

const labelCls = 'block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1';

export const CotizacionManagerModal: React.FC<Props> = ({ isOpen, onClose, itemId, onSaved }) => {
  const { isDarkMode } = useConfig();
  const [activeTab, setActiveTab]   = useState<TabId>('general');
  const [form,      setForm]        = useState<Partial<CotizacionItem>>(emptyForm());
  const [etapas,    setEtapas]      = useState<Partial<CotizacionEtapa>[]>([]);
  const [saving,    setSaving]      = useState(false);
  const [error,     setError]       = useState<string | null>(null);

  // Load item if editing
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('general');
    setError(null);
    if (itemId) {
      cotizacionViaService.getById(itemId).then(item => {
        if (!item) return;
        setForm(item);
        const loadedEtapas = (item.etapas || []).sort((a, b) => a.orden - b.orden);
        setEtapas(loadedEtapas);
      });
    } else {
      const fresh = emptyForm();
      setForm(fresh);
      // Generate folio
      cotizacionViaService.generateFolio().then(f => setForm(prev => ({ ...prev, folio: f })));
      setEtapas(DEFAULT_ETAPAS.map((n, i) => ({
        nombre_etapa:      n,
        responsable_etapa: '',
        tiempo_estimado:   0,
        estado:            'pendiente' as CotizacionEtapaEstado,
        orden:             i,
      })));
    }
  }, [isOpen, itemId]);

  const set = (key: keyof CotizacionItem, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // ── Etapas helpers ──────────────────────────────────────────────────────────

  const addEtapa = () =>
    setEtapas(prev => [...prev, {
      nombre_etapa: '', responsable_etapa: '', tiempo_estimado: 0,
      estado: 'pendiente', orden: prev.length,
    }]);

  const removeEtapa = (idx: number) => setEtapas(prev => prev.filter((_, i) => i !== idx));

  const moveEtapa = (idx: number, dir: -1 | 1) => {
    const copy = [...etapas];
    const target = idx + dir;
    if (target < 0 || target >= copy.length) return;
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setEtapas(copy);
  };

  const setEtapa = (idx: number, key: keyof CotizacionEtapa, val: any) =>
    setEtapas(prev => prev.map((e, i) => i === idx ? { ...e, [key]: val } : e));

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.folio || !form.cliente || !form.descripcion || !form.responsable) {
      setError('Folio, cliente, descripción y responsable son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let savedId = itemId;
      if (itemId) {
        await cotizacionViaService.update(itemId, form);
      } else {
        const created = await cotizacionViaService.create(form);
        savedId = created.id;
      }
      if (savedId) {
        await cotizacionViaService.upsertEtapas(
          savedId,
          etapas.map((e, i) => ({
            viajero_cot_id:    savedId!,
            nombre_etapa:      e.nombre_etapa || '',
            responsable_etapa: e.responsable_etapa || '',
            tiempo_estimado:   e.tiempo_estimado || 0,
            estado:            e.estado || 'pendiente',
            orden:             i,
          }))
        );
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la cotización.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={clsx(
              'relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden z-10',
              isDarkMode
                ? 'bg-slate-950/95 border-white/10 backdrop-blur-2xl'
                : 'bg-white border-slate-200'
            )}
          >
            {/* Header */}
            <div className={clsx('flex items-center justify-between px-6 py-4 border-b shrink-0', isDarkMode ? 'border-white/[0.06]' : 'border-slate-100')}>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-white">
                  {itemId ? 'Editar Cotización' : 'Nueva Cotización'}
                </h2>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                  {form.folio || '—'}
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className={clsx('flex border-b shrink-0', isDarkMode ? 'border-white/[0.06]' : 'border-slate-100')}>
              {(['general', 'etapas'] as TabId[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2',
                    activeTab === tab
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  )}
                >
                  {tab === 'general' ? 'General' : 'Etapas'}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                  {error}
                </div>
              )}

              {/* ── General tab ── */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Folio *</label>
                      <input className={inputCls(isDarkMode)} value={form.folio || ''} onChange={e => set('folio', e.target.value)} placeholder="COT-2026-001" />
                    </div>
                    <div>
                      <label className={labelCls}>Prioridad</label>
                      <select className={inputCls(isDarkMode)} value={form.prioridad || 'NORMAL'} onChange={e => set('prioridad', e.target.value)}>
                        {(['NORMAL','ALTA','URGENTE'] as const).map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Cliente *</label>
                    <input className={inputCls(isDarkMode)} value={form.cliente || ''} onChange={e => set('cliente', e.target.value)} placeholder="Nombre del cliente" />
                  </div>

                  <div>
                    <label className={labelCls}>Contacto</label>
                    <input className={inputCls(isDarkMode)} value={form.contacto || ''} onChange={e => set('contacto', e.target.value)} placeholder="Nombre del contacto" />
                  </div>

                  <div>
                    <label className={labelCls}>Descripción *</label>
                    <textarea rows={3} className={clsx(inputCls(isDarkMode), 'resize-none')} value={form.descripcion || ''} onChange={e => set('descripcion', e.target.value)} placeholder="Descripción del proyecto / servicio cotizado" />
                  </div>

                  <div>
                    <label className={labelCls}>Responsable *</label>
                    <input className={inputCls(isDarkMode)} value={form.responsable || ''} onChange={e => set('responsable', e.target.value)} placeholder="Nombre del responsable" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Valor Estimado ($)</label>
                      <input type="number" min={0} step={100} className={inputCls(isDarkMode)} value={form.valor_estimado || 0} onChange={e => set('valor_estimado', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Probabilidad Cierre: {form.probabilidad_cierre}%</label>
                      <input type="range" min={0} max={100} step={5} className="w-full mt-2 accent-blue-500" value={form.probabilidad_cierre || 50} onChange={e => set('probabilidad_cierre', Number(e.target.value))} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Estatus</label>
                    <select className={inputCls(isDarkMode)} value={form.estatus || 'RFQ_RECIBIDA'} onChange={e => set('estatus', e.target.value)}>
                      {COT_ESTATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{COT_ESTATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Fecha Recepción</label>
                      <input type="date" className={inputCls(isDarkMode)} value={form.fecha_recepcion || ''} onChange={e => set('fecha_recepcion', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Fecha Límite</label>
                      <input type="date" className={inputCls(isDarkMode)} value={form.fecha_entrega_requerida || ''} onChange={e => set('fecha_entrega_requerida', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Notas</label>
                    <textarea rows={2} className={clsx(inputCls(isDarkMode), 'resize-none')} value={form.notas || ''} onChange={e => set('notas', e.target.value)} placeholder="Observaciones adicionales..." />
                  </div>
                </div>
              )}

              {/* ── Etapas tab ── */}
              {activeTab === 'etapas' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {etapas.length} etapa(s) definidas
                    </p>
                    <button
                      onClick={addEtapa}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-600/30 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/30 transition-all"
                    >
                      <Plus size={12} /> Agregar
                    </button>
                  </div>

                  {etapas.map((e, idx) => (
                    <div key={idx} className={clsx(
                      'p-3 rounded-2xl border flex gap-3 items-start',
                      isDarkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                    )}>
                      <div className="flex flex-col gap-1 shrink-0 pt-1">
                        <button onClick={() => moveEtapa(idx, -1)} className="p-0.5 rounded hover:bg-white/10 text-slate-600 hover:text-slate-300 transition-all"><ChevronUp size={12} /></button>
                        <GripVertical size={12} className="text-slate-700 mx-auto" />
                        <button onClick={() => moveEtapa(idx, 1)} className="p-0.5 rounded hover:bg-white/10 text-slate-600 hover:text-slate-300 transition-all"><ChevronDown size={12} /></button>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelCls}>Nombre Etapa</label>
                          <input className={inputCls(isDarkMode)} value={e.nombre_etapa || ''} onChange={ev => setEtapa(idx, 'nombre_etapa', ev.target.value)} placeholder="COSTEO" />
                        </div>
                        <div>
                          <label className={labelCls}>Responsable</label>
                          <input className={inputCls(isDarkMode)} value={e.responsable_etapa || ''} onChange={ev => setEtapa(idx, 'responsable_etapa', ev.target.value)} placeholder="Ej. Ing. García" />
                        </div>
                        <div>
                          <label className={labelCls}>Tiempo Est. (días)</label>
                          <input type="number" min={0} step={0.5} className={inputCls(isDarkMode)} value={e.tiempo_estimado || 0} onChange={ev => setEtapa(idx, 'tiempo_estimado', Number(ev.target.value))} />
                        </div>
                        <div>
                          <label className={labelCls}>Estado</label>
                          <select className={inputCls(isDarkMode)} value={e.estado || 'pendiente'} onChange={ev => setEtapa(idx, 'estado', ev.target.value)}>
                            <option value="pendiente">Pendiente</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="completado">Completado</option>
                          </select>
                        </div>
                      </div>
                      <button onClick={() => removeEtapa(idx)} className="shrink-0 p-1.5 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600/20 transition-all mt-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {etapas.length === 0 && (
                    <p className="text-center text-slate-600 text-xs py-8">
                      No hay etapas definidas. Haz clic en "Agregar" para comenzar.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={clsx('flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0', isDarkMode ? 'border-white/[0.06]' : 'border-slate-100')}>
              <button
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
