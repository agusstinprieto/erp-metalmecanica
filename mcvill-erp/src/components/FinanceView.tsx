import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  TrendingUp, ArrowUpCircle, ArrowDownCircle, Wallet, Search,
  Plus, X, Loader2, Settings, Trash2, FileBarChart, RefreshCw,
  AlertTriangle, CreditCard, DollarSign,
  Calendar, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { financeService, type CuentaCobrar, type CuentaPagar } from '../services/financeService';
import { TransactionModal } from './TransactionModal';
import { appConfirm } from '../lib/dialogs';
import { reportUtils } from '../utils/reportUtils';
import { Toast } from './common/Toast';
import { FormulaPanel, FORMULAS } from './common/FormulaPanel';

type Tab = 'dashboard' | 'cxc' | 'cxp' | 'flujo';

const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtK = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : fmt(n);

const diasRestantes = (fecha: string) => {
  const diff = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  return diff;
};

const emptyCxCForm = {
  numero_factura: '', cliente: '', concepto: '', monto: 0, monto_cobrado: 0,
  moneda: 'MXN', tipo_cambio: 1,
  fecha_emision: new Date().toISOString().slice(0, 10),
  fecha_vencimiento: '', status: 'pendiente', metodo_cobro: '', referencia_viajero: '', notas: ''
};

const emptyCxPForm = {
  numero_factura: '', proveedor: '', concepto: '', monto: 0, monto_pagado: 0,
  moneda: 'MXN', tipo_cambio: 1,
  fecha_emision: new Date().toISOString().slice(0, 10),
  fecha_vencimiento: '', status: 'pendiente', metodo_pago: '',
  prioridad: 'normal', referencia_oc: '', notas: ''
};

