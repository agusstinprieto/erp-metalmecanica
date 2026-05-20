import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Plus, Trash2, ChevronUp, ChevronDown, Zap
} from 'lucide-react';
import { rhViaService } from '../services/rhViaService';
import { useConfig } from '../contexts/ConfigContext';
import clsx from 'clsx';
import type { RHItem, RHEtapa, RHEstatus, RHPrioridad } from '../types/rhVia';

const ESTATUS_OPTIONS: RHEstatus[] = [
  'VACANTE', 'RECLUTAMIENTO', 'ENTREVISTAS', 'SELECCION',
  'OFERTA', 'ONBOARDING', 'ACTIVO', 'CANCELADO',
];

const PRIORIDAD_OPTIONS: RHPrioridad[] = ['NORMAL', 'ALTA', 'URGENTE'];

const DEFAULT_ETAPAS: Partial<RHEtapa>[] = [
  { nombre_etapa: 'RECLUTAMIENTO',  estado: 'pendiente', orden: 0 },
  { nombre_etapa: 'ENTREVISTAS',    estado: 'pendiente', orden: 1 },
  { nombre_etapa: 'SELECCIÓN',      estado: 'pendiente', orden: 2 },
  { nombre_etapa: 'OFERTA',         estado: 'pendiente', orden: 3 },
  { nombre_etapa: 'ONBOARDING',     estado: 'pendiente', orden: 4 },
];

function genFolio(count: number): string {
  const year = new Date().getFullYear();
  return `RH-${year}-${String(count).padStart(3, '0')}`;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  onSaved: () => void;
}

