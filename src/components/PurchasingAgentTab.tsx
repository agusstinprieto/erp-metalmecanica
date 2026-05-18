import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Zap, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Clock, Package, DollarSign, ChevronDown, ChevronRight, TrendingDown
} from 'lucide-react';
import { runPurchasingAgent, approvePurchaseOrder, rejectPurchaseOrder } from '../services/purchasingAgentService';
import type { StockPrediction, PurchaseOrder, AgentRun } from '../types/purchasing';

const urgencyCfg = {
  critical: { label: 'CRÍTICO', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', dot: 'bg-rose-500 animate-pulse' },
  warning:  { label: 'ALERTA',  color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  ok:       { label: 'OK',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
};

function StockBar({ current, min, max }: { current: number; min: number; max: number }) {
  const safeMax = max || min * 3 || 1;
  const pct = Math.min(100, (current / safeMax) * 100);
  const minPct = (min / safeMax) * 100;
  const color = current <= min ? 'bg-rose-500' : current <= min * 1.5 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="relative h-1.5 bg-white/5 rounded-full overflow-visible mt-2">
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8 }} className={`h-full rounded-full ${color}`} />
      <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 bg-white/20 rounded-full"
        style={{ left: `${minPct}%` }} />
    </div>
  );
}

function PredCard({ pred, expanded, onToggle }: { pred: StockPrediction; expanded: boolean; onToggle: () => void }) {
  const cfg = urgencyCfg[pred.urgency];
  return (
    <div onClick={onToggle}
      className={`cursor-pointer p-4 rounded-xl border ${cfg.border} ${cfg.bg} transition-all hover:opacity-90`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          <p className="text-xs font-black text-white truncate">{pred.material_name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{cfg.label}</span>
          {expanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-black font-mono text-white">{pred.current_stock.toLocaleString()}</p>
          <p className="text-[8px] text-slate-500 uppercase">Stock</p>
        </div>
        <div>
          <p className={`text-sm font-black font-mono ${pred.days_until_stockout <= 0 ? 'text-rose-400' : pred.days_until_stockout <= 7 ? 'text-amber-400' : 'text-slate-300'}`}>
            {pred.days_until_stockout <= 0 ? '¡YA!' : `${pred.days_until_stockout}d`}
          </p>
          <p className="text-[8px] text-slate-500 uppercase">Al Mínimo</p>
        </div>
        <div>
          <p className="text-sm font-black font-mono text-cyan-400">{pred.recommended_order_qty.toLocaleString()}</p>
          <p className="text-[8px] text-slate-500 uppercase">Pedir</p>
        </div>
      </div>

      <StockBar current={pred.current_stock} min={pred.min_stock} max={pred.current_stock * 2 || pred.min_stock * 3} />

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <div className="flex justify-between"><span className="text-slate-500">Consumo/día</span><span className="text-white font-bold">{pred.avg_daily_consumption}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Lead time</span><span className="text-white font-bold">{pred.lead_time_days}d</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Proveedor</span><span className="text-white font-bold truncate max-w-[100px]">{pred.supplier_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Costo OC</span><span className="text-emerald-400 font-black">${pred.total_order_cost.toLocaleString('es', { maximumFractionDigits: 0 })}</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OCCard({ order, onApprove, onReject }: { order: PurchaseOrder; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = order.status === 'pending_approval';

  return (
    <div className={`rounded-xl border transition-all ${isPending ? 'border-amber-500/30 bg-amber-500/5' : order.status === 'approved' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Bot size={11} className="text-purple-400" />
              <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">IA</span>
              <span className="text-[8px] text-slate-600">•</span>
              <span className="text-[8px] text-slate-500">{order.folio}</span>
            </div>
            <p className="text-xs font-black text-white uppercase">{order.supplier_name}</p>
            <p className="text-[9px] text-slate-500 mt-0.5">{order.items.length} material(es) • {order.requested_delivery_date}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-black font-mono text-white">${(order.total_amount / 1000).toFixed(1)}k</p>
            <p className="text-[8px] text-slate-500">MXN</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-2 space-y-1.5">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-[9px] py-1 border-b border-white/5 last:border-0">
                  <div><p className="font-bold text-white">{item.material_name}</p><p className="text-slate-500">{item.quantity} {item.unit}</p></div>
                  <p className="font-black text-slate-300">${item.total_cost.toLocaleString('es', { maximumFractionDigits: 0 })}</p>
                </div>
              ))}
            </div>
            {order.ai_justification && (
              <div className="mx-4 mb-3 p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-[9px] text-purple-300 leading-relaxed"><span className="font-black text-purple-400">IA: </span>{order.ai_justification}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isPending && (
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={e => { e.stopPropagation(); onApprove(order.id); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/30 transition-all">
            <CheckCircle2 size={12} /> Aprobar
          </button>
          <button onClick={e => { e.stopPropagation(); onReject(order.id); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider hover:bg-rose-500/20 transition-all">
            <XCircle size={12} /> Rechazar
          </button>
        </div>
      )}
      {!isPending && (
        <div className="px-4 pb-3">
          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase ${order.status === 'approved' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {order.status === 'approved' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
            {order.status === 'approved' ? 'Aprobada' : 'Rechazada'}
          </span>
        </div>
      )}
    </div>
  );
}

export const PurchasingAgentTab: React.FC = () => {
  const [predictions, setPredictions] = useState<StockPrediction[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [lastRun, setLastRun] = useState<AgentRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'stock' | 'orders'>('stock');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const result = await runPurchasingAgent('mcvill');
      setPredictions(result.predictions);
      setOrders(result.orders);
      setLastRun(result.run);
      if (result.orders.length > 0) setView('orders');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleApprove = useCallback(async (id: string) => {
    await approvePurchaseOrder(id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'approved' as const } : o));
  }, []);

  const handleReject = useCallback(async (id: string) => {
    await rejectPurchaseOrder(id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' as const } : o));
  }, []);

  const criticals = predictions.filter(p => p.urgency === 'critical');
  const pending = orders.filter(o => o.status === 'pending_approval');

  return (
    <div className="p-6 h-full space-y-6">
      {/* Header + Run button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
            <Bot size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Agente de Compras Predictivo</h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">
              {lastRun
                ? `Último análisis: ${new Date(lastRun.ran_at).toLocaleTimeString('es')} • ${lastRun.items_analyzed} materiales`
                : 'Analiza consumo y genera OCs automáticamente'}
            </p>
          </div>
        </div>
        <button onClick={run} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-all disabled:opacity-50">
          {loading ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
          {loading ? 'Analizando...' : 'Ejecutar Agente'}
        </button>
      </div>

      {/* KPIs */}
      {lastRun && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Materiales', value: lastRun.items_analyzed, icon: Package, c: 'text-cyan-400' },
            { label: 'Críticos', value: criticals.length, icon: AlertTriangle, c: 'text-rose-400' },
            { label: 'OCs Generadas', value: lastRun.orders_generated, icon: TrendingDown, c: 'text-purple-400' },
            { label: 'Total OCs', value: `$${(lastRun.total_value / 1000).toFixed(1)}k`, icon: DollarSign, c: 'text-emerald-400' },
          ].map((k, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/5 flex items-center gap-3">
              <k.icon size={16} className={k.c} />
              <div>
                <p className="text-base font-black font-mono text-white">{k.value}</p>
                <p className="text-[8px] text-slate-500 uppercase tracking-widest">{k.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Empty state */}
      {!lastRun && !loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-purple-500/30 flex items-center justify-center">
            <Bot size={28} className="text-purple-400/40" />
          </div>
          <p className="text-xs text-slate-500 text-center max-w-xs">
            Presiona <span className="text-purple-400 font-bold">"Ejecutar Agente"</span> para analizar materiales, detectar escasez y generar órdenes de compra automáticamente.
          </p>
        </div>
      )}

      {/* Sub-tabs & Content */}
      {lastRun && (
        <>
          <div className="flex gap-1">
            {([
              { id: 'stock', label: 'Stock & Predicción' },
              { id: 'orders', label: `OCs (${orders.length})`, badge: pending.length },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setView(t.id)}
                className={`relative px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  view === t.id ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300' : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}>
                {t.label}
                {t.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full text-[7px] font-black flex items-center justify-center text-white">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {view === 'stock' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[...predictions]
                    .sort((a, b) => ({ critical: 0, warning: 1, ok: 2 }[a.urgency] - { critical: 0, warning: 1, ok: 2 }[b.urgency]))
                    .map(pred => (
                      <PredCard key={pred.material_id} pred={pred}
                        expanded={expandedId === pred.material_id}
                        onToggle={() => setExpandedId(e => e === pred.material_id ? null : pred.material_id)} />
                    ))}
                </div>
              )}

              {view === 'orders' && (
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No se generaron órdenes en este ciclo.</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {orders.map(o => <OCCard key={o.id} order={o} onApprove={handleApprove} onReject={handleReject} />)}
                    </div>
                  )}
                  {pending.length > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <Clock size={13} className="text-amber-400" />
                      <p className="text-[10px] text-amber-300">
                        <span className="font-black">{pending.length} orden(es)</span> pendientes de aprobación —
                        Total: <span className="font-black">${pending.reduce((s, o) => s + o.total_amount, 0).toLocaleString('es', { maximumFractionDigits: 0 })} MXN</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default PurchasingAgentTab;
