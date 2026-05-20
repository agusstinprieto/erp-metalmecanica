import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Plus, Trash2, GripVertical,
  ChevronUp, ChevronDown, DollarSign, User,
  FileText, Calendar
} from 'lucide-react';
import clsx from 'clsx';
import { ventasViaService } from '../services/ventasViaService';
import { toast } from '../lib/dialogs';
import type { VentasItem, VentasEtapa, VentasEstatus, VentasPrioridad, VentasMoneda, VentasEtapaEstado } from '../types/ventas';
import { VENTAS_ESTATUS_OPTIONS, VENTAS_ESTATUS_LABELS, DEFAULT_VENTAS_ETAPAS } from '../types/ventas';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string | null;
  onSaved: () => void;
}

type TabId = 'general' | 'etapas';

interface LocalEtapa {
  key: string;
  nombre_etapa: string;
  responsable_etapa: string;
  tiempo_estimado: string;
  estado: VentasEtapaEstado;
}

const defaultForm = () => ({
  folio: '',
  cliente: '',
  contacto: '',
  descripcion: '',
  responsable_ventas: '',
  estatus: 'PROSPECTO' as VentasEstatus,
  prioridad: 'NORMAL' as VentasPrioridad,
  valor_pedido: '',
  moneda: 'MXN' as VentasMoneda,
  avance_porcentaje: '0',
  fecha_pedido: '',
  fecha_entrega_prometida: '',
  numero_pedido_cliente: '',
  notas: '',
});

const defaultEtapas = (): LocalEtapa[] =>
  DEFAULT_VENTAS_ETAPAS.map((n, i) => ({
    key: `new-${i}-${Date.now()}`,
    nombre_etapa: n,
    responsable_etapa: '',
    tiempo_estimado: '',
    estado: 'pendiente' as VentasEtapaEstado,
  }));

// ─── Component ────────────────────────────────────────────────────────────────

