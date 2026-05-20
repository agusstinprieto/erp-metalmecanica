import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2
} from 'lucide-react';
import clsx from 'clsx';
import { ingenieriaService } from '../services/ingenieriaService';
import { toast } from '../lib/dialogs';
import type { IngenieriaItem, IngenieriaEtapa, IngenieriaEstatus } from '../types/ingenieria';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  onSaved: () => void;
}

const DEFAULT_ETAPAS = ['DISEÑO', 'CÁLCULO', 'REVISIÓN', 'APROBACIÓN'];

const ESTATUS_OPTS: IngenieriaEstatus[] = ['SOLICITUD', 'DISEÑO', 'CÁLCULO', 'REVISIÓN', 'APROBACIÓN', 'LIBERADO', 'CANCELADO'];

export const IngenieriaManagerModal: React.FC<Props> = ({ isOpen, onClose, itemId, onSaved }) => {
  const isEdit = !!itemId;
  const [activeTab, setActiveTab] = useState<'general' | 'etapas'>('general');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Form state ────────────────────────────────────────────────────────────
  const [folio,            setFolio]            = useState('');
  const [proyecto,         setProyecto]         = useState('');
  const [cliente,          setCliente]          = useState('');
  const [descripcion,      setDescripcion]      = useState('');
  const [responsable,      setResponsable]      = useState('');
  const [departamento,     setDepartamento]     = useState('');
  const [prioridad,        setPrioridad]        = useState<'NORMAL' | 'ALTA' | 'URGENTE'>('NORMAL');
  const [estatus,          setEstatus]          = useState<IngenieriaEstatus>('SOLICITUD');
  const [fechaSolicitud,   setFechaSolicitud]   = useState('');
  const [fechaEntrega,     setFechaEntrega]     = useState('');
  const [horasEst,         setHorasEst]         = useState(0);
  const [notas,            setNotas]            = useState('');

  const [etapas, setEtapas] = useState<Partial<IngenieriaEtapa>[]>([]);

  // ── Init ──────────────────────────────────────────────────────────────────
  const initDefaults = useCallback(async () => {
    const folio = await ingenieriaService.generateFolio();
    setFolio(folio);
    setProyecto('');
    setCliente('');
    setDescripcion('');
    setResponsable('');
    setDepartamento('');
    setPrioridad('NORMAL');
    setEstatus('SOLICITUD');
    setFechaSolicitud(new Date().toISOString().slice(0, 10));
    setFechaEntrega('');
    setHorasEst(0);
    setNotas('');
    setEtapas(DEFAULT_ETAPAS.map((n, i) => ({
      nombre_etapa: n,
      responsable_etapa: '',
      tiempo_estimado: 8,
      estado: 'pendiente' as const,
      orden: i,
    })));
  }, []);

  const loadItem = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const item = await ingenieriaService.getById(id);
      setFolio(item.folio);
      setProyecto(item.proyecto);
      setCliente(item.cliente);
      setDescripcion(item.descripcion || '');
      setResponsable(item.responsable);
      setDepartamento(item.departamento || '');
      setPrioridad(item.prioridad);
      setEstatus(item.estatus);
      setFechaSolicitud(item.fecha_solicitud || '');
      setFechaEntrega(item.fecha_entrega || '');
      setHorasEst(item.horas_est_totales || 0);
      setNotas(item.notas || '');
      const etapasData = await ingenieriaService.getEtapas(id);
      setEtapas(etapasData.length > 0 ? etapasData : DEFAULT_ETAPAS.map((n, i) => ({
        nombre_etapa: n,
        responsable_etapa: '',
        tiempo_estimado: 8,
        estado: 'pendiente' as const,
        orden: i,
      })));
    } catch {
      toast('Error al cargar el proyecto', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('general');
    if (isEdit && itemId) {
      loadItem(itemId);
    } else {
      initDefaults();
    }
  }, [isOpen, itemId, isEdit, loadItem, initDefaults]);

  // ── Etapas helpers ────────────────────────────────────────────────────────
  const addEtapa = () => {
    setEtapas(prev => [...prev, {
      nombre_etapa: '',
      responsable_etapa: '',
      tiempo_estimado: 8,
      estado: 'pendiente' as const,
      orden: prev.length,
    }]);
  };

  const removeEtapa = (idx: number) => {
    setEtapas(prev => prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, orden: i })));
  };

  const moveEtapa = (idx: number, dir: -1 | 1) => {
    const next = [...etapas];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setEtapas(next.map((e, i) => ({ ...e, orden: i })));
  };

  const updateEtapa = (idx: number, field: keyof IngenieriaEtapa, value: any) => {
    setEtapas(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!proyecto.trim()) { toast('El nombre del proyecto es requerido', 'warning'); return; }
    if (!cliente.trim())  { toast('El cliente es requerido', 'warning'); return; }
    if (!responsable.trim()) { toast('El responsable es requerido', 'warning'); return; }

    setSaving(true);
    try {
      const payload: Partial<IngenieriaItem> = {
        folio,
        proyecto,
        cliente,
        descripcion,
        responsable,
        departamento,
        prioridad,
        estatus,
        fecha_solicitud: fechaSolicitud || undefined,
        fecha_entrega: fechaEntrega || undefined,
        horas_est_totales: horasEst,
        notas,
      };

      let id = itemId;
      if (isEdit && id) {
        await ingenieriaService.update(id, payload);
      } else {
        const created = await ingenieriaService.create(payload);
        id = created.id;
      }

      if (id && etapas.length > 0) {
        await ingenieriaService.upsertEtapas(id, etapas);
      }

      toast(isEdit ? 'Proyecto actualizado' : 'Proyecto creado', 'success');
      onSaved();
    } catch (err) {
      console.error(err);
      toast('Error al guardar el proyecto', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
              <h3 className="text-base font-black text-white uppercase tracking-widest">
                {isEdit ? 'Editar Proyecto' : 'Nuevo Proyecto de Ingeniería'}
              </h3>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/5 shrink-0">
              {(['general', 'etapas'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 transition-all',
                    activeTab === tab
                      ? 'border-mcvill-accent text-mcvill-accent bg-mcvill-accent/5'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  )}
                >
                  {tab === 'general' ? 'General' : `Etapas (${etapas.length})`}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 size={24} className="animate-spin text-slate-500" />
                </div>
              ) : activeTab === 'general' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Folio */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Folio</label>
                    <input
                      value={folio}
                      onChange={e => setFolio(e.target.value)}
                      className="mt-1 w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mcvill-accent/50"
                    />
                  </div>
                  {/* Proyecto */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Proyecto *</label>
                    <input
                      value={proyecto}
                      onChange={e => setProyecto(e.target.value)}
                      placeholder="Nombre del proyecto"
                      className="mt-1 w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mcvill-accent/50"
                    />
                  </div>
                  {/* Cliente */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliente *</label>
                    <input
                      value={cliente}
                      onChange={e => setCliente(e.target.value)}
                      placeholder="Nombre del cliente"
                      className="mt-1 w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mcvill-accent/50"
                    />
                  </div>
                  {/* Responsable */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Responsable *</label>
                    <input
                      value={responsable}
                      onChange={e => setResponsable(e.target.value)}
                      placeholder="Ingeniero responsable"
                      className="mt-1 w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mcvill-accent/50"
                    />
                  </div>
                  {/* Departamento */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Departamento</label>
                    <input
                      value={departamento}
                      onChange={e => setDepartamento(e.target.value)}
                      placeholder="Depto. solicitante"
                      className="mt-1 w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mcvill-accent/50"
                    />
                  </div>
                  {/* Prioridad */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prioridad</label>
                    <select
                      value={prioridad}
                      onChange={e => setPrioridad(e.target.value as any)}
                      className="mt-1 w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mcvill-accent/50"
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="ALTA">ALTA</option>
                      <option value="URGENTE">URGENTE</option>
                    </select>
                  </div>
                  {/* Estatus */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estatus</label>
                    <select
                      value={estatus}
                      onChange={e => setEstatus(e.target.value as IngenieriaEstatus)}
                      className="mt-1 w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mcvill-accent/50"
                    >
                      {ESTATUS_OPTS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  {/* Horas estimadas */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Horas Est. Totales</label>
                    <input
                      type="number"
                      min={0}
                      value={horasEst}
                      onChange={e => setHorasEst(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mcvill-accent/50"
                    />
                  </div>
                  {/* Fecha solicitud */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha Solicitud</label>
                    <input
                      type="date"
                      value={fechaSolicitud}
                      onChange={e => setFechaSolicitud(e.target.value)}
                      className="mt-1 w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mcvill-accent/50"
                    />
                  </div>
                  {/* Fecha entrega */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha Entrega</label>
                    <input
                      type="date"
                      value={fechaEntrega}
                      onChange={e => setFechaEntrega(e.target.value)}
                      className="mt-1 w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mcvill-accent/50"
                    />
                  </div>
                  {/* Descripcion */}
                  <div className="col-span-full">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripción</label>
                    <textarea
                      value={descripcion}
                      onChange={e => setDescripcion(e.target.value)}
                      rows={2}
                      placeholder="Descripción del proyecto..."
                      className="mt-1 w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mcvill-accent/50 resize-none"
                    />
                  </div>
                  {/* Notas */}
                  <div className="col-span-full">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notas</label>
                    <textarea
                      value={notas}
                      onChange={e => setNotas(e.target.value)}
                      rows={2}
                      placeholder="Notas adicionales..."
                      className="mt-1 w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-mcvill-accent/50 resize-none"
                    />
                  </div>
                </div>
              ) : (
                /* Etapas tab */
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] text-slate-500">
                    Define las etapas del flujo de ingeniería. Usa las flechas para reordenar.
                  </p>
                  {etapas.map((etapa, idx) => (
                    <div key={idx} className="bg-slate-800/60 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-600 w-5">{idx + 1}</span>
                        <input
                          value={etapa.nombre_etapa || ''}
                          onChange={e => updateEtapa(idx, 'nombre_etapa', e.target.value)}
                          placeholder="Nombre de etapa"
                          className="flex-1 bg-slate-700/60 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-mcvill-accent/50"
                        />
                        <select
                          value={etapa.estado || 'pendiente'}
                          onChange={e => updateEtapa(idx, 'estado', e.target.value)}
                          className="bg-slate-700/60 border border-white/10 rounded-xl px-2 py-1.5 text-[11px] text-white focus:outline-none"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_proceso">En Proceso</option>
                          <option value="completado">Completado</option>
                        </select>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveEtapa(idx, -1)} className="p-0.5 text-slate-500 hover:text-white transition-colors">
                            <ChevronUp size={12} />
                          </button>
                          <button onClick={() => moveEtapa(idx, 1)} className="p-0.5 text-slate-500 hover:text-white transition-colors">
                            <ChevronDown size={12} />
                          </button>
                        </div>
                        <button onClick={() => removeEtapa(idx)} className="p-1 text-red-500 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pl-7">
                        <input
                          value={etapa.responsable_etapa || ''}
                          onChange={e => updateEtapa(idx, 'responsable_etapa', e.target.value)}
                          placeholder="Responsable"
                          className="flex-1 bg-slate-700/40 border border-white/5 rounded-xl px-3 py-1 text-xs text-slate-300 focus:outline-none focus:border-mcvill-accent/50"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-600">Hrs:</span>
                          <input
                            type="number"
                            min={0}
                            value={etapa.tiempo_estimado || 0}
                            onChange={e => updateEtapa(idx, 'tiempo_estimado', Number(e.target.value))}
                            className="w-16 bg-slate-700/40 border border-white/5 rounded-xl px-2 py-1 text-xs text-slate-300 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addEtapa}
                    className="flex items-center gap-2 px-4 py-2 border border-dashed border-white/20 rounded-2xl text-[11px] text-slate-500 hover:text-white hover:border-white/40 transition-all"
                  >
                    <Plus size={14} /> Agregar Etapa
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-[11px] font-black uppercase tracking-widest border border-white/10 text-slate-400 hover:text-white hover:border-white/20 rounded-2xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 text-[11px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Proyecto'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