export const FinanceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Dashboard
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_balance: 0, monthly_income: 0, monthly_expense: 0, net_profit: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // CxC
  const [cxcList, setCxcList] = useState<CuentaCobrar[]>([]);
  const [showCxCModal, setShowCxCModal] = useState(false);
  const [editingCxC, setEditingCxC] = useState<CuentaCobrar | null>(null);
  const [cxcForm, setCxcForm] = useState({ ...emptyCxCForm });

  // CxP
  const [cxpList, setCxpList] = useState<CuentaPagar[]>([]);
  const [showCxPModal, setShowCxPModal] = useState(false);
  const [editingCxP, setEditingCxP] = useState<CuentaPagar | null>(null);
  const [cxpForm, setCxpForm] = useState({ ...emptyCxPForm });

  // Flujo de caja
  const [flujo, setFlujo] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState('');

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [txs, s, cxc, cxp] = await Promise.all([
        financeService.getTransactions(),
        financeService.getStats(),
        financeService.getCxC(),
        financeService.getCxP(),
      ]);
      setTransactions(txs); setStats(s);
      setCxcList(cxc); setCxpList(cxp);
      setFlujo(await financeService.getFlujoCaja(cxc, cxp));
    } catch (e) { console.error(e); notify('Error al cargar los datos financieros', 'error'); }
    finally { setLoading(false); }
  };

  // ── CxC handlers ─────────────────────────────────────────────────────────────
  const openCxCModal = (item?: CuentaCobrar) => {
    if (item) { setEditingCxC(item); setCxcForm({ ...emptyCxCForm, ...item }); }
    else { setEditingCxC(null); setCxcForm({ ...emptyCxCForm }); }
    setShowCxCModal(true);
  };
  const handleSaveCxC = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingCxC) { await financeService.updateCxC(editingCxC.id, cxcForm as any); notify('CxC actualizada'); }
      else { await financeService.createCxC(cxcForm as any); notify('CxC registrada'); }
      setShowCxCModal(false); loadAll();
    } catch (e) { console.error(e); notify('Error al guardar', 'error'); }
    finally { setIsSubmitting(false); }
  };
  const handleDeleteCxC = async (id: string) => {
    if (!await appConfirm('¿ELIMINAR ESTA CUENTA POR COBRAR?')) return;
    await financeService.deleteCxC(id); loadAll(); notify('CxC eliminada', 'error');
  };

  // ── CxP handlers ─────────────────────────────────────────────────────────────
  const openCxPModal = (item?: CuentaPagar) => {
    if (item) { setEditingCxP(item); setCxpForm({ ...emptyCxPForm, ...item }); }
    else { setEditingCxP(null); setCxpForm({ ...emptyCxPForm }); }
    setShowCxPModal(true);
  };
  const handleSaveCxP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingCxP) { await financeService.updateCxP(editingCxP.id, cxpForm as any); notify('CxP actualizada'); }
      else { await financeService.createCxP(cxpForm as any); notify('CxP registrada'); }
      setShowCxPModal(false); loadAll();
    } catch (e) { console.error(e); notify('Error al guardar', 'error'); }
    finally { setIsSubmitting(false); }
  };
  const handleDeleteCxP = async (id: string) => {
    if (!await appConfirm('¿ELIMINAR ESTA CUENTA POR PAGAR?')) return;
    await financeService.deleteCxP(id); loadAll(); notify('CxP eliminada', 'error');
  };

  // ── Computed ──────────────────────────────────────────────────────────────────
  const totalCxC         = cxcList.filter(c => ['pendiente','parcial'].includes(c.status)).reduce((s, c) => s + (c.monto - c.monto_cobrado), 0);
  const vencidoCxC       = cxcList.filter(c => diasRestantes(c.fecha_vencimiento) < 0 && c.status !== 'cobrada').reduce((s, c) => s + (c.monto - c.monto_cobrado), 0);
  const totalCxP         = cxpList.filter(p => ['pendiente','parcial'].includes(p.status)).reduce((s, p) => s + (p.monto - p.monto_pagado), 0);
  const vencidoCxP       = cxpList.filter(p => diasRestantes(p.fecha_vencimiento) < 0 && p.status !== 'pagada').reduce((s, p) => s + (p.monto - p.monto_pagado), 0);
  const proximosCobros   = cxcList.filter(c => { const d = diasRestantes(c.fecha_vencimiento); return d >= 0 && d <= 30 && ['pendiente','parcial'].includes(c.status); }).reduce((s, c) => s + (c.monto - c.monto_cobrado), 0);
  const proximosPagos    = cxpList.filter(p => { const d = diasRestantes(p.fecha_vencimiento); return d >= 0 && d <= 30 && ['pendiente','parcial'].includes(p.status); }).reduce((s, p) => s + (p.monto - p.monto_pagado), 0);
  const posicionNeta30d  = proximosCobros - proximosPagos;

  const getStatusCxC = (s: string) => ({
    pendiente:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
    parcial:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
    cobrada:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    vencida:    'text-rose-400 bg-rose-500/10 border-rose-500/20',
    cancelada:  'text-slate-500 bg-slate-500/10 border-slate-500/20',
  }[s] || 'text-slate-400 bg-slate-500/10 border-slate-500/20');

  const getPrioridad = (p: string) => ({
    critica: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
    alta:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
    normal:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
    baja:    'text-slate-500 bg-slate-500/10 border-slate-500/20',
  }[p] || 'text-slate-400 bg-slate-500/10 border-slate-500/20');

  const getDiasColor = (dias: number) => {
    if (dias < 0) return 'text-rose-400';
    if (dias <= 7) return 'text-rose-300';
    if (dias <= 15) return 'text-amber-400';
    return 'text-slate-400';
  };

  const q = searchTerm.toLowerCase();
  const filteredCxC = cxcList.filter(c => c.cliente.toLowerCase().includes(q) || c.numero_factura.toLowerCase().includes(q));
  const filteredCxP = cxpList.filter(p => p.proveedor.toLowerCase().includes(q) || p.numero_factura.toLowerCase().includes(q));

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'cxc',       label: 'Por Cobrar', icon: ArrowUpCircle },
    { id: 'cxp',       label: 'Por Pagar', icon: ArrowDownCircle },
    { id: 'flujo',     label: 'Flujo de Caja', icon: TrendingUp },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {notification && <Toast message={notification.message} type={notification.type} isVisible={!!notification} onClose={() => setNotification(null)} />}

      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <TrendingUp className="text-blue-500" size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tighter uppercase leading-none flex items-center gap-2 truncate">
              Finanzas <span className="text-blue-500">& Tesorería</span>
              <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded tracking-[0.2em] font-black hidden sm:inline">FISCAL-PRO</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Libro Mayor · CxC · CxP · Flujo Predictivo</p>
          </div>
        </div>

        <div className="flex gap-2">
          {activeTab === 'dashboard' && (
            <>
              <button onClick={loadAll} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all">
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} role={loading ? 'status' : undefined} aria-label={loading ? 'Cargando' : undefined} />
              </button>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95">
                <Plus size={12} strokeWidth={3} /> NUEVO ASIENTO
              </button>
            </>
          )}
          {activeTab === 'cxc' && (
            <button onClick={() => openCxCModal()} className="flex items-center gap-1.5 px-4 py-1.5 bg-mcvill-accent hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95">
              <Plus size={12} strokeWidth={3} /> NUEVA CxC
            </button>
          )}
          {activeTab === 'cxp' && (
            <button onClick={() => openCxPModal()} className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95">
              <Plus size={12} strokeWidth={3} /> NUEVA CxP
            </button>
          )}
          {activeTab === 'flujo' && (
            <button onClick={() => reportUtils.exportToPDF('Flujo de Caja Proyectado', flujo.map(f => ({ SEMANA: f.label, COBROS: fmt(f.cobros), PAGOS: fmt(f.pagos), NETO: fmt(f.neto) })), 'flujo_caja', 'FINANZAS')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
              <FileBarChart size={12} /> EXPORTAR
            </button>
          )}
        </div>
      </div>

      {/* Formula Panel — Finanzas */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 shrink-0">
        <FormulaPanel formulas={FORMULAS.finanzas} variant="emerald" label="Fórmulas Finanzas" />
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/20 shrink-0">
        {[
          { label: 'Por Cobrar',     value: fmtK(totalCxC),        icon: ArrowUpCircle,   color: 'text-blue-400',    bg: 'bg-blue-500/10' },
          { label: 'Vencido CxC',    value: fmtK(vencidoCxC),      icon: AlertTriangle,   color: 'text-rose-400',    bg: 'bg-rose-500/10' },
          { label: 'Por Pagar',      value: fmtK(totalCxP),        icon: ArrowDownCircle, color: 'text-amber-400',   bg: 'bg-amber-500/10' },
          { label: 'Posición 30d',   value: fmtK(posicionNeta30d), icon: TrendingUp,      color: posicionNeta30d >= 0 ? 'text-emerald-400' : 'text-rose-400', bg: posicionNeta30d >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10' },
        ].map((s, i) => (
          <div key={i} className="px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 hover:bg-white/[0.04] transition-all">
            <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 shrink-0', s.bg, s.color)}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">{s.label}</p>
              <p className={clsx('text-xl font-black tracking-tighter leading-none', s.color)}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 flex items-center gap-4 shrink-0">
        <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-[9px] font-black uppercase tracking-widest',
                activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:text-white')}>
              <tab.icon size={12} />{tab.label}
            </button>
          ))}
        </div>
        {(activeTab === 'cxc' || activeTab === 'cxp') && (
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={12} />
            <input type="text" placeholder="BUSCAR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 outline-none text-[10px] font-bold text-white placeholder:text-slate-700 focus:border-emerald-500/50 transition-all" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {/* ── Dashboard ── */}
        {activeTab === 'dashboard' && (
          <div className="p-4 space-y-4">
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Capital Operativo', value: fmtK(stats.total_balance), type: 'balance' },
                { label: 'Ingresos Brutos',   value: fmtK(stats.monthly_income), type: 'income' },
                { label: 'Gastos Totales',    value: fmtK(stats.monthly_expense), type: 'expense' },
                { label: 'Utilidad Neta',     value: fmtK(stats.net_profit), type: 'income' },
              ].map((k, i) => (
                <div key={i} className="bg-slate-900/40 border border-slate-800/40 p-3 rounded-xl flex items-center gap-3">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center border',
                    k.type === 'income' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                    k.type === 'expense' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                    'bg-slate-950/40 border-slate-800 text-slate-400')}>
                    {k.type === 'income' ? <ArrowUpCircle size={14} /> : k.type === 'expense' ? <ArrowDownCircle size={14} /> : <Wallet size={14} />}
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{k.label}</p>
                    <p className={clsx('text-lg font-black leading-none', k.type === 'income' ? 'text-blue-400' : 'text-white')}>{k.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Ledger */}
            <div className="bg-slate-950/40 border border-white/5 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-white/5 bg-slate-900/60 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Libro Mayor</h3>
                <div className="relative w-48">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600" size={10} />
                  <input type="text" placeholder="FILTRO..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-lg py-1 pl-7 pr-2 text-[9px] font-bold text-white outline-none focus:border-emerald-500/40" />
                </div>
              </div>
              <div className="overflow-x-auto max-h-[320px]">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-900 z-10">
                    <tr className="border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="px-4 py-2">ID</th><th className="px-4 py-2">Entidad</th>
                      <th className="px-4 py-2">Categoría</th><th className="px-4 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transactions.filter(tx => tx.entity?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-10 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">Sin registros</td></tr>
                    ) : transactions.filter(tx => tx.entity?.toLowerCase().includes(searchTerm.toLowerCase())).map(tx => (
                      <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-1.5 text-[9px] font-mono text-slate-500 uppercase">{tx.id?.slice(0, 8)}</td>
                        <td className="px-4 py-1.5 text-[10px] font-black text-white">{tx.entity}</td>
                        <td className="px-4 py-1.5 text-[9px] text-slate-500">{tx.category}</td>
                        <td className={clsx('px-4 py-1.5 text-right text-[10px] font-black', tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400')}>
                          {tx.type === 'income' ? '+' : '-'}{fmt(Math.abs(tx.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── CxC ── */}
        {activeTab === 'cxc' && (
          <>
          {/* Aging Panel CxC */}
          <div className="p-4 pb-0">
            <div className="grid grid-cols-5 gap-2 mb-4">
              {(() => {
                const buckets = financeService.getAgingBuckets(cxcList, 'cxc');
                const colors = ['text-emerald-400 bg-emerald-500/10 border-emerald-500/20','text-amber-400 bg-amber-500/10 border-amber-500/20','text-orange-400 bg-orange-500/10 border-orange-500/20','text-rose-400 bg-rose-500/10 border-rose-500/20','text-rose-600 bg-rose-600/10 border-rose-600/20'];
                return buckets.map((b, i) => (
                  <div key={b.days} className={clsx('rounded-xl border p-3 text-center', colors[i])}>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-70">{b.label}</p>
                    <p className="text-base font-black mt-1">{fmtK(b.total)}</p>
                    <p className="text-[8px] opacity-60">{b.count} fact.</p>
                  </div>
                ));
              })()}
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-white/10 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-4 py-2">Factura / Cliente</th>
                <th className="px-4 py-2">Concepto</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2 text-right">Saldo</th>
                <th className="px-4 py-2 text-center">Vencimiento</th>
                <th className="px-4 py-2 text-center">Días</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCxC.length === 0 ? (
                <tr><td colSpan={8} className="px-8 py-24 text-center">
                  <ArrowUpCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 font-black text-[11px] uppercase tracking-widest">Sin cuentas por cobrar</p>
                  <button onClick={() => openCxCModal()} className="mt-4 px-4 py-2 bg-mcvill-accent/10 border border-mcvill-accent/30 text-mcvill-accent rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-mcvill-accent hover:text-white transition-all">
                    + Registrar primera CxC
                  </button>
                </td></tr>
              ) : filteredCxC.map(cxc => {
                const dias = diasRestantes(cxc.fecha_vencimiento);
                const saldo = cxc.monto - cxc.monto_cobrado;
                return (
                  <tr key={cxc.id} className="hover:bg-blue-500/5 transition-all group">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400"><CreditCard size={13} /></div>
                        <div>
                          <p className="text-[11px] font-black text-white uppercase">{cxc.numero_factura}</p>
                          <p className="text-[8px] text-slate-600 uppercase">{cxc.cliente}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 max-w-xs"><p className="text-[10px] text-slate-400 truncate">{cxc.concepto || '—'}</p></td>
                    <td className="px-4 py-2 text-right"><p className="text-[10px] font-black text-white">{fmt(cxc.monto)}</p><p className="text-[8px] text-slate-600">{cxc.moneda}</p></td>
                    <td className="px-4 py-2 text-right"><p className={clsx('text-[11px] font-black', saldo > 0 ? 'text-blue-400' : 'text-emerald-400')}>{fmt(saldo)}</p></td>
                    <td className="px-4 py-2 text-center"><p className="text-[10px] text-slate-400">{new Date(cxc.fecha_vencimiento).toLocaleDateString()}</p></td>
                    <td className="px-4 py-2 text-center">
                      <p className={clsx('text-[10px] font-black', getDiasColor(dias))}>
                        {dias < 0 ? `${Math.abs(dias)}d VENC.` : `${dias}d`}
                      </p>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest uppercase', getStatusCxC(cxc.status))}>
                        {cxc.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => openCxCModal(cxc)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-blue-400 transition-all"><Settings size={12} /></button>
                        <button onClick={() => handleDeleteCxC(cxc.id)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          </>
        )}

        {/* ── CxP ── */}
        {activeTab === 'cxp' && (
          <>
          {/* Aging Panel CxP */}
          <div className="p-4 pb-0">
            <div className="grid grid-cols-5 gap-2 mb-4">
              {(() => {
                const buckets = financeService.getAgingBuckets(cxpList, 'cxp');
                const colors = ['text-emerald-400 bg-emerald-500/10 border-emerald-500/20','text-amber-400 bg-amber-500/10 border-amber-500/20','text-orange-400 bg-orange-500/10 border-orange-500/20','text-rose-400 bg-rose-500/10 border-rose-500/20','text-rose-600 bg-rose-600/10 border-rose-600/20'];
                return buckets.map((b, i) => (
                  <div key={b.days} className={clsx('rounded-xl border p-3 text-center', colors[i])}>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-70">{b.label}</p>
                    <p className="text-base font-black mt-1">{fmtK(b.total)}</p>
                    <p className="text-[8px] opacity-60">{b.count} fact.</p>
                  </div>
                ));
              })()}
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-white/10 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-4 py-2">Factura / Proveedor</th>
                <th className="px-4 py-2">Concepto</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2 text-right">Saldo</th>
                <th className="px-4 py-2 text-center">Vencimiento</th>
                <th className="px-4 py-2 text-center">Días</th>
                <th className="px-4 py-2 text-center">Prioridad</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCxP.length === 0 ? (
                <tr><td colSpan={9} className="px-8 py-24 text-center">
                  <ArrowDownCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 font-black text-[11px] uppercase tracking-widest">Sin cuentas por pagar</p>
                  <button onClick={() => openCxPModal()} className="mt-4 px-4 py-2 bg-rose-600/20 border border-rose-500/30 text-rose-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">
                    + Registrar primera CxP
                  </button>
                </td></tr>
              ) : filteredCxP.map(cxp => {
                const dias = diasRestantes(cxp.fecha_vencimiento);
                const saldo = cxp.monto - cxp.monto_pagado;
                return (
                  <tr key={cxp.id} className="hover:bg-rose-500/5 transition-all group">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400"><DollarSign size={13} /></div>
                        <div>
                          <p className="text-[11px] font-black text-white uppercase">{cxp.numero_factura}</p>
                          <p className="text-[8px] text-slate-600 uppercase">{cxp.proveedor}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 max-w-xs"><p className="text-[10px] text-slate-400 truncate">{cxp.concepto || '—'}</p></td>
                    <td className="px-4 py-2 text-right"><p className="text-[10px] font-black text-white">{fmt(cxp.monto)}</p><p className="text-[8px] text-slate-600">{cxp.moneda}</p></td>
                    <td className="px-4 py-2 text-right"><p className={clsx('text-[11px] font-black', saldo > 0 ? 'text-rose-400' : 'text-emerald-400')}>{fmt(saldo)}</p></td>
                    <td className="px-4 py-2 text-center"><p className="text-[10px] text-slate-400">{new Date(cxp.fecha_vencimiento).toLocaleDateString()}</p></td>
                    <td className="px-4 py-2 text-center">
                      <p className={clsx('text-[10px] font-black', getDiasColor(dias))}>
                        {dias < 0 ? `${Math.abs(dias)}d VENC.` : `${dias}d`}
                      </p>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest uppercase', getPrioridad(cxp.prioridad))}>
                        {cxp.prioridad}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest uppercase', getStatusCxC(cxp.status))}>
                        {cxp.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => openCxPModal(cxp)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-rose-400 transition-all"><Settings size={12} /></button>
                        <button onClick={() => handleDeleteCxP(cxp.id)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          </>
        )}

        {/* ── Flujo de Caja ── */}
        {activeTab === 'flujo' && (
          <div className="p-6 space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Cobros próx. 30d', value: fmtK(proximosCobros), color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                { label: 'Pagos próx. 30d',  value: fmtK(proximosPagos),  color: 'text-rose-400',  bg: 'bg-rose-500/10',  border: 'border-rose-500/20' },
                { label: 'Posición Neta 30d', value: fmtK(posicionNeta30d),
                  color: posicionNeta30d >= 0 ? 'text-emerald-400' : 'text-rose-400',
                  bg: posicionNeta30d >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
                  border: posicionNeta30d >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20' },
              ].map((s, i) => (
                <div key={i} className={clsx('p-5 rounded-xl border', s.bg, s.border)}>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{s.label}</p>
                  <p className={clsx('text-3xl font-black tracking-tighter', s.color)}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Bar chart — cobros vs pagos semanales */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-400" /> Proyección Semanal — Próximas 12 Semanas
              </h3>
              {flujo.length === 0 ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="text-center">
                    <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-600 text-[11px] font-black uppercase tracking-widest">Registra CxC y CxP para ver la proyección</p>
                  </div>
                </div>
              ) : (
                <div className="h-64" style={{ minHeight: 256 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={flujo} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 8, fontWeight: 900 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#475569', fontSize: 8, fontWeight: 900 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
                        formatter={(v: any, name: string) => [fmt(v), name === 'cobros' ? 'Cobros' : name === 'pagos' ? 'Pagos' : 'Neto']}
                      />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                      <Bar dataKey="cobros" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={14} name="cobros" />
                      <Bar dataKey="pagos"  fill="#f43f5e" radius={[3, 3, 0, 0]} barSize={14} name="pagos" />
                      <Bar dataKey="neto" radius={[3, 3, 0, 0]} barSize={10} name="neto">
                        {flujo.map((f, i) => <Cell key={i} fill={f.neto >= 0 ? '#10b981' : '#f43f5e'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="flex gap-6 mt-3 justify-center">
                {[{ color: 'bg-blue-500', label: 'Cobros esperados' }, { color: 'bg-rose-500', label: 'Pagos programados' }, { color: 'bg-emerald-500', label: 'Posición neta' }].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className={clsx('w-2 h-2 rounded-sm', l.color)} />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detalle por semana */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle por Semana</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="px-4 py-2">Semana</th>
                    <th className="px-4 py-2 text-right">Cobros</th>
                    <th className="px-4 py-2 text-right">Pagos</th>
                    <th className="px-4 py-2 text-right">Posición Neta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {flujo.map((f, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-all">
                      <td className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase">{f.label}</td>
                      <td className="px-4 py-2 text-right text-[10px] font-black text-blue-400">{f.cobros > 0 ? fmt(f.cobros) : '—'}</td>
                      <td className="px-4 py-2 text-right text-[10px] font-black text-rose-400">{f.pagos > 0 ? fmt(f.pagos) : '—'}</td>
                      <td className={clsx('px-4 py-2 text-right text-[11px] font-black', f.neto >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        {f.cobros === 0 && f.pagos === 0 ? '—' : fmt(f.neto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={loadAll} editingTransaction={null} />

      {/* ── Modal CxC ── */}
      {showCxCModal && (
        <div className="fixed inset-0 top-16 left-0 md:left-64 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/80">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-white/5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black text-white uppercase">{editingCxC ? 'EDITAR' : 'NUEVA'} <span className="text-blue-500">CUENTA POR COBRAR</span></h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">REGISTRO DE FACTURA EMITIDA</p>
              </div>
              <button onClick={() => setShowCxCModal(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-rose-500 transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCxC} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="cxc-numero_factura" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Número de Factura *</label>
                  <input id="cxc-numero_factura" required className="cyber-input w-full" placeholder="FAC-2026-001" value={cxcForm.numero_factura} onChange={e => setCxcForm({ ...cxcForm, numero_factura: e.target.value })} /></div>
                <div><label htmlFor="cxc-cliente" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Cliente *</label>
                  <input id="cxc-cliente" required className="cyber-input w-full" placeholder="NOMBRE DEL CLIENTE" value={cxcForm.cliente} onChange={e => setCxcForm({ ...cxcForm, cliente: e.target.value })} /></div>
              </div>
              <div><label htmlFor="cxc-concepto" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Concepto</label>
                <input id="cxc-concepto" className="cyber-input w-full" placeholder="DESCRIPCIÓN DEL SERVICIO/PRODUCTO" value={cxcForm.concepto} onChange={e => setCxcForm({ ...cxcForm, concepto: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label htmlFor="cxc-monto" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Monto *</label>
                  <input id="cxc-monto" required type="number" min="0" step="0.01" className="cyber-input w-full" value={cxcForm.monto} onChange={e => setCxcForm({ ...cxcForm, monto: parseFloat(e.target.value) || 0 })} /></div>
                <div><label htmlFor="cxc-monto_cobrado" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Ya Cobrado</label>
                  <input id="cxc-monto_cobrado" type="number" min="0" step="0.01" className="cyber-input w-full" value={cxcForm.monto_cobrado} onChange={e => setCxcForm({ ...cxcForm, monto_cobrado: parseFloat(e.target.value) || 0 })} /></div>
                <div><label htmlFor="cxc-moneda" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Moneda</label>
                  <select id="cxc-moneda" className="cyber-select w-full" value={cxcForm.moneda} onChange={e => setCxcForm({ ...cxcForm, moneda: e.target.value })}>
                    {['MXN', 'USD', 'EUR'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="cxc-fecha_emision" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Fecha Emisión</label>
                  <input id="cxc-fecha_emision" type="date" className="cyber-input w-full" value={cxcForm.fecha_emision} onChange={e => setCxcForm({ ...cxcForm, fecha_emision: e.target.value })} /></div>
                <div><label htmlFor="cxc-fecha_vencimiento" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Fecha Vencimiento *</label>
                  <input id="cxc-fecha_vencimiento" required type="date" className="cyber-input w-full" value={cxcForm.fecha_vencimiento} onChange={e => setCxcForm({ ...cxcForm, fecha_vencimiento: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="cxc-status" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Estado</label>
                  <select id="cxc-status" className="cyber-select w-full" value={cxcForm.status} onChange={e => setCxcForm({ ...cxcForm, status: e.target.value })}>
                    {['pendiente', 'parcial', 'cobrada', 'vencida', 'cancelada'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}</select></div>
                <div><label htmlFor="cxc-referencia_viajero" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Viajero / OT (ref.)</label>
                  <input id="cxc-referencia_viajero" className="cyber-input w-full" placeholder="VJ-2026-..." value={cxcForm.referencia_viajero} onChange={e => setCxcForm({ ...cxcForm, referencia_viajero: e.target.value })} /></div>
              </div>
              <div><label htmlFor="cxc-notas" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Notas</label>
                <textarea id="cxc-notas" rows={2} className="cyber-input w-full resize-none" value={cxcForm.notas} onChange={e => setCxcForm({ ...cxcForm, notas: e.target.value })} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCxCModal(false)} className="flex-1 h-11 border border-white/10 text-slate-500 font-black uppercase tracking-widest rounded-xl text-[9px]">CANCELAR</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] h-11 bg-mcvill-accent hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-xl text-[9px] flex items-center justify-center gap-2 transition-all">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" role="status" aria-label="Cargando" /> : <><CreditCard size={14} /> {editingCxC ? 'ACTUALIZAR' : 'REGISTRAR'} CxC</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal CxP ── */}
      {showCxPModal && (
        <div className="fixed inset-0 top-16 left-0 md:left-64 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/80">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-white/5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black text-white uppercase">{editingCxP ? 'EDITAR' : 'NUEVA'} <span className="text-rose-500">CUENTA POR PAGAR</span></h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">REGISTRO DE FACTURA RECIBIDA</p>
              </div>
              <button onClick={() => setShowCxPModal(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-rose-500 transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCxP} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="cxp-numero_factura" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Número de Factura *</label>
                  <input id="cxp-numero_factura" required className="cyber-input w-full" placeholder="PROV-2026-001" value={cxpForm.numero_factura} onChange={e => setCxpForm({ ...cxpForm, numero_factura: e.target.value })} /></div>
                <div><label htmlFor="cxp-proveedor" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Proveedor *</label>
                  <input id="cxp-proveedor" required className="cyber-input w-full" placeholder="NOMBRE DEL PROVEEDOR" value={cxpForm.proveedor} onChange={e => setCxpForm({ ...cxpForm, proveedor: e.target.value })} /></div>
              </div>
              <div><label htmlFor="cxp-concepto" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Concepto</label>
                <input id="cxp-concepto" className="cyber-input w-full" placeholder="DESCRIPCIÓN DEL BIEN/SERVICIO" value={cxpForm.concepto} onChange={e => setCxpForm({ ...cxpForm, concepto: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label htmlFor="cxp-monto" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Monto *</label>
                  <input id="cxp-monto" required type="number" min="0" step="0.01" className="cyber-input w-full" value={cxpForm.monto} onChange={e => setCxpForm({ ...cxpForm, monto: parseFloat(e.target.value) || 0 })} /></div>
                <div><label htmlFor="cxp-monto_pagado" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Ya Pagado</label>
                  <input id="cxp-monto_pagado" type="number" min="0" step="0.01" className="cyber-input w-full" value={cxpForm.monto_pagado} onChange={e => setCxpForm({ ...cxpForm, monto_pagado: parseFloat(e.target.value) || 0 })} /></div>
                <div><label htmlFor="cxp-moneda" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Moneda</label>
                  <select id="cxp-moneda" className="cyber-select w-full" value={cxpForm.moneda} onChange={e => setCxpForm({ ...cxpForm, moneda: e.target.value })}>
                    {['MXN', 'USD', 'EUR'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="cxp-fecha_emision" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Fecha Emisión</label>
                  <input id="cxp-fecha_emision" type="date" className="cyber-input w-full" value={cxpForm.fecha_emision} onChange={e => setCxpForm({ ...cxpForm, fecha_emision: e.target.value })} /></div>
                <div><label htmlFor="cxp-fecha_vencimiento" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Fecha Vencimiento *</label>
                  <input id="cxp-fecha_vencimiento" required type="date" className="cyber-input w-full" value={cxpForm.fecha_vencimiento} onChange={e => setCxpForm({ ...cxpForm, fecha_vencimiento: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="cxp-prioridad" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Prioridad</label>
                  <select id="cxp-prioridad" className="cyber-select w-full" value={cxpForm.prioridad} onChange={e => setCxpForm({ ...cxpForm, prioridad: e.target.value })}>
                    {['baja', 'normal', 'alta', 'critica'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}</select></div>
                <div><label htmlFor="cxp-status" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Estado</label>
                  <select id="cxp-status" className="cyber-select w-full" value={cxpForm.status} onChange={e => setCxpForm({ ...cxpForm, status: e.target.value })}>
                    {['pendiente', 'parcial', 'pagada', 'vencida', 'cancelada'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}</select></div>
              </div>
              <div><label htmlFor="cxp-referencia_oc" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">OC Referencia</label>
                <input id="cxp-referencia_oc" className="cyber-input w-full" placeholder="OC-2026-..." value={cxpForm.referencia_oc} onChange={e => setCxpForm({ ...cxpForm, referencia_oc: e.target.value })} /></div>
              <div><label htmlFor="cxp-notas" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Notas</label>
                <textarea id="cxp-notas" rows={2} className="cyber-input w-full resize-none" value={cxpForm.notas} onChange={e => setCxpForm({ ...cxpForm, notas: e.target.value })} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCxPModal(false)} className="flex-1 h-11 border border-white/10 text-slate-500 font-black uppercase tracking-widest rounded-xl text-[9px]">CANCELAR</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] h-11 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest rounded-xl text-[9px] flex items-center justify-center gap-2 transition-all">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" role="status" aria-label="Cargando" /> : <><DollarSign size={14} /> {editingCxP ? 'ACTUALIZAR' : 'REGISTRAR'} CxP</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
