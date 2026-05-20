import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit, Trash2, Copy,
  RefreshCw, Zap, Filter,
} from 'lucide-react';
import clsx from 'clsx';
import { comprasViaService } from '../services/comprasViaService';
import { appConfirm, toast } from '../lib/dialogs';
import { ComprasManagerModal } from './ComprasManagerModal';
import { PrintButton } from './common/PrintButton';
import type { ComprasItem, ComprasEstatus } from '../types/compras';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
};

const fmtMoney = (n: number, moneda: string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(n);

const ESTATUS_BADGE: Record<ComprasEstatus, string> = {
  REQUISICION:    'bg-slate-600/30 text-slate-300 border-slate-600/40',
  COT_PROVEEDOR:  'bg-violet-500/20 text-violet-300 border-violet-500/30',
  APROBACION:     'bg-amber-500/20 text-amber-300 border-amber-500/30',
  OC_EMITIDA:     'bg-blue-500/20 text-blue-300 border-blue-500/30',
  EN_TRANSITO:    'bg-sky-500/20 text-sky-300 border-sky-500/30',
  RECIBIDA:       'bg-teal-500/20 text-teal-300 border-teal-500/30',
  CERRADA:        'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  CANCELADA:      'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

const ALL_ESTATUS: ComprasEstatus[] = [
  'REQUISICION', 'COT_PROVEEDOR', 'APROBACION', 'OC_EMITIDA',
  'EN_TRANSITO', 'RECIBIDA', 'CERRADA', 'CANCELADA',
];

// ─── Component ────────────────────────────────────────────────────────────────

export const ComprasViaAdminPanel: React.FC = () => {
  const [items,          setItems]          = useState<ComprasItem[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [searchTerm,     setSearchTerm]     = useState('');
  const [filterEstatus,  setFilterEstatus]  = useState<ComprasEstatus | ''>('');
  const [filterUrgente,  setFilterUrgente]  = useState(false);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editingId,      setEditingId]      = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await comprasViaService.getAll();
      setItems(data);
    } catch (err: any) {
      toast(`Error al cargar OCs: ${err.message || 'Error desconocido'}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered ──────────────────────────────────────────────────────────────

  const filtered = items.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      c.folio?.toLowerCase().includes(q) ||
      c.proveedor?.toLowerCase().includes(q) ||
      c.concepto?.toLowerCase().includes(q) ||
      c.solicitante?.toLowerCase().includes(q) ||
      c.numero_oc?.toLowerCase().includes(q);
    const matchEstatus = !filterEstatus || c.estatus === filterEstatus;
    const matchUrgente = !filterUrgente || c.urgente;
    return matchSearch && matchEstatus && matchUrgente;
  });

  // ── Selection ─────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleEdit = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const handleClone = async (item: ComprasItem) => {
    const ok = await appConfirm(`¿Clonar OC "${item.folio}"?`, 'Clonar OC');
    if (!ok) return;
    try {
      const { id, created_at, updated_at, etapas, ...rest } = item as any;
      await comprasViaService.create({
        ...rest,
        folio: `${rest.folio}-COPIA`,
        estatus: 'REQUISICION',
      });
      toast('OC clonada correctamente.', 'success');
      fetchData();
    } catch (err: any) {
      toast(`Error al clonar: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id: string, folio: string) => {
    const ok = await appConfirm(`¿Eliminar OC "${folio}"? Esta acción no se puede deshacer.`, 'Eliminar OC');
    if (!ok) return;
    try {
      await comprasViaService.delete(id);
      toast('OC eliminada.', 'success');
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      fetchData();
    } catch (err: any) {
      toast(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    const ok = await appConfirm(`¿Eliminar ${count} OC(s) seleccionada(s)? Esta acción no se puede deshacer.`, 'Eliminar selección');
    if (!ok) return;
    try {
      await Promise.all([...selectedIds].map(id => comprasViaService.delete(id)));
      toast(`${count} OC(s) eliminada(s).`, 'success');
      setSelectedIds(new Set());
      fetchData();
    } catch (err: any) {
      toast(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white tracking-tight">Admin — Órdenes de Compra</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600/20 border border-red-600/40 text-red-400 text-xs font-bold hover:bg-red-600/30 transition-all"
            >
              <Trash2 size={13} /> Eliminar ({selectedIds.size})
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-blue-400 hover:border-blue-600/30 transition-all"
          >
            <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
          </button>
          <PrintButton />
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <Plus size={14} /> Nueva OC
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar folio, proveedor, concepto..."
            className="pl-8 pr-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-600/50 w-64"
          />
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <select
            value={filterEstatus}
            onChange={e => setFilterEstatus(e.target.value as ComprasEstatus | '')}
            className="pl-8 pr-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-200 text-sm focus:outline-none focus:border-blue-600/50"
          >
            <option value="">Todos los estatus</option>
            {ALL_ESTATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button
          onClick={() => setFilterUrgente(v => !v)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all',
            filterUrgente
              ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-orange-500/30 hover:text-orange-400'
          )}
        >
          <Zap size={12} /> Urgentes
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-700/50 overflow-hidden bg-slate-900/40 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/30">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                {['Folio', 'Proveedor', 'Concepto', 'Solicitante', 'Monto', 'Estatus', 'Entrega Req.', 'Acciones'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500 text-sm">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    Cargando...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500 text-sm">
                    No hay órdenes de compra con los filtros actuales.
                  </td>
                </tr>
              )}
              {!loading && filtered.map(c => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={clsx(
                    'border-l-2 transition-colors hover:bg-slate-800/30',
                    selectedIds.has(c.id) ? 'border-l-blue-500 bg-blue-600/5' : 'border-l-transparent'
                  )}
                >
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-white text-xs whitespace-nowrap">{c.folio || '—'}</span>
                      {c.urgente && <Zap size={10} className="text-orange-400 shrink-0" />}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 text-xs max-w-[130px] truncate">{c.proveedor || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-300 text-xs max-w-[160px] truncate">{c.concepto || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">{c.solicitante || '—'}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-200 whitespace-nowrap">
                    {c.monto_total ? fmtMoney(c.monto_total, c.moneda || 'MXN') : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={clsx('px-2 py-0.5 rounded-lg text-[10px] font-bold border whitespace-nowrap', ESTATUS_BADGE[c.estatus])}>
                      {c.estatus}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">{fmtDate(c.fecha_entrega_requerida)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(c.id)}
                        title="Editar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-600/10 transition-colors"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => handleClone(c)}
                        title="Clonar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-600/10 transition-colors"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.folio)}
                        title="Eliminar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <ComprasManagerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        itemId={editingId}
        onSaved={fetchData}
      />
    </div>
  );
};
