import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, DollarSign, CheckCircle2, XCircle, BarChart3, Users, Clock } from 'lucide-react';
import clsx from 'clsx';
import { ventasViaService } from '../services/ventasViaService';
import { VENTAS_ESTATUS_LABELS } from '../types/ventas';
import type { VentasItem, VentasEstatus } from '../types/ventas';

const fmtMXN = (val: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

const fmtNum = (n: number, decimals = 0) =>
  Number.isFinite(n) ? n.toFixed(decimals) : '0';

export const VentasKPIPanel: React.FC = () => {
  const [items,   setItems]   = useState<VentasItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ventasViaService.getAll();
      setItems(data);
    } catch (err) {
      console.error('Error KPIs ventas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── KPI calculations ────────────────────────────────────────────────────────

  const total     = items.length;
  const facturados = items.filter(v => v.estatus === 'FACTURADO' || v.estatus === 'ENTREGADO');
  const cancelados = items.filter(v => v.estatus === 'CANCELADO');
  const tasaExito  = total > 0 ? (facturados.length / total) * 100 : 0;
  const valorTotal = items.reduce((s, v) => s + (v.valor_pedido || 0), 0);
  const ticketProm = total > 0 ? valorTotal / total : 0;

  const cicloPromDias = (() => {
    const conFechas = items.filter(v => v.fecha_pedido && (v.fecha_entrega_real || v.updated_at));
    if (conFechas.length === 0) return 0;
    const total = conFechas.reduce((s, v) => {
      const inicio = new Date(v.fecha_pedido!).getTime();
      const fin    = new Date(v.fecha_entrega_real || v.updated_at).getTime();
      return s + Math.max(0, (fin - inicio) / 86400000);
    }, 0);
    return total / conFechas.length;
  })();

  // Count by estatus
  const countByEstatus = VENTAS_ESTATUS_LABELS
    ? Object.entries(VENTAS_ESTATUS_LABELS).map(([est, label]) => ({
        estatus: est as VentasEstatus,
        label,
        count: items.filter(v => v.estatus === est).length,
      }))
    : [];

  const maxEstatus = Math.max(...countByEstatus.map(e => e.count), 1);

  // Top vendedores
  const vendedoresMap: Record<string, { count: number; valor: number }> = {};
  items.forEach(v => {
    const k = v.responsable_ventas || 'Sin asignar';
    if (!vendedoresMap[k]) vendedoresMap[k] = { count: 0, valor: 0 };
    vendedoresMap[k].count++;
    vendedoresMap[k].valor += v.valor_pedido || 0;
  });
  const topVendedores = Object.entries(vendedoresMap)
    .sort((a, b) => b[1].valor - a[1].valor)
    .slice(0, 5);
  const maxVendedor = Math.max(...topVendedores.map(v => v[1].valor), 1);

  // Top clientes
  const clientesMap: Record<string, { count: number; valor: number }> = {};
  items.forEach(v => {
    const k = v.cliente || 'Sin nombre';
    if (!clientesMap[k]) clientesMap[k] = { count: 0, valor: 0 };
    clientesMap[k].count++;
    clientesMap[k].valor += v.valor_pedido || 0;
  });
  const topClientes = Object.entries(clientesMap)
    .sort((a, b) => b[1].valor - a[1].valor)
    .slice(0, 5);
  const maxCliente = Math.max(...topClientes.map(c => c[1].valor), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-3">
        <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Calculando KPIs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pedidos',    value: String(total),              icon: <TrendingUp size={16} />,    color: 'blue' },
          { label: 'Facturados',       value: String(facturados.length),  icon: <CheckCircle2 size={16} />,  color: 'emerald' },
          { label: 'Cancelados',       value: String(cancelados.length),  icon: <XCircle size={16} />,       color: 'rose' },
          { label: 'Tasa de Éxito',    value: `${fmtNum(tasaExito, 1)}%`, icon: <BarChart3 size={16} />,     color: 'amber' },
        ].map(card => (
          <div key={card.label} className={clsx(
            'p-4 rounded-2xl border bg-white/[0.02] flex items-center gap-3',
            card.color === 'blue'    && 'border-blue-500/20',
            card.color === 'emerald' && 'border-emerald-500/20',
            card.color === 'rose'    && 'border-rose-500/20',
            card.color === 'amber'   && 'border-amber-500/20',
          )}>
            <div className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              card.color === 'blue'    && 'bg-blue-500/10 text-blue-400',
              card.color === 'emerald' && 'bg-emerald-500/10 text-emerald-400',
              card.color === 'rose'    && 'bg-rose-500/10 text-rose-400',
              card.color === 'amber'   && 'bg-amber-500/10 text-amber-400',
            )}>
              {card.icon}
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{card.label}</p>
              <p className={clsx(
                'text-xl font-black',
                card.color === 'blue'    && 'text-blue-300',
                card.color === 'emerald' && 'text-emerald-300',
                card.color === 'rose'    && 'text-rose-300',
                card.color === 'amber'   && 'text-amber-300',
              )}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Valor Total MXN',    value: fmtMXN(valorTotal),               icon: <DollarSign size={16} />,  color: 'emerald' },
          { label: 'Ticket Promedio',    value: fmtMXN(ticketProm),               icon: <TrendingUp size={16} />,  color: 'blue' },
          { label: 'Ciclo Prom. (días)', value: `${fmtNum(cicloPromDias, 1)} d`,  icon: <Clock size={16} />,       color: 'amber' },
        ].map(card => (
          <div key={card.label} className={clsx(
            'p-4 rounded-2xl border bg-white/[0.02] flex items-center gap-3',
            card.color === 'emerald' && 'border-emerald-500/20',
            card.color === 'blue'    && 'border-blue-500/20',
            card.color === 'amber'   && 'border-amber-500/20',
          )}>
            <div className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              card.color === 'emerald' && 'bg-emerald-500/10 text-emerald-400',
              card.color === 'blue'    && 'bg-blue-500/10 text-blue-400',
              card.color === 'amber'   && 'bg-amber-500/10 text-amber-400',
            )}>
              {card.icon}
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{card.label}</p>
              <p className={clsx(
                'font-black text-sm',
                card.color === 'emerald' && 'text-emerald-300',
                card.color === 'blue'    && 'text-blue-300',
                card.color === 'amber'   && 'text-amber-300',
              )}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* By estatus */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Por Estatus</p>
          <div className="space-y-2">
            {countByEstatus.filter(e => e.count > 0).map(e => (
              <div key={e.estatus}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-slate-400 font-bold">{e.label}</span>
                  <span className="text-[9px] text-slate-500 font-black">{e.count}</span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-700"
                    style={{ width: `${(e.count / maxEstatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top vendedores */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Users size={11} /> Top Vendedores
          </p>
          {topVendedores.length === 0 ? (
            <p className="text-[10px] text-slate-600 text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {topVendedores.map(([nombre, info]) => (
                <div key={nombre}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] text-slate-400 font-bold truncate max-w-[120px]">{nombre}</span>
                    <span className="text-[9px] text-emerald-400 font-black">{fmtMXN(info.valor)}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${(info.valor / maxVendedor) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top clientes */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <TrendingUp size={11} /> Top Clientes
          </p>
          {topClientes.length === 0 ? (
            <p className="text-[10px] text-slate-600 text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {topClientes.map(([nombre, info]) => (
                <div key={nombre}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] text-slate-400 font-bold truncate max-w-[120px]">{nombre}</span>
                    <span className="text-[9px] text-sky-400 font-black">{fmtMXN(info.valor)}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-700"
                      style={{ width: `${(info.valor / maxCliente) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
