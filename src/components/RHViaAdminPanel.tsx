import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit, Trash2, Copy,
  RefreshCw, ChevronLeft, Zap, Users
} from 'lucide-react';
import { rhViaService } from '../services/rhViaService';
import { useConfig } from '../contexts/ConfigContext';
import { useCyberModal } from '../hooks/useCyberModal';
import { CyberModal } from './common/CyberModal';
import { PrintButton } from './common/PrintButton';
import { RHManagerModal } from './RHManagerModal';
import clsx from 'clsx';
import type { RHItem, RHEstatus } from '../types/rhVia';

const ESTATUS_OPTIONS: RHEstatus[] = [
  'VACANTE', 'RECLUTAMIENTO', 'ENTREVISTAS', 'SELECCION',
  'OFERTA', 'ONBOARDING', 'ACTIVO', 'CANCELADO',
];

const ESTATUS_COLORS: Record<RHEstatus, string> = {
  VACANTE:       'bg-slate-600/20 text-slate-400 border-slate-600/40',
  RECLUTAMIENTO: 'bg-blue-600/20 text-blue-400 border-blue-600/40',
  ENTREVISTAS:   'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
  SELECCION:     'bg-violet-500/20 text-violet-400 border-violet-500/40',
  OFERTA:        'bg-amber-500/20 text-amber-400 border-amber-500/40',
  ONBOARDING:    'bg-sky-500/20 text-sky-400 border-sky-500/40',
  ACTIVO:        'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  CANCELADO:     'bg-rose-600/20 text-rose-400 border-rose-600/40',
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
};

