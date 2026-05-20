import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, CheckCircle2, XCircle, TrendingUp,
  DollarSign, Zap, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { comprasViaService } from '../services/comprasViaService';
import { PrintButton } from './common/PrintButton';
import type { ComprasItem, ComprasEstatus } from '../types/compras';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMoney = (n: number, moneda: string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(n);

const ESTATUS_COLORS: Record<ComprasEstatus, string> = {
  REQUISICION:   '#64748b',
  COT_PROVEEDOR: '#8b5cf6',
  APROBACION:    '#f59e0b',
  OC_EMITIDA:    '#3b82f6',
  EN_TRANSITO:   '#0ea5e9',
  RECIBIDA:      '#14b8a6',
  CERRADA:       '#10b981',
  CANCELADA:     '#f43f5e',
};

const ESTATUS_ALL: ComprasEstatus[] = [
  'REQUISICION', 'COT_PROVEEDOR', 'APROBACION', 'OC_EMITIDA',
  'EN_TRANSITO', 'RECIBIDA', 'CERRADA', 'CANCELADA',
];

// ─── Component ────────────────────────────────────────────────────────────────

export const ComprasKPIPanel: React.FC = () => {
  const [items,   setItems]   = useState<ComprasItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    comprasViaService.getAll()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-blue-400" />
      </div>
    );
  }

  // ── Calculations ────────────────────────────────────────────────────────────

  const total        = items.length;
  const completadas  = items.filter(c => c.estatus === 'CERRADA' || c.estatus === 'RECIBIDA');
  const canceladas   = items.filter(c => c.estatus === 'CANCELADA');
  const activas      = items.filter(c => !['CERRADA', 'CANCELADA', 'RECIBIDA'].includes(c.estatus));
  const urgentesAct  = activas.filter(c => c.urgente);

  const tasaExito = total > 0 ? Math.round((completadas.length / total) * 100) : 0;

  const montoTotalMXN = items
    .filter(c => c.moneda === 'MXN')
    .reduce((s, c) => s + (c.monto_total || 0), 0);

  const montoTotalUSD = items
    .filter(c => c.moneda === 'USD')
    .reduce((s, c) => s + (c.monto_total || 0), 0);

  // By estatus
  const estatusData = ESTATUS_ALL.map(e => ({
    label: e,
    count: items.filter(c => c.estatus === e).length,
    color: ESTATUS_COLORS[e],
  })).filter(d => d.count > 0);

  const maxEstatus = Math.max(...estatusData.map(d => d.count), 1);

  // By proveedor (top 5)
  const proveedorCounts: Record<string, number> = {};
  items.forEach(c => {
    if (!c.proveedor) return;
    proveedorCounts[c.proveedor] = (proveedorCounts[c.proveedor] || 0) + 1;
  });
  const proveedorData = Object.entries(proveedorCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxProv = Math.max(...proveedorData.map(d => d.count), 1);

  // Urgente vs Normal
  const urgentes = items.filter(c => c.urgente).length;
  const normales  = items.filter(c => !c.urgente).length;
  const urgentesPct = total > 0 ? Math.round((urgentes / total) * 100) : 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">KPIs Compras</h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Indicadores clave de desempeño</p>
          </div>
        </div>
        <PrintButton />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total OCs',           value: total,                         icon: ShoppingCart, color: 'text-blue-400',    bg: 'bg-blue-600/10',    border: 'border-blue-600/20' },
          { label: 'Completadas',          value: completadas.length,            icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-600/10', border: 'border-emerald-600/20' },
          { label: 'Canceladas',           value: canceladas.length,             icon: XCircle,      color: 'text-rose-400',    bg: 'bg-rose-600/10',    border: 'border-rose-600/20' },
          { label: 'Tasa de Éxito',        value: `${tasaExito}%`,               icon: TrendingUp,   color: 'text-amber-400',   bg: 'bg-amber-600/10',   border: 'border-amber-600/20' },
          { label: 'Monto Total MXN',      value: fmtMoney(montoTotalMXN, 'MXN'), icon: DollarSign,   color: 'text-cyan-400',    bg: 'bg-cyan-600/10',    border: 'border-cyan-600/20' },
          { label: 'Monto Total USD',      value: fmtMoney(montoTotalUSD, 'USD'), icon: DollarSign,   color: 'text-green-400',   bg: 'bg-green-600/10',   border: 'border-green-600/20' },
          { label: 'OCs Urgentes Activas', value: urgentesAct.length,            icon: Zap,          color: 'text-orange-400',  bg: 'bg-orange-600/10',  border: 'border-orange-600/20' },
          { label: 'En Proceso',           value: activas.length,                icon: RefreshCw,    color: 'text-violet-400',  bg: 'bg-violet-600/10',  border: 'border-violet-600/20' },
        ].map(card => (
          <div key={card.label} className={clsx('rounded-2xl border p-4 flex items-center gap-3 backdrop-blur-sm', card.bg, card.border)}>
            <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', card.bg, 'border', card.border)}>
              <card.icon size={16} className={card.color} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold leading-tight">{card.label}</p>
              <p className={clsx('text-lg font-black truncate', card.color)}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* By Estatus */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">OCs por Estatus</h3>
          <div className="space-y-2">
            {estatusData.map(d => (
              <div key={d.label} className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-mono w-28 truncate shrink-0">{d.label}</span>
                <div className="flex-1 h-5 bg-slate-800/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((d.count / maxEstatus) * 100)}%`,
                      backgroundColor: d.color,
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="text-xs font-black text-slate-300 w-6 text-right">{d.count}</span>
              </div>
            ))}
            {estatusData.length === 0 && (
              <p className="text-slate-600 text-xs text-center py-4">Sin datos</p>
            )}
          </div>
        </div>

        {/* By Proveedor */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Top 5 Proveedores</h3>
          <div className="space-y-2">
            {proveedorData.map((d, i) => (
              <div key={d.label} className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-mono w-28 truncate shrink-0">{d.label}</span>
                <div className="flex-1 h-5 bg-slate-800/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((d.count / maxProv) * 100)}%`,
                      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#0ea5e9'][i],
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="text-xs font-black text-slate-300 w-6 text-right">{d.count}</span>
              </div>
            ))}
            {proveedorData.length === 0 && (
              <p className="text-slate-600 text-xs text-center py-4">Sin datos</p>
            )}
          </div>
        </div>

        {/* Urgente vs Normal */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Urgente vs Normal</h3>
          <div className="space-y-3">
            {[
              { label: 'Urgentes', count: urgentes, pct: urgentesPct,       color: '#f97316' },
              { label: 'Normales', count: normales,  pct: 100 - urgentesPct, color: '#3b82f6' },
            ].map(d => (
              <div key={d.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">{d.label}</span>
                  <span className="text-xs font-black text-slate-300">{d.count} <span className="text-slate-600">({d.pct}%)</span></span>
                </div>
                <div className="h-3 bg-slate-800/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${d.pct}%`, backgroundColor: d.color, opacity: 0.75 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Montos por moneda */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Montos por Moneda</h3>
          <div className="space-y-4">
            {[
              { moneda: 'MXN', monto: montoTotalMXN, color: '#06b6d4' },
              { moneda: 'USD', monto: montoTotalUSD, color: '#22c55e' },
            ].map(d => (
              <div key={d.moneda} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">{d.moneda}</span>
                  <span className="text-xs font-black" style={{ color: d.color }}>
                    {fmtMoney(d.monto, d.moneda)}
                  </span>
                </div>
                <div className="h-3 bg-slate-800/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: d.monto > 0 ? '100%' : '0%',
                      backgroundColor: d.color,
                      opacity: 0.65,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
