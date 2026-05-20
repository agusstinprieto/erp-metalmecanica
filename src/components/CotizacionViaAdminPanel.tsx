import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Trash2, Edit, RefreshCw, Copy, FileText,
} from 'lucide-react';
import clsx from 'clsx';
import { cotizacionViaService } from '../services/cotizacionViaService';
import { COT_ESTATUS_LABELS, COT_ESTATUS_OPTIONS } from '../types/cotizacion';
import type { CotizacionItem, CotizacionEstatus } from '../types/cotizacion';
import { CotizacionManagerModal } from './CotizacionManagerModal';
import { PrintButton } from './common/PrintButton';
import { appConfirm } from '../lib/dialogs';
import { useConfig } from '../contexts/ConfigContext';

const fmtMXN = (val: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
};

const BADGE: Record<CotizacionEstatus, string> = {
  RFQ_RECIBIDA: 'bg-slate-600/30 text-slate-400 border-slate-600/30',
  FACTIBILIDAD: 'bg-sky-600/20 text-sky-400 border-sky-600/30',
  COSTEO:       'bg-blue-600/20 text-blue-400 border-blue-600/30',
  ELABORACION:  'bg-violet-600/20 text-violet-400 border-violet-600/30',
  REVISION:     'bg-amber-600/20 text-amber-400 border-amber-600/30',
  ENVIADA:      'bg-sky-500/20 text-sky-300 border-sky-500/30',
  GANADA:       'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  PERDIDA:      'bg-rose-600/20 text-rose-400 border-rose-600/30',
  CANCELADA:    'bg-rose-800/20 text-rose-500 border-rose-800/30',
};

interface Props {
  onRefreshParent?: () => void;
}

export const CotizacionViaAdminPanel: React.FC<Props> = ({ onRefreshParent }) => {
  const { isDarkMode } = useConfig();
  const [cotizaciones,  setCotizaciones]  = useState<CotizacionItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterEstatus, setFilterEstatus] = useState<CotizacionEstatus | 'TODOS'>('TODOS');
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editId,        setEditId]        = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cotizacionViaService.getAll();
      setCotizaciones(data);
    } catch (err) {
      console.error('Error cargando cotizaciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaved = () => { fetchData(); onRefreshParent?.(); };

  const handleNew = () => { setEditId(null); setModalOpen(true); };
  const handleEdit = (id: string) => { setEditId(id); setModalOpen(true); };

  const handleClone = async (item: CotizacionItem) => {
    const folio = await cotizacionViaService.generateFolio();
    await cotizacionViaService.create({
      ...item,
      id:         undefined,
      folio,
      estatus:    'RFQ_RECIBIDA',
      created_at: undefined,
      updated_at: undefined,
    } as any);
    fetchData();
    onRefreshParent?.();
  };

  const handleDelete = async (id: string, folio: string) => {
    const ok = await appConfirm(`¿Eliminar cotización "${folio}"? Esta acción no se puede deshacer.`, 'Eliminar Cotización');
    if (!ok) return;
    await cotizacionViaService.delete(id);
    fetchData();
    onRefreshParent?.();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await appConfirm(`¿Eliminar ${selectedIds.size} cotización(es) seleccionada(s)?`, 'Eliminar en Lote');
    if (!ok) return;
    await cotizacionViaService.deleteMany(Array.from(selectedIds));
    setSelectedIds(new Set());
    fetchData();
    onRefreshParent?.();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const filtered = cotizaciones.filter(c => {
    const matchSearch =
      !searchTerm ||
      c.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstatus = filterEstatus === 'TODOS' || c.estatus === filterEstatus;
    return matchSearch && matchEstatus;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500/50 w-56 transition-all"
            />
          </div>
          <select
            value={filterEstatus}
            onChange={e => setFilterEstatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-blue-500/50 transition-all"
          >
            <option value="TODOS">Todos los estatus</option>
            {COT_ESTATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{COT_ESTATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
            >
              <Trash2 size={12} /> Eliminar ({selectedIds.size})
            </button>
          )}
          <button
            onClick={fetchData}
            className={clsx('p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-all', loading && 'animate-spin text-blue-400')}
          >
            <RefreshCw size={15} />
          </button>
          <PrintButton />
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest transition-all"
          >
            <Plus size={13} /> Nueva
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.01]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="accent-blue-500 w-3.5 h-3.5"
                  />
                </th>
                {['Folio','Cliente','Descripción','Responsable','Valor Est.','Prob.','Estatus','Recepción','Límite','Avance','Acciones'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && cotizaciones.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center">
                    <div className="flex justify-center items-center gap-2 text-slate-600 text-xs">
                      <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                      Cargando...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-slate-600 text-xs font-bold uppercase tracking-widest">
                    Sin resultados
                  </td>
                </tr>
              )}
              {filtered.map(c => (
                <AnimatePresence key={c.id}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={clsx(
                      'border-b border-white/[0.04] hover:bg-white/[0.03] transition-all',
                      selectedIds.has(c.id) && 'bg-blue-500/5'
                    )}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="accent-blue-500 w-3.5 h-3.5"
                      />
                    </td>
                    <td className="px-3 py-3 font-black text-slate-200 whitespace-nowrap">{c.folio}</td>
                    <td className="px-3 py-3 text-slate-300 max-w-[120px] truncate">{c.cliente}</td>
                    <td className="px-3 py-3 text-slate-400 max-w-[160px] truncate">{c.descripcion}</td>
                    <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{c.responsable}</td>
                    <td className="px-3 py-3 text-slate-300 font-bold whitespace-nowrap">{fmtMXN(c.valor_estimado)}</td>
                    <td className="px-3 py-3 text-slate-300 font-bold">{c.probabilidad_cierre}%</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={clsx('px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border', BADGE[c.estatus])}>
                        {COT_ESTATUS_LABELS[c.estatus]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{fmtDate(c.fecha_recepcion)}</td>
                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{fmtDate(c.fecha_entrega_requerida)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full', c.avance_porcentaje >= 80 ? 'bg-emerald-500' : c.avance_porcentaje >= 40 ? 'bg-blue-500' : 'bg-amber-500')}
                            style={{ width: `${c.avance_porcentaje}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold">{c.avance_porcentaje}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(c.id)}
                          title="Editar"
                          className="p-1.5 rounded-lg hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-all"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleClone(c)}
                          title="Clonar"
                          className="p-1.5 rounded-lg hover:bg-amber-500/20 text-slate-500 hover:text-amber-400 transition-all"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.folio)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-red-600/20 text-slate-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                </AnimatePresence>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer count */}
      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">
        {filtered.length} de {cotizaciones.length} cotizaciones
        {selectedIds.size > 0 && ` · ${selectedIds.size} seleccionada(s)`}
      </p>

      {/* Modal */}
      <CotizacionManagerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        itemId={editId}
        onSaved={handleSaved}
      />
    </div>
  );
};