export const RHViaAdminPanel: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { isDarkMode } = useConfig();
  const [items,         setItems]         = useState<RHItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterEstatus, setFilterEstatus] = useState<RHEstatus | 'todas'>('todas');
  const [filterUrgente, setFilterUrgente] = useState<'todas' | 'urgente' | 'normal'>('todas');
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editItemId,    setEditItemId]    = useState<string | undefined>(undefined);

  const { modal, showConfirm, showSuccess, showError, hideModal } = useCyberModal();

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rhViaService.getAll();
      setItems(data);
    } catch (err) {
      console.error('Error loading viajeros_rh:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = items.filter(v => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || (
      v.puesto?.toLowerCase().includes(q) ||
      v.departamento?.toLowerCase().includes(q) ||
      v.solicitante?.toLowerCase().includes(q) ||
      v.folio?.toLowerCase().includes(q)
    );
    const matchEstatus = filterEstatus === 'todas' || v.estatus === filterEstatus;
    const matchUrgente =
      filterUrgente === 'todas' ||
      (filterUrgente === 'urgente' && v.urgente) ||
      (filterUrgente === 'normal' && !v.urgente);
    return matchSearch && matchEstatus && matchUrgente;
  });

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(v => v.id)));
    }
  };

  // ── CRUD actions ───────────────────────────────────────────────────────────

  const handleNew = () => { setEditItemId(undefined); setModalOpen(true); };
  const handleEdit = (id: string) => { setEditItemId(id); setModalOpen(true); };

  const handleClone = async (item: RHItem) => {
    try {
      const year = new Date().getFullYear();
      const count = items.length + 1;
      const folio = `RH-${year}-${String(count).padStart(3, '0')}`;
      const { id, created_at, updated_at, etapas, ...rest } = item as any;
      await rhViaService.create({ ...rest, folio, estatus: 'VACANTE', candidato_seleccionado: '', avance_porcentaje: 0 });
      await fetchData();
      showSuccess('Solicitud clonada correctamente');
    } catch (err) {
      console.error('Clone error:', err);
      showError('No se pudo clonar la solicitud');
    }
  };

  const handleDelete = (id: string) => {
    showConfirm(
      '¿Eliminar esta solicitud de RH?',
      'Esta acción no se puede deshacer.',
      async () => {
        try {
          await rhViaService.delete(id);
          setItems(prev => prev.filter(v => v.id !== id));
          showSuccess('Solicitud eliminada');
        } catch (err) {
          console.error('Delete error:', err);
          showError('No se pudo eliminar la solicitud');
        }
      }
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    showConfirm(
      `¿Eliminar ${selectedIds.size} solicitude${selectedIds.size > 1 ? 's' : ''}?`,
      'Esta acción no se puede deshacer.',
      async () => {
        try {
          await Promise.all([...selectedIds].map(id => rhViaService.delete(id)));
          setItems(prev => prev.filter(v => !selectedIds.has(v.id)));
          setSelectedIds(new Set());
          showSuccess('Solicitudes eliminadas');
        } catch (err) {
          console.error('Bulk delete error:', err);
          showError('Error al eliminar solicitudes');
        }
      }
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={clsx(
        'shrink-0 border-b px-6 py-4 flex items-center justify-between gap-4 flex-wrap',
        isDarkMode ? 'bg-mcvill-bg border-mcvill-card-border/30' : 'bg-white border-blue-100'
      )}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Users size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className={clsx('text-lg font-black tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
              Admin — Flujo RH
            </h1>
            <p className={clsx('text-[10px] font-bold tracking-widest uppercase', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
              {items.length} solicitudes totales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-red-600/10 border border-red-500/30 text-red-400 hover:bg-red-600/20 transition-all"
            >
              <Trash2 size={12} />
              Eliminar ({selectedIds.size})
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <PrintButton />
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20 transition-all"
          >
            <Plus size={14} />
            Nueva Vacante
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="shrink-0 px-6 py-3 flex items-center gap-3 flex-wrap border-b border-white/[0.05]">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar puesto, depto, solicitante…"
            className={clsx(
              'w-full pl-8 pr-3 py-1.5 rounded-xl border text-[11px] outline-none transition-all',
              isDarkMode
                ? 'bg-white/[0.04] border-white/[0.08] text-slate-300 placeholder-slate-600 focus:border-blue-500/40'
                : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-blue-400'
            )}
          />
        </div>
        <select
          value={filterEstatus}
          onChange={e => setFilterEstatus(e.target.value as any)}
          className={clsx(
            'px-3 py-1.5 rounded-xl border text-[11px] outline-none',
            isDarkMode ? 'bg-slate-900 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          )}
        >
          <option value="todas">Todos los estatus</option>
          {ESTATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterUrgente}
          onChange={e => setFilterUrgente(e.target.value as any)}
          className={clsx(
            'px-3 py-1.5 rounded-xl border text-[11px] outline-none',
            isDarkMode ? 'bg-slate-900 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          )}
        >
          <option value="todas">Urgencia: todas</option>
          <option value="urgente">Solo urgentes</option>
          <option value="normal">Solo normales</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-40 gap-3 text-slate-500">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Cargando…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            Sin solicitudes para este filtro
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className={clsx(
                  'border-b',
                  isDarkMode ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                )}>
                  <th className="px-3 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="accent-blue-500"
                    />
                  </th>
                  {['Folio', 'Puesto', 'Departamento', 'Solicitante', 'Resp. RH', 'Pos.', 'Estatus', 'Fecha Obj.', 'Urgente', 'Acciones'].map(h => (
                    <th key={h} className={clsx(
                      'px-3 py-2.5 text-left font-black uppercase tracking-wider',
                      isDarkMode ? 'text-slate-500' : 'text-slate-400'
                    )}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((v, idx) => (
                    <motion.tr
                      key={v.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className={clsx(
                        'border-b transition-all',
                        isDarkMode
                          ? `border-white/[0.04] ${idx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-transparent'} hover:bg-white/[0.04]`
                          : `border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50`
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(v.id)}
                          onChange={() => toggleSelect(v.id)}
                          className="accent-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={clsx('font-black', isDarkMode ? 'text-blue-400' : 'text-blue-600')}>
                          {v.folio}
                        </span>
                      </td>
                      <td className={clsx('px-3 py-2.5 font-semibold max-w-[130px] truncate', isDarkMode ? 'text-slate-200' : 'text-slate-800')}>
                        {v.puesto}
                      </td>
                      <td className={clsx('px-3 py-2.5', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                        {v.departamento}
                      </td>
                      <td className={clsx('px-3 py-2.5', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                        {v.solicitante}
                      </td>
                      <td className={clsx('px-3 py-2.5', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                        {v.responsable_rh || '—'}
                      </td>
                      <td className={clsx('px-3 py-2.5 text-center font-black', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
                        {v.num_posiciones ?? 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider',
                          ESTATUS_COLORS[v.estatus]
                        )}>
                          {v.estatus}
                        </span>
                      </td>
                      <td className={clsx('px-3 py-2.5', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                        {fmtDate(v.fecha_objetivo)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {v.urgente && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black">
                            <Zap size={9} />
                            URGENTE
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(v.id)}
                            className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
                            title="Editar"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => handleClone(v)}
                            className="p-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-400 hover:bg-slate-500/20 transition-all"
                            title="Clonar"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="p-1.5 rounded-lg bg-red-600/10 border border-red-600/20 text-red-400 hover:bg-red-600/20 transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <RHManagerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        itemId={editItemId}
        onSaved={() => { setModalOpen(false); fetchData(); }}
      />

      {/* Cyber dialogs */}
      <CyberModal {...modal} onClose={hideModal} />
    </div>
  );
};
