import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Trash2, Edit, RefreshCw, Copy } from 'lucide-react';
import clsx from 'clsx';
import { ventasViaService } from '../services/ventasViaService';
import { VENTAS_ESTATUS_LABELS, VENTAS_ESTATUS_OPTIONS } from '../types/ventas';
import type { VentasItem, VentasEstatus } from '../types/ventas';
import { VentasManagerModal } from './VentasManagerModal';
import { PrintButton } from './common/PrintButton';
import { appConfirm } from '../lib/dialogs';
import { useConfig } from '../contexts/ConfigContext';

const fmtMXN = (val: number, moneda = 'MXN') =>
  `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(val)} ${moneda}`;

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
};

const BADGE: Record<VentasEstatus, string> = {
  PROSPECTO:     'bg-slate-600/30 text-slate-400 border-slate-600/30',
  PROPUESTA:     'bg-sky-600/20 text-sky-400 border-sky-600/30',
  NEGOCIACION:   'bg-violet-600/20 text-violet-400 border-violet-600/30',
  PEDIDO:        'bg-blue-600/20 text-blue-400 border-blue-600/30',
  EN_PRODUCCION: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  EMBARQUE:      'bg-sky-500/20 text-sky-300 border-sky-500/30',
  ENTREGADO:     'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  FACTURADO:     'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  CANCELADO:     'bg-rose-600/20 text-rose-400 border-rose-600/30',
};

interface Props {
  onRefreshParent?: () => void;
}

export const VentasViaAdminPanel: React.FC<Props> = ({ onRefreshParent }) => {
  const { isDarkMode } = useConfig();
  const [items,         setItems]         = useState<VentasItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterEstatus, setFilterEstatus] = useState<VentasEstatus | 'TODOS'>('TODOS');
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editId,        setEditId]        = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ventasViaService.getAll();
      setItems(data);
    } catch (err) {
      console.error('Error cargando pedidos de ventas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaved = () => { fetchData(); onRefreshParent?.(); };
  const handleNew  = () => { setEditId(null); setModalOpen(true); };
  const handleEdit = (id: string) => { setEditId(id); setModalOpen(true); };

  const handleClone = async (item: VentasItem) => {
    const folio = await ventasViaService.generateFolio();
    await ventasViaService.create({
      ...item,
      id:         undefined as any,
      folio,
      estatus:    'PROSPECTO',
      created_at: undefined as any,
      updated_at: undefined as any,
    });
    fetchData();
    onRefreshParent?.();
  };

  const handleDelete = async (id: string, folio: string) => {
    const ok = await appConfirm(`¿Eliminar pedido "${folio}"? Esta acción no se puede deshacer.`, 'Eliminar Pedido');
    if (!ok) return;
    await ventasViaService.delete(id);
    fetchData();
    onRefreshParent?.();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await appConfirm(`¿Eliminar ${selectedIds.size} pedido(s) seleccionado(s)?`, 'Eliminar en Lote');
    if (!ok) return;
    await ventasViaService.deleteMany(Array.from(selectedIds));
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
      setSelectedIds(new Set(filtered.map(v => v.id)));
    }
  };

  const filtered = items.filter(v => {
    const matchSearch =
      !searchTerm ||
      v.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.responsable_ventas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstatus = filterEstatus === 'TODOS' || v.estatus === filterEstatus;
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
              placeholder="Buscar folio, cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 w-56 transition-all"
            />
          </div>
          <select
            value={filterEstatus}
            onChange={e => setFilterEstatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-emerald-500/50 transition-all"
          >
            <option value="TODOS">Todos los estatus</option>
            {VENTAS_ESTATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{VENTAS_ESTATUS_LABELS[s]}</option>
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
            className={clsx('p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-all', loading && 'animate-spin text-emerald-400')}
          >
            <RefreshCw size={15} />
          </button>
          <PrintButton />
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest transition-all"
          >
            <Plus size={13} /> Nuevo Pedido
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
                    className="accent-emerald-500 w-3.5 h-3.5"
                  />
                </th>
                {['Folio','Cliente','Descripción','Responsable','Valor','Estatus','F. Pedido','F. Entrega','Avance','Acciones'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center">
                    <div className="flex justify-center items-center gap-2 text-slate-600 text-xs">
                      <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                      Cargando...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-600 text-xs font-bold uppercase tracking-widest">
                    Sin resultados
                  </td>
                </tr>
              )}
              {filtered.map(v => (
                <AnimatePresence key={v.id}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={clsx(
                      'border-b border-white/[0.04] hover:bg-white/[0.03] transition-all',
                      selectedIds.has(v.id) && 'bg-emerald-500/5'
                    )}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(v.id)}
                        onChange={() => toggleSelect(v.id)}
                        className="accent-emerald-500 w-3.5 h-3.5"
                      />
                    </td>
                    <td className="px-3 py-3 font-black text-slate-200 whitespace-nowrap">{v.folio}</td>
                    <td className="px-3 py-3 text-slate-300 max-w-[120px] truncate">{v.cliente}</td>
                    <td className="px-3 py-3 text-slate-400 max-w-[160px] truncate">{v.descripcion}</td>
                    <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{v.responsable_ventas}</td>
                    <td className="px-3 py-3 text-emerald-400 font-bold whitespace-nowrap">{fmtMXN(v.valor_pedido, v.moneda)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={clsx('px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border', BADGE[v.estatus])}>
                        {VENTAS_ESTATUS_LABELS[v.estatus]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{fmtDate(v.fecha_pedido)}</td>
                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{fmtDate(v.fecha_entrega_prometida)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full',
                              v.avance_porcentaje >= 80 ? 'bg-emerald-500' :
                              v.avance_porcentaje >= 40 ? 'bg-blue-500' : 'bg-amber-500'
                            )}
                            style={{ width: `${v.avance_porcentaje}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold">{v.avance_porcentaje}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(v.id)}
                          title="Editar"
                          className="p-1.5 rounded-lg hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-all"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleClone(v)}
                          title="Clonar"
                          className="p-1.5 rounded-lg hover:bg-amber-500/20 text-slate-500 hover:text-amber-400 transition-all"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id, v.folio)}
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
        {filtered.length} de {items.length} pedidos
        {selectedIds.size > 0 && ` · ${selectedIds.size} seleccionado(s)`}
      </p>

      {/* Modal */}
      <VentasManagerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        itemId={editId}
        onSaved={handleSaved}
      />
    </div>
  );
};
