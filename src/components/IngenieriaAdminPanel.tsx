import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit, Trash2, Copy,
  RefreshCw, Route, Filter
} from 'lucide-react';
import clsx from 'clsx';
import { ingenieriaService } from '../services/ingenieriaService';
import { IngenieriaManagerModal } from './IngenieriaManagerModal';
import { PrintButton } from './common/PrintButton';
import { appConfirm, toast } from '../lib/dialogs';
import type { IngenieriaItem, IngenieriaEstatus } from '../types/ingenieria';

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return 'S/F';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
};

const ESTATUS_OPTS: IngenieriaEstatus[] = ['SOLICITUD', 'DISEÑO', 'CÁLCULO', 'REVISIÓN', 'APROBACIÓN', 'LIBERADO', 'CANCELADO'];

export const IngenieriaAdminPanel: React.FC = () => {
  const [items,       setItems]       = useState<IngenieriaItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [filterEst,   setFilterEst]   = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editingId,   setEditingId]   = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ingenieriaService.getAll();
      setItems(data);
    } catch (err) {
      console.error(err);
      toast('Error al cargar proyectos de ingeniería', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = items.filter(v => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || (
      v.folio?.toLowerCase().includes(s) ||
      v.proyecto?.toLowerCase().includes(s) ||
      v.cliente?.toLowerCase().includes(s) ||
      v.responsable?.toLowerCase().includes(s)
    );
    const matchEst = !filterEst || v.estatus === filterEst;
    return matchSearch && matchEst;
  });

  // ── Selección ─────────────────────────────────────────────────────────────
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

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const ok = await appConfirm('¿Eliminar este proyecto de ingeniería? Esta acción no se puede deshacer.', 'Eliminar proyecto');
    if (!ok) return;
    try {
      await ingenieriaService.delete(id);
      toast('Proyecto eliminado', 'success');
      load();
    } catch {
      toast('Error al eliminar', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await appConfirm(`¿Eliminar ${selectedIds.size} proyecto(s) seleccionado(s)?`, 'Eliminar selección');
    if (!ok) return;
    try {
      await Promise.all([...selectedIds].map(id => ingenieriaService.delete(id)));
      toast(`${selectedIds.size} proyecto(s) eliminado(s)`, 'success');
      setSelectedIds(new Set());
      load();
    } catch {
      toast('Error al eliminar proyectos', 'error');
    }
  };

  const handleClone = async (item: IngenieriaItem) => {
    try {
      const folio = await ingenieriaService.generateFolio();
      await ingenieriaService.create({
        folio,
        proyecto: `${item.proyecto} (Copia)`,
        cliente: item.cliente,
        descripcion: item.descripcion,
        responsable: item.responsable,
        departamento: item.departamento,
        prioridad: item.prioridad,
        estatus: 'SOLICITUD',
        avance_porcentaje: 0,
        horas_est_totales: item.horas_est_totales,
        notas: item.notas,
      });
      toast('Proyecto clonado', 'success');
      load();
    } catch {
      toast('Error al clonar', 'error');
    }
  };

  const openNew = () => { setEditingId(undefined); setModalOpen(true); };
  const openEdit = (id: string) => { setEditingId(id); setModalOpen(true); };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-2xl px-3 py-2 flex-1 min-w-[180px]">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Buscar folio, proyecto, cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent text-[12px] text-white placeholder-slate-600 outline-none flex-1"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-2xl px-3 py-2">
          <Filter size={14} className="text-slate-500" />
          <select
            value={filterEst}
            onChange={e => setFilterEst(e.target.value)}
            className="bg-transparent text-[12px] text-slate-300 outline-none"
          >
            <option value="">Todos los estatus</option>
            {ESTATUS_OPTS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-all"
          >
            <Trash2 size={13} />
            Eliminar ({selectedIds.size})
          </button>
        )}

        <button
          onClick={load}
          className="p-2 border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:border-white/20 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>

        <PrintButton />

        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all"
        >
          <Plus size={14} />
          Nuevo Proyecto
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2rem_5rem_1fr_1fr_1fr_6rem_6rem_5rem_4rem_5rem] gap-2 px-4 py-2 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <div>
            <input
              type="checkbox"
              checked={filtered.length > 0 && selectedIds.size === filtered.length}
              onChange={toggleAll}
              className="accent-mcvill-accent w-3.5 h-3.5"
            />
          </div>
          <div>Folio</div>
          <div>Proyecto</div>
          <div>Cliente</div>
          <div>Responsable</div>
          <div>Prioridad</div>
          <div>Estatus</div>
          <div>Entrega</div>
          <div>Avance</div>
          <div>Acciones</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw size={20} className="animate-spin text-slate-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Route size={28} className="text-slate-700" />
            <p className="text-slate-600 text-sm">Sin proyectos</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ delay: idx * 0.02 }}
                className={clsx(
                  'grid grid-cols-[2rem_5rem_1fr_1fr_1fr_6rem_6rem_5rem_4rem_5rem] gap-2 px-4 py-3 border-b border-white/5 items-center hover:bg-white/5 transition-all',
                  selectedIds.has(item.id) && 'bg-mcvill-accent/5'
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="accent-mcvill-accent w-3.5 h-3.5"
                />
                <span className="text-[11px] font-mono text-slate-300 truncate">{item.folio}</span>
                <span className="text-[12px] font-bold text-white truncate">{item.proyecto}</span>
                <span className="text-[11px] text-slate-400 truncate">{item.cliente}</span>
                <span className="text-[11px] text-slate-400 truncate">{item.responsable}</span>
                <span className={clsx(
                  'text-[10px] font-black px-2 py-0.5 rounded-lg w-fit',
                  item.prioridad === 'URGENTE' ? 'bg-rose-500/20 text-rose-400' :
                  item.prioridad === 'ALTA'    ? 'bg-amber-500/20 text-amber-400' :
                                                 'bg-slate-700/40 text-slate-400'
                )}>{item.prioridad}</span>
                <span className={clsx(
                  'text-[10px] font-black px-2 py-0.5 rounded-lg w-fit',
                  item.estatus === 'LIBERADO'  ? 'bg-emerald-500/20 text-emerald-400' :
                  item.estatus === 'CANCELADO' ? 'bg-rose-500/20 text-rose-400' :
                  item.estatus === 'APROBACIÓN'? 'bg-blue-500/20 text-blue-400' :
                                                 'bg-slate-600/30 text-slate-400'
                )}>{item.estatus}</span>
                <span className="text-[11px] text-slate-400">{fmtDate(item.fecha_entrega)}</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-mcvill-accent rounded-full"
                      style={{ width: `${item.avance_porcentaje || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 w-6 text-right">{item.avance_porcentaje || 0}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(item.id)}
                    className="p-1.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-mcvill-accent/40 transition-all"
                    title="Editar"
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    onClick={() => handleClone(item)}
                    className="p-1.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
                    title="Clonar"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-xl border border-white/10 text-red-500 hover:text-white hover:bg-red-600 hover:border-red-600 transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      <IngenieriaManagerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        itemId={editingId}
        onSaved={() => { setModalOpen(false); load(); }}
      />
    </div>
  );
};