export const VentasManagerModal: React.FC<Props> = ({ isOpen, onClose, itemId, onSaved }) => {
  const [activeTab,  setActiveTab]  = useState<TabId>('general');
  const [form,       setForm]       = useState(defaultForm());
  const [etapas,     setEtapas]     = useState<LocalEtapa[]>(defaultEtapas());
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);

  // ── Load existing item ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    if (itemId) {
      setLoading(true);
      ventasViaService.getById(itemId).then(item => {
        if (!item) return;
        setForm({
          folio:                    item.folio || '',
          cliente:                  item.cliente || '',
          contacto:                 item.contacto || '',
          descripcion:              item.descripcion || '',
          responsable_ventas:       item.responsable_ventas || '',
          estatus:                  item.estatus,
          prioridad:                item.prioridad,
          valor_pedido:             String(item.valor_pedido ?? ''),
          moneda:                   item.moneda || 'MXN',
          avance_porcentaje:        String(item.avance_porcentaje ?? 0),
          fecha_pedido:             item.fecha_pedido || '',
          fecha_entrega_prometida:  item.fecha_entrega_prometida || '',
          numero_pedido_cliente:    item.numero_pedido_cliente || '',
          notas:                    item.notas || '',
        });
        if (item.etapas && item.etapas.length > 0) {
          setEtapas(item.etapas.map(e => ({
            key: e.id,
            nombre_etapa:       e.nombre_etapa,
            responsable_etapa:  e.responsable_etapa || '',
            tiempo_estimado:    String(e.tiempo_estimado || ''),
            estado:             e.estado,
          })));
        } else {
          setEtapas(defaultEtapas());
        }
      }).catch(err => {
        console.error(err);
        toast('No se pudo cargar el pedido', 'error');
      }).finally(() => setLoading(false));
    } else {
      setForm(defaultForm());
      setEtapas(defaultEtapas());
      // Auto-generate folio
      ventasViaService.generateFolio().then(f => setForm(p => ({ ...p, folio: f }))).catch(() => {});
    }
    setActiveTab('general');
  }, [isOpen, itemId]);

  // ── Form helpers ─────────────────────────────────────────────────────────

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  // ── Etapas helpers ───────────────────────────────────────────────────────

  const addEtapa = () => setEtapas(p => [...p, {
    key: `new-${Date.now()}`,
    nombre_etapa: '',
    responsable_etapa: '',
    tiempo_estimado: '',
    estado: 'pendiente',
  }]);

  const removeEtapa = (key: string) => setEtapas(p => p.filter(e => e.key !== key));

  const updateEtapa = (key: string, field: keyof LocalEtapa, value: string) =>
    setEtapas(p => p.map(e => e.key === key ? { ...e, [field]: value } : e));

  const moveEtapa = (key: string, dir: -1 | 1) => {
    setEtapas(p => {
      const arr = [...p];
      const i = arr.findIndex(e => e.key === key);
      if (i < 0) return arr;
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.folio.trim()) { toast('El folio es requerido', 'warning'); return; }
    if (!form.cliente.trim()) { toast('El cliente es requerido', 'warning'); return; }

    setSaving(true);
    try {
      const payload: Partial<VentasItem> = {
        folio:                   form.folio.trim(),
        cliente:                 form.cliente.trim(),
        contacto:                form.contacto.trim() || undefined,
        descripcion:             form.descripcion.trim(),
        responsable_ventas:      form.responsable_ventas.trim(),
        estatus:                 form.estatus,
        prioridad:               form.prioridad,
        valor_pedido:            parseFloat(form.valor_pedido) || 0,
        moneda:                  form.moneda,
        avance_porcentaje:       parseInt(form.avance_porcentaje) || 0,
        fecha_pedido:            form.fecha_pedido || undefined,
        fecha_entrega_prometida: form.fecha_entrega_prometida || undefined,
        numero_pedido_cliente:   form.numero_pedido_cliente.trim() || undefined,
        notas:                   form.notas.trim() || undefined,
      };

      let id: string;
      if (itemId) {
        const updated = await ventasViaService.update(itemId, payload);
        id = updated.id;
        toast('Pedido actualizado', 'success');
      } else {
        const created = await ventasViaService.create(payload);
        id = created.id;
        toast('Pedido creado', 'success');
      }

      // Upsert etapas
      const etapasPayload = etapas
        .filter(e => e.nombre_etapa.trim())
        .map((e, i) => ({
          viajero_venta_id:  id,
          nombre_etapa:      e.nombre_etapa.trim(),
          responsable_etapa: e.responsable_etapa.trim() || undefined,
          tiempo_estimado:   parseFloat(e.tiempo_estimado) || undefined,
          estado:            e.estado,
          orden:             i,
        })) as any[];

      await ventasViaService.upsertEtapas(id, etapasPayload);

      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast(err?.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputCls = "w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors";
  const labelCls = "text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-slate-950 border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                  <DollarSign className="text-emerald-400" size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">
                    {itemId ? 'Editar Pedido' : 'Nuevo Pedido de Venta'}
                  </h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{form.folio || 'Sin folio'}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-3 shrink-0 flex gap-2">
              {([['general','General'],['etapas','Etapas']] as [TabId,string][]).map(([id,label]) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={clsx(
                    'px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                    activeTab === id
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40'
                      : 'text-slate-500 hover:text-slate-300 border border-transparent'
                  )}
                >{label}</button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              ) : activeTab === 'general' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Folio</label>
                      <input value={form.folio} onChange={set('folio')} placeholder="PV-2026-001" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Prioridad</label>
                      <select value={form.prioridad} onChange={set('prioridad')} className={inputCls}>
                        {(['NORMAL','ALTA','URGENTE'] as VentasPrioridad[]).map(p => (
                          <option key={p} value={p} className="bg-slate-950">{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Cliente *</label>
                    <input value={form.cliente} onChange={set('cliente')} placeholder="Nombre del cliente" className={inputCls} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Contacto</label>
                      <input value={form.contacto} onChange={set('contacto')} placeholder="Nombre del contacto" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>No. Pedido Cliente</label>
                      <input value={form.numero_pedido_cliente} onChange={set('numero_pedido_cliente')} placeholder="PO-12345" className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Descripción del Pedido</label>
                    <textarea value={form.descripcion} onChange={set('descripcion')} rows={2} placeholder="Descripción del producto o servicio" className={inputCls + ' resize-none'} />
                  </div>

                  <div>
                    <label className={labelCls}>Responsable de Ventas</label>
                    <input value={form.responsable_ventas} onChange={set('responsable_ventas')} placeholder="Nombre del vendedor" className={inputCls} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Valor Pedido</label>
                      <input type="number" value={form.valor_pedido} onChange={set('valor_pedido')} placeholder="0" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Moneda</label>
                      <select value={form.moneda} onChange={set('moneda')} className={inputCls}>
                        <option value="MXN" className="bg-slate-950">MXN</option>
                        <option value="USD" className="bg-slate-950">USD</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Avance %</label>
                      <input type="number" min={0} max={100} value={form.avance_porcentaje} onChange={set('avance_porcentaje')} className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Fecha Pedido</label>
                      <input type="date" value={form.fecha_pedido} onChange={set('fecha_pedido')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Fecha Entrega Prometida</label>
                      <input type="date" value={form.fecha_entrega_prometida} onChange={set('fecha_entrega_prometida')} className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Estatus</label>
                    <select value={form.estatus} onChange={set('estatus')} className={inputCls}>
                      {VENTAS_ESTATUS_OPTIONS.map(s => (
                        <option key={s} value={s} className="bg-slate-950">{VENTAS_ESTATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Notas</label>
                    <textarea value={form.notas} onChange={set('notas')} rows={3} placeholder="Comentarios adicionales..." className={inputCls + ' resize-none'} />
                  </div>
                </div>
              ) : (
                /* Etapas Tab */
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Etapas del Proceso de Venta</p>
                    <button
                      onClick={addEtapa}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600/30 transition-all"
                    >
                      <Plus size={12} /> Agregar
                    </button>
                  </div>

                  {etapas.map((e, idx) => (
                    <div key={e.key} className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Etapa {idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveEtapa(e.key, -1)} disabled={idx === 0} className="p-1 rounded-lg text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-all"><ChevronUp size={12} /></button>
                          <button onClick={() => moveEtapa(e.key, 1)} disabled={idx === etapas.length - 1} className="p-1 rounded-lg text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-all"><ChevronDown size={12} /></button>
                          <button onClick={() => removeEtapa(e.key)} className="p-1 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Nombre Etapa</label>
                          <input value={e.nombre_etapa} onChange={ev => updateEtapa(e.key, 'nombre_etapa', ev.target.value)} placeholder="Ej: PROPUESTA" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Estado</label>
                          <select value={e.estado} onChange={ev => updateEtapa(e.key, 'estado', ev.target.value)} className={inputCls}>
                            <option value="pendiente" className="bg-slate-950">Pendiente</option>
                            <option value="en_proceso" className="bg-slate-950">En Proceso</option>
                            <option value="completado" className="bg-slate-950">Completado</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Responsable</label>
                          <input value={e.responsable_etapa} onChange={ev => updateEtapa(e.key, 'responsable_etapa', ev.target.value)} placeholder="Responsable..." className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Tiempo Est. (días)</label>
                          <input type="number" value={e.tiempo_estimado} onChange={ev => updateEtapa(e.key, 'tiempo_estimado', ev.target.value)} placeholder="0" className={inputCls} />
                        </div>
                      </div>
                    </div>
                  ))}

                  {etapas.length === 0 && (
                    <div className="py-12 text-center text-slate-700 text-[10px] font-black uppercase tracking-widest">
                      Sin etapas — agrega una
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-[11px] font-black uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                <Save size={13} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