export const RHManagerModal: React.FC<Props> = ({ isOpen, onClose, itemId, onSaved }) => {
  const { isDarkMode } = useConfig();
  const [activeTab, setActiveTab] = useState<'general' | 'etapas'>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [folio,                setFolio]                = useState('');
  const [puesto,               setPuesto]               = useState('');
  const [departamento,         setDepartamento]         = useState('');
  const [solicitante,          setSolicitante]          = useState('');
  const [responsable_rh,       setResponsableRh]        = useState('');
  const [num_posiciones,       setNumPosiciones]        = useState(1);
  const [salario_min,          setSalarioMin]           = useState<string>('');
  const [salario_max,          setSalarioMax]           = useState<string>('');
  const [urgente,              setUrgente]              = useState(false);
  const [prioridad,            setPrioridad]            = useState<RHPrioridad>('NORMAL');
  const [estatus,              setEstatus]              = useState<RHEstatus>('VACANTE');
  const [fecha_apertura,       setFechaApertura]        = useState('');
  const [fecha_objetivo,       setFechaObjetivo]        = useState('');
  const [candidato_seleccionado, setCandidato]          = useState('');
  const [motivo_cancelacion,   setMotivoCancelacion]    = useState('');
  const [notas,                setNotas]                = useState('');
  const [etapas,               setEtapas]               = useState<Partial<RHEtapa>[]>(DEFAULT_ETAPAS);

  // ── Load existing item ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setActiveTab('general');

    if (itemId) {
      rhViaService.getById(itemId).then(item => {
        if (!item) return;
        setFolio(item.folio || '');
        setPuesto(item.puesto || '');
        setDepartamento(item.departamento || '');
        setSolicitante(item.solicitante || '');
        setResponsableRh(item.responsable_rh || '');
        setNumPosiciones(item.num_posiciones ?? 1);
        setSalarioMin(item.salario_min != null ? String(item.salario_min) : '');
        setSalarioMax(item.salario_max != null ? String(item.salario_max) : '');
        setUrgente(item.urgente ?? false);
        setPrioridad(item.prioridad || 'NORMAL');
        setEstatus(item.estatus || 'VACANTE');
        setFechaApertura(item.fecha_apertura || '');
        setFechaObjetivo(item.fecha_objetivo || '');
        setCandidato(item.candidato_seleccionado || '');
        setMotivoCancelacion(item.motivo_cancelacion || '');
        setNotas(item.notas || '');
        setEtapas(item.etapas?.length ? item.etapas : DEFAULT_ETAPAS);
      });
    } else {
      // New item defaults
      setFolio(genFolio(Math.floor(Math.random() * 900) + 100));
      setPuesto('');
      setDepartamento('');
      setSolicitante('');
      setResponsableRh('');
      setNumPosiciones(1);
      setSalarioMin('');
      setSalarioMax('');
      setUrgente(false);
      setPrioridad('NORMAL');
      setEstatus('VACANTE');
      setFechaApertura(new Date().toISOString().split('T')[0]);
      setFechaObjetivo('');
      setCandidato('');
      setMotivoCancelacion('');
      setNotas('');
      setEtapas(DEFAULT_ETAPAS);
    }
  }, [isOpen, itemId]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!puesto.trim())       { setError('El puesto es requerido.');       return; }
    if (!departamento.trim()) { setError('El departamento es requerido.'); return; }
    if (!solicitante.trim())  { setError('El solicitante es requerido.');  return; }

    setSaving(true);
    setError(null);
    try {
      const payload: Partial<RHItem> = {
        folio:                   folio.trim() || genFolio(Date.now() % 999 + 1),
        puesto:                  puesto.trim(),
        departamento:            departamento.trim(),
        solicitante:             solicitante.trim(),
        responsable_rh:          responsable_rh.trim() || undefined,
        num_posiciones:          num_posiciones,
        salario_min:             salario_min ? parseFloat(salario_min) : undefined,
        salario_max:             salario_max ? parseFloat(salario_max) : undefined,
        urgente,
        prioridad,
        estatus,
        avance_porcentaje:       0,
        fecha_apertura:          fecha_apertura || undefined,
        fecha_objetivo:          fecha_objetivo || undefined,
        candidato_seleccionado:  candidato.trim() || undefined,
        motivo_cancelacion:      motivo_cancelacion.trim() || undefined,
        notas:                   notas.trim() || undefined,
      };

      let savedId: string;
      if (itemId) {
        const updated = await rhViaService.update(itemId, payload);
        savedId = updated.id;
      } else {
        const created = await rhViaService.create(payload);
        savedId = created.id;
      }

      // Save etapas
      if (etapas.length > 0) {
        await rhViaService.upsertEtapas(savedId, etapas.map((e, i) => ({
          ...e,
          viajero_rh_id: savedId,
          orden: i,
          estado: e.estado || 'pendiente',
        })));
      }

      onSaved();
    } catch (err: any) {
      console.error('Save RH error:', err);
      setError(err?.message || 'Error al guardar. Verifica los datos e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Etapas helpers ─────────────────────────────────────────────────────────

  const addEtapa = () => {
    setEtapas(prev => [...prev, { nombre_etapa: '', estado: 'pendiente', orden: prev.length }]);
  };

  const removeEtapa = (idx: number) => {
    setEtapas(prev => prev.filter((_, i) => i !== idx));
  };

  const updateEtapa = (idx: number, field: keyof RHEtapa, value: any) => {
    setEtapas(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const moveEtapa = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= etapas.length) return;
    setEtapas(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  // ── UI ─────────────────────────────────────────────────────────────────────

  const inputCls = clsx(
    'w-full px-3 py-2 rounded-xl border text-[12px] outline-none transition-all',
    isDarkMode
      ? 'bg-white/[0.05] border-white/[0.10] text-slate-200 placeholder-slate-600 focus:border-blue-500/50'
      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-400'
  );

  const labelCls = clsx(
    'block text-[10px] font-black uppercase tracking-wider mb-1',
    isDarkMode ? 'text-slate-500' : 'text-slate-400'
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={clsx(
              'relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[24px] border shadow-2xl',
              isDarkMode
                ? 'bg-slate-950 border-white/10'
                : 'bg-white border-slate-200'
            )}
          >
            {/* Header */}
            <div className={clsx(
              'shrink-0 flex items-center justify-between px-6 py-4 border-b',
              isDarkMode ? 'border-white/[0.06]' : 'border-slate-100'
            )}>
              <div>
                <h2 className={clsx('text-base font-black tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
                  {itemId ? 'Editar Solicitud RH' : 'Nueva Vacante RH'}
                </h2>
                <p className={clsx('text-[10px] font-bold uppercase tracking-widest', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                  {folio}
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className={clsx('shrink-0 flex border-b px-6', isDarkMode ? 'border-white/[0.06]' : 'border-slate-100')}>
              {(['general', 'etapas'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'px-4 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all -mb-px',
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
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-[11px] font-semibold">
                  {error}
                </div>
              )}

              {activeTab === 'general' && (
                <div className="space-y-4">
                  {/* Row 1 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Folio</label>
                      <input value={folio} onChange={e => setFolio(e.target.value)} className={inputCls} placeholder="RH-2026-001" />
                    </div>
                    <div>
                      <label className={labelCls}>Estatus</label>
                      <select value={estatus} onChange={e => setEstatus(e.target.value as RHEstatus)} className={inputCls}>
                        {ESTATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div>
                    <label className={labelCls}>Puesto *</label>
                    <input value={puesto} onChange={e => setPuesto(e.target.value)} className={inputCls} placeholder="Ej. Soldador MIG" />
                  </div>

                  {/* Row 3 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Departamento *</label>
                      <input value={departamento} onChange={e => setDepartamento(e.target.value)} className={inputCls} placeholder="Ej. Producción" />
                    </div>
                    <div>
                      <label className={labelCls}>Solicitante *</label>
                      <input value={solicitante} onChange={e => setSolicitante(e.target.value)} className={inputCls} placeholder="Nombre del solicitante" />
                    </div>
                  </div>

                  {/* Row 4 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Responsable RH</label>
                      <input value={responsable_rh} onChange={e => setResponsableRh(e.target.value)} className={inputCls} placeholder="Nombre RH asignado" />
                    </div>
                    <div>
                      <label className={labelCls}>Número de Posiciones</label>
                      <input type="number" min={1} value={num_posiciones} onChange={e => setNumPosiciones(parseInt(e.target.value) || 1)} className={inputCls} />
                    </div>
                  </div>

                  {/* Row 5 — Salarios */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Salario Mínimo ($)</label>
                      <input type="number" value={salario_min} onChange={e => setSalarioMin(e.target.value)} className={inputCls} placeholder="15000" />
                    </div>
                    <div>
                      <label className={labelCls}>Salario Máximo ($)</label>
                      <input type="number" value={salario_max} onChange={e => setSalarioMax(e.target.value)} className={inputCls} placeholder="22000" />
                    </div>
                  </div>

                  {/* Row 6 — Prioridad + Urgente */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Prioridad</label>
                      <select value={prioridad} onChange={e => setPrioridad(e.target.value as RHPrioridad)} className={inputCls}>
                        {PRIORIDAD_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Urgente</label>
                      <button
                        type="button"
                        onClick={() => setUrgente(u => !u)}
                        className={clsx(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-black transition-all',
                          urgente
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                            : isDarkMode
                              ? 'bg-white/[0.05] border-white/[0.10] text-slate-500 hover:border-white/20'
                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                        )}
                      >
                        <Zap size={14} className={urgente ? 'text-amber-400' : ''} />
                        {urgente ? 'Urgente activo' : 'No urgente'}
                      </button>
                    </div>
                  </div>

                  {/* Row 7 — Fechas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Fecha Apertura</label>
                      <input type="date" value={fecha_apertura} onChange={e => setFechaApertura(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Fecha Objetivo</label>
                      <input type="date" value={fecha_objetivo} onChange={e => setFechaObjetivo(e.target.value)} className={inputCls} />
                    </div>
                  </div>

                  {/* Candidato */}
                  <div>
                    <label className={labelCls}>Candidato Seleccionado</label>
                    <input value={candidato} onChange={e => setCandidato(e.target.value)} className={inputCls} placeholder="Nombre del candidato (si aplica)" />
                  </div>

                  {/* Motivo cancelación */}
                  {estatus === 'CANCELADO' && (
                    <div>
                      <label className={labelCls}>Motivo Cancelación</label>
                      <input value={motivo_cancelacion} onChange={e => setMotivoCancelacion(e.target.value)} className={inputCls} placeholder="Razón de cancelación" />
                    </div>
                  )}

                  {/* Notas */}
                  <div>
                    <label className={labelCls}>Notas</label>
                    <textarea
                      value={notas}
                      onChange={e => setNotas(e.target.value)}
                      rows={3}
                      className={clsx(inputCls, 'resize-none')}
                      placeholder="Observaciones, requisitos especiales, etc."
                    />
                  </div>
                </div>
              )}

              {activeTab === 'etapas' && (
                <div className="space-y-3">
                  <p className={clsx('text-[10px] font-bold uppercase tracking-wider mb-3', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                    Etapas del proceso ({etapas.length})
                  </p>

                  {etapas.map((etapa, idx) => (
                    <motion.div
                      key={idx}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={clsx(
                        'p-3 rounded-xl border flex items-center gap-3',
                        isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveEtapa(idx, -1)} disabled={idx === 0} className="p-0.5 text-slate-500 hover:text-slate-300 disabled:opacity-20">
                          <ChevronUp size={12} />
                        </button>
                        <button onClick={() => moveEtapa(idx, 1)} disabled={idx === etapas.length - 1} className="p-0.5 text-slate-500 hover:text-slate-300 disabled:opacity-20">
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      <span className={clsx('text-[10px] font-black w-5 shrink-0', isDarkMode ? 'text-slate-600' : 'text-slate-400')}>
                        {idx + 1}
                      </span>
                      <input
                        value={etapa.nombre_etapa || ''}
                        onChange={e => updateEtapa(idx, 'nombre_etapa', e.target.value)}
                        className={clsx(inputCls, 'flex-1')}
                        placeholder="Nombre de la etapa"
                      />
                      <input
                        value={etapa.responsable_etapa || ''}
                        onChange={e => updateEtapa(idx, 'responsable_etapa', e.target.value)}
                        className={clsx(inputCls, 'flex-1')}
                        placeholder="Responsable"
                      />
                      <select
                        value={etapa.estado || 'pendiente'}
                        onChange={e => updateEtapa(idx, 'estado', e.target.value)}
                        className={clsx(inputCls, 'w-auto')}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_proceso">En proceso</option>
                        <option value="completado">Completado</option>
                      </select>
                      <button
                        onClick={() => removeEtapa(idx)}
                        className="p-1.5 rounded-lg bg-red-600/10 border border-red-600/20 text-red-400 hover:bg-red-600/20 transition-all shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </motion.div>
                  ))}

                  <button
                    onClick={addEtapa}
                    className={clsx(
                      'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all',
                      isDarkMode
                        ? 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/20'
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    )}
                  >
                    <Plus size={14} />
                    Agregar Etapa
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={clsx(
              'shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t',
              isDarkMode ? 'border-white/[0.06]' : 'border-slate-100'
            )}>
              <button
                onClick={onClose}
                className={clsx(
                  'px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-wider border transition-all',
                  isDarkMode
                    ? 'bg-white/[0.04] border-white/[0.10] text-slate-400 hover:text-white hover:border-white/20'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                )}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-black uppercase tracking-wider bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50 transition-all"
              >
                <Save size={14} />
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
