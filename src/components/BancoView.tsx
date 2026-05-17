import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark, Plus, RefreshCw, Trash2, ArrowUpCircle, ArrowDownCircle,
  X, Save, DollarSign, Calendar, AlertCircle, TrendingUp, CreditCard,
  CheckCircle2, Search, GitMerge
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { appConfirm } from '../lib/dialogs';
const ConciliacionIA = lazy(() => import('./ConciliacionIA'));

export interface BankAccount {
  id?: string;
  nombre: string;
  banco: string;
  tipo: 'cheques' | 'ahorro' | 'inversion' | 'efectivo';
  moneda: 'MXN' | 'USD';
  saldo_inicial: number;
  saldo_actual: number;
  cuenta_clabe?: string;
  activo?: boolean;
  notas?: string;
}

export interface BankTx {
  id?: string;
  account_id: string;
  fecha: string;
  concepto: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  referencia?: string;
  categoria?: string;
  conciliado?: boolean;
  notas?: string;
}

type Tab = 'cuentas' | 'movimientos' | 'conciliacion';

const fmt = (n: number, cur = 'MXN') =>
  n.toLocaleString('es-MX', { style: 'currency', currency: cur, minimumFractionDigits: 2 });

const TIPO_CUENTA: [BankAccount['tipo'], string][] = [
  ['cheques', 'Cheques'],
  ['ahorro', 'Ahorro'],
  ['inversion', 'Inversión'],
  ['efectivo', 'Caja Efectivo'],
];

const CATEGORIAS = [
  'Operaciones', 'Nómina', 'Proveedores', 'Clientes', 'Impuestos',
  'Préstamos', 'Inversión', 'Gastos Generales', 'Otros'
];

const emptyAccount: BankAccount = {
  nombre: '', banco: '', tipo: 'cheques', moneda: 'MXN',
  saldo_inicial: 0, saldo_actual: 0, activo: true
};

const emptyTx: Omit<BankTx, 'account_id'> = {
  fecha: new Date().toISOString().slice(0, 10),
  concepto: '', tipo: 'egreso', monto: 0, conciliado: false
};

export const BancoView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('cuentas');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [txs, setTxs] = useState<BankTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Account form
  const [showAccForm, setShowAccForm] = useState(false);
  const [editAcc, setEditAcc] = useState<BankAccount>(emptyAccount);

  // Tx form
  const [showTxForm, setShowTxForm] = useState(false);
  const [editTx, setEditTx] = useState<BankTx & { account_id: string }>({ ...emptyTx, account_id: '' });
  const [selectedAccId, setSelectedAccId] = useState<string>('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: accs, error: e1 }, { data: txData, error: e2 }] = await Promise.all([
        supabase.from('bank_accounts').select('*').order('created_at', { ascending: false }),
        supabase.from('bank_transactions').select('*').order('fecha', { ascending: false }).limit(200),
      ]);
      if (e1 && !e1.message.includes('does not exist')) throw e1;
      if (e2 && !e2.message.includes('does not exist')) throw e2;
      setAccounts(accs || []);
      setTxs(txData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveAccount = async () => {
    if (!editAcc.nombre || !editAcc.banco) { setError('Nombre y banco son obligatorios'); return; }
    setSaving(true);
    try {
      const { id, ...payload } = editAcc;
      const result = id
        ? await supabase.from('bank_accounts').update(payload).eq('id', id)
        : await supabase.from('bank_accounts').insert({ ...payload, saldo_actual: payload.saldo_inicial });
      if (result.error) throw result.error;
      setShowAccForm(false);
      setEditAcc(emptyAccount);
      await load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const deleteAccount = async (id: string) => {
    if (!await appConfirm('¿Eliminar esta cuenta bancaria? Se perderán sus movimientos.')) return;
    await supabase.from('bank_accounts').delete().eq('id', id);
    await load();
  };

  const saveTx = async () => {
    if (!editTx.account_id || !editTx.concepto || editTx.monto <= 0) {
      setError('Cuenta, concepto y monto son obligatorios'); return;
    }
    setSaving(true);
    try {
      const { id, ...payload } = editTx as any;
      const result = id
        ? await supabase.from('bank_transactions').update(payload).eq('id', id)
        : await supabase.from('bank_transactions').insert(payload);
      if (result.error) throw result.error;
      // Update saldo_actual
      const acc = accounts.find(a => a.id === editTx.account_id);
      if (acc && acc.id) {
        const delta = editTx.tipo === 'ingreso' ? editTx.monto : -editTx.monto;
        const newSaldo = (acc.saldo_actual || 0) + delta;
        await supabase.from('bank_accounts').update({ saldo_actual: newSaldo }).eq('id', acc.id);
      }
      setShowTxForm(false);
      setEditTx({ ...emptyTx, account_id: '' });
      await load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const deleteTx = async (tx: BankTx) => {
    if (!await appConfirm('¿Eliminar este movimiento?')) return;
    await supabase.from('bank_transactions').delete().eq('id', tx.id!);
    // Revert saldo
    const acc = accounts.find(a => a.id === tx.account_id);
    if (acc && acc.id) {
      const delta = tx.tipo === 'ingreso' ? -tx.monto : tx.monto;
      await supabase.from('bank_accounts').update({ saldo_actual: (acc.saldo_actual || 0) + delta }).eq('id', acc.id);
    }
    await load();
  };

  const totalMXN = accounts.filter(a => a.moneda === 'MXN' && a.activo).reduce((s, a) => s + (a.saldo_actual || 0), 0);
  const totalUSD = accounts.filter(a => a.moneda === 'USD' && a.activo).reduce((s, a) => s + (a.saldo_actual || 0), 0);

  const filteredTxs = txs.filter(tx => {
    const acc = accounts.find(a => a.id === tx.account_id);
    const q = search.toLowerCase();
    return !q || tx.concepto.toLowerCase().includes(q) || (acc?.nombre || '').toLowerCase().includes(q) || (tx.referencia || '').toLowerCase().includes(q);
  }).filter(tx => !selectedAccId || tx.account_id === selectedAccId);

  return (
    <div className="h-full flex flex-col bg-mcvill-bg overflow-hidden -m-8">
      {/* Header */}
      <div className="px-6 py-3 border-b border-mcvill-card-border/30 bg-mcvill-card/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-mcvill-accent/10 rounded-xl flex items-center justify-center border border-mcvill-accent/20">
            <Landmark size={20} className="text-mcvill-accent" />
          </div>
          <div>
            <h1 className="text-base font-black text-mcvill-text tracking-tighter uppercase">
              BANCO <span className="text-mcvill-accent">& TESORERÍA</span>
            </h1>
            <p className="text-[9px] text-mcvill-text-muted font-bold uppercase tracking-widest">
              Control de Cuentas y Flujo de Efectivo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[8px] text-mcvill-text-muted uppercase tracking-widest">Saldo Total MXN</p>
            <p className="text-lg font-black text-mcvill-accent">{fmt(totalMXN)}</p>
          </div>
          {totalUSD > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-[8px] text-mcvill-text-muted uppercase tracking-widest">Saldo USD</p>
              <p className="text-lg font-black text-emerald-400">{fmt(totalUSD, 'USD')}</p>
            </div>
          )}
          <button onClick={load} className="p-2 rounded-xl bg-mcvill-accent/10 border border-mcvill-accent/20 text-mcvill-accent hover:bg-mcvill-accent/20 transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-end gap-1 px-4 pt-3 border-b border-mcvill-card-border/20 bg-mcvill-card/10 shrink-0">
        {([
          ['cuentas',      'Cuentas',       CreditCard],
          ['movimientos',  'Movimientos',   TrendingUp],
          ['conciliacion', 'Conciliación IA', GitMerge],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-t-xl border-x border-t text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === id
                ? id === 'conciliacion'
                  ? 'bg-mcvill-bg border-mcvill-card-border/30 text-emerald-400 border-b-mcvill-bg'
                  : 'bg-mcvill-bg border-mcvill-card-border/30 text-mcvill-accent border-b-mcvill-bg'
                : 'bg-transparent border-transparent text-mcvill-text-muted hover:text-mcvill-text'
            }`}>
            <Icon size={12} /><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{id === 'conciliacion' ? 'IA' : label}</span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2 text-rose-400 text-xs">
          <AlertCircle size={14} />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X size={12} /></button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <AnimatePresence mode="wait">
          {tab === 'cuentas' && (
            <motion.div key="cuentas" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-mcvill-text-muted uppercase tracking-widest font-bold">{accounts.length} cuentas registradas</p>
                <button onClick={() => { setEditAcc(emptyAccount); setShowAccForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-mcvill-accent text-mcvill-bg rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                  <Plus size={14} /> Nueva Cuenta
                </button>
              </div>

              {loading && accounts.length === 0 ? (
                <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-mcvill-accent" size={32} /></div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-mcvill-card-border/30 rounded-2xl">
                  <Landmark size={40} className="mx-auto text-mcvill-text-muted/30 mb-3" />
                  <p className="text-sm font-black text-mcvill-text-muted uppercase tracking-widest">Sin cuentas registradas</p>
                  <p className="text-xs text-mcvill-text-muted/60 mt-1">Agrega tu primera cuenta bancaria</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {accounts.map(acc => (
                    <div key={acc.id} className={`relative p-4 rounded-2xl border transition-all ${acc.activo !== false ? 'border-mcvill-card-border/30 bg-mcvill-card/20 hover:border-mcvill-accent/30' : 'border-white/5 bg-white/[0.02] opacity-50'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-black text-mcvill-text uppercase">{acc.nombre}</p>
                          <p className="text-[9px] text-mcvill-text-muted">{acc.banco} · {acc.tipo}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${acc.moneda === 'USD' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-mcvill-accent border-mcvill-accent/30 bg-mcvill-accent/10'}`}>{acc.moneda}</span>
                      </div>
                      <p className={`text-2xl font-black mb-3 ${(acc.saldo_actual || 0) < 0 ? 'text-rose-400' : 'text-mcvill-accent'}`}>
                        {fmt(acc.saldo_actual || 0, acc.moneda)}
                      </p>
                      {acc.cuenta_clabe && <p className="text-[8px] font-mono text-mcvill-text-muted mb-3">{acc.cuenta_clabe}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => { setEditAcc(acc); setShowAccForm(true); }}
                          className="flex-1 py-1.5 rounded-xl bg-mcvill-accent/10 text-mcvill-accent text-[9px] font-black uppercase tracking-widest hover:bg-mcvill-accent/20 transition-all">
                          Editar
                        </button>
                        <button onClick={() => { setSelectedAccId(acc.id!); setTab('movimientos'); }}
                          className="flex-1 py-1.5 rounded-xl bg-white/5 text-mcvill-text text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                          Movimientos
                        </button>
                        <button onClick={() => deleteAccount(acc.id!)}
                          className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'movimientos' && (
            <motion.div key="movimientos" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mcvill-text-muted" size={14} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar movimientos..."
                      className="w-full bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 pl-9 pr-3 text-xs text-mcvill-text outline-none focus:border-mcvill-accent/50" />
                  </div>
                  <select value={selectedAccId} onChange={e => setSelectedAccId(e.target.value)}
                    className="bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 px-3 text-xs text-mcvill-text outline-none focus:border-mcvill-accent/50">
                    <option value="">Todas las cuentas</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <button onClick={() => { setEditTx({ ...emptyTx, account_id: selectedAccId || accounts[0]?.id || '' }); setShowTxForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-mcvill-accent text-mcvill-bg rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shrink-0">
                  <Plus size={14} /> Nuevo Movimiento
                </button>
              </div>

              {/* Summary row */}
              {filteredTxs.length > 0 && (() => {
                const ing = filteredTxs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
                const eg = filteredTxs.filter(t => t.tipo === 'egreso').reduce((s, t) => s + t.monto, 0);
                return (
                  <div className="grid grid-cols-3 gap-3">
                    {[['Ingresos', ing, 'text-emerald-400', ArrowUpCircle], ['Egresos', eg, 'text-rose-400', ArrowDownCircle], ['Neto', ing - eg, (ing - eg) >= 0 ? 'text-mcvill-accent' : 'text-rose-400', DollarSign]].map(([label, val, cls, Icon]: any) => (
                      <div key={label as string} className="p-3 rounded-xl border border-mcvill-card-border/20 bg-mcvill-card/10">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={12} className={cls as string} />
                          <span className="text-[8px] text-mcvill-text-muted uppercase tracking-widest font-bold">{label as string}</span>
                        </div>
                        <p className={`text-sm font-black ${cls as string}`}>{fmt(val as number)}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Transactions list */}
              {loading ? (
                <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-mcvill-accent" size={32} /></div>
              ) : filteredTxs.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-mcvill-card-border/30 rounded-2xl">
                  <TrendingUp size={40} className="mx-auto text-mcvill-text-muted/30 mb-3" />
                  <p className="text-sm font-black text-mcvill-text-muted uppercase tracking-widest">Sin movimientos</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-mcvill-card-border/20">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-mcvill-card-border/20 bg-mcvill-card/20">
                        {['Fecha', 'Cuenta', 'Concepto', 'Categoría', 'Tipo', 'Monto', 'Ref', '✓'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest">{h}</th>
                        ))}
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTxs.map(tx => {
                        const acc = accounts.find(a => a.id === tx.account_id);
                        return (
                          <tr key={tx.id} className="border-b border-mcvill-card-border/10 hover:bg-mcvill-card/10 transition-all group">
                            <td className="px-3 py-2 text-[10px] text-mcvill-text-muted font-mono">{tx.fecha}</td>
                            <td className="px-3 py-2 text-[10px] text-mcvill-text font-bold">{acc?.nombre || '—'}</td>
                            <td className="px-3 py-2 text-[10px] text-mcvill-text max-w-[200px] truncate">{tx.concepto}</td>
                            <td className="px-3 py-2 text-[9px] text-mcvill-text-muted">{tx.categoria || '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${tx.tipo === 'ingreso' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-400 border-rose-500/30 bg-rose-500/10'}`}>
                                {tx.tipo}
                              </span>
                            </td>
                            <td className={`px-3 py-2 text-[11px] font-black ${tx.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {tx.tipo === 'ingreso' ? '+' : '-'}{fmt(tx.monto, acc?.moneda)}
                            </td>
                            <td className="px-3 py-2 text-[9px] text-mcvill-text-muted font-mono">{tx.referencia || '—'}</td>
                            <td className="px-3 py-2">
                              {tx.conciliado ? <CheckCircle2 size={12} className="text-emerald-400" /> : <div className="w-3 h-3 rounded-full border border-mcvill-card-border/40" />}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => deleteTx(tx)} className="p-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"><Trash2 size={10} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
          {tab === 'conciliacion' && (
            <motion.div key="conciliacion" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
              <Suspense fallback={<div className="flex items-center justify-center py-20"><RefreshCw className="animate-spin text-mcvill-accent" size={28} /></div>}>
                <ConciliacionIA
                  accounts={accounts}
                  txs={txs}
                  onMarkConciliado={async (ids) => {
                    await Promise.all(ids.map(id =>
                      supabase.from('bank_transactions').update({ conciliado: true }).eq('id', id)
                    ));
                    setTxs(prev => prev.map(t => ids.includes(t.id!) ? { ...t, conciliado: true } : t));
                  }}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Account Form Modal */}
      <AnimatePresence>
        {showAccForm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAccForm(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-mcvill-bg border border-mcvill-card-border/30 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-mcvill-card-border/20">
                <h3 className="text-sm font-black text-mcvill-text uppercase tracking-widest">{editAcc.id ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria'}</h3>
                <button onClick={() => setShowAccForm(false)} className="p-1.5 rounded-xl bg-white/5 text-mcvill-text-muted hover:text-mcvill-text"><X size={16} /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[['Nombre de la Cuenta', 'nombre', 'text', 'Ej: BBVA Principal'], ['Institución Bancaria', 'banco', 'text', 'Ej: BBVA, Banorte, HSBC']].map(([label, key, type, placeholder]) => (
                    <div key={key as string}>
                      <label className="text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest mb-1.5 block">{label as string}</label>
                      <input type={type as string} value={(editAcc as any)[key as string] || ''} placeholder={placeholder as string}
                        onChange={e => setEditAcc({ ...editAcc, [key as string]: e.target.value })}
                        className="w-full bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 px-3 text-xs text-mcvill-text outline-none focus:border-mcvill-accent/50" />
                    </div>
                  ))}
                  <div>
                    <label className="text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest mb-1.5 block">Tipo</label>
                    <select value={editAcc.tipo} onChange={e => setEditAcc({ ...editAcc, tipo: e.target.value as any })}
                      className="w-full bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 px-3 text-xs text-mcvill-text outline-none focus:border-mcvill-accent/50">
                      {TIPO_CUENTA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest mb-1.5 block">Moneda</label>
                    <select value={editAcc.moneda} onChange={e => setEditAcc({ ...editAcc, moneda: e.target.value as any })}
                      className="w-full bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 px-3 text-xs text-mcvill-text outline-none focus:border-mcvill-accent/50">
                      <option value="MXN">MXN — Pesos Mexicanos</option>
                      <option value="USD">USD — Dólares</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest mb-1.5 block">Saldo Inicial</label>
                    <input type="number" value={editAcc.saldo_inicial || 0}
                      onChange={e => setEditAcc({ ...editAcc, saldo_inicial: Number(e.target.value) })}
                      className="w-full bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 px-3 text-xs text-mcvill-accent font-bold outline-none focus:border-mcvill-accent/50" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest mb-1.5 block">CLABE / Cuenta</label>
                    <input type="text" value={editAcc.cuenta_clabe || ''} placeholder="18 dígitos CLABE"
                      onChange={e => setEditAcc({ ...editAcc, cuenta_clabe: e.target.value })}
                      className="w-full bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 px-3 text-xs text-mcvill-text font-mono outline-none focus:border-mcvill-accent/50" />
                  </div>
                </div>
                <button onClick={saveAccount} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-mcvill-accent text-mcvill-bg rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50">
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Guardar Cuenta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Form Modal */}
      <AnimatePresence>
        {showTxForm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTxForm(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-mcvill-bg border border-mcvill-card-border/30 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-mcvill-card-border/20">
                <h3 className="text-sm font-black text-mcvill-text uppercase tracking-widest">Nuevo Movimiento</h3>
                <button onClick={() => setShowTxForm(false)} className="p-1.5 rounded-xl bg-white/5 text-mcvill-text-muted hover:text-mcvill-text"><X size={16} /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest mb-1.5 block">Cuenta</label>
                    <select value={editTx.account_id} onChange={e => setEditTx({ ...editTx, account_id: e.target.value })}
                      className="w-full bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 px-3 text-xs text-mcvill-text outline-none focus:border-mcvill-accent/50">
                      <option value="">Seleccionar...</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest mb-1.5 block">Tipo</label>
                    <div className="flex gap-2">
                      {(['ingreso', 'egreso'] as const).map(t => (
                        <button key={t} onClick={() => setEditTx({ ...editTx, tipo: t })}
                          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${editTx.tipo === t ? (t === 'ingreso' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30') : 'bg-mcvill-card/20 text-mcvill-text-muted border-mcvill-card-border/20'}`}>
                          {t === 'ingreso' ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}{t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest mb-1.5 block">Concepto</label>
                    <input type="text" value={editTx.concepto} placeholder="Descripción del movimiento"
                      onChange={e => setEditTx({ ...editTx, concepto: e.target.value })}
                      className="w-full bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 px-3 text-xs text-mcvill-text outline-none focus:border-mcvill-accent/50" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest mb-1.5 block">Monto</label>
                    <input type="number" value={editTx.monto || ''} min="0" step="0.01"
                      onChange={e => setEditTx({ ...editTx, monto: Number(e.target.value) })}
                      className="w-full bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 px-3 text-xs text-mcvill-accent font-black outline-none focus:border-mcvill-accent/50" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest mb-1.5 block">Fecha</label>
                    <input type="date" value={editTx.fecha}
                      onChange={e => setEditTx({ ...editTx, fecha: e.target.value })}
                      className="w-full bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 px-3 text-xs text-mcvill-text outline-none focus:border-mcvill-accent/50" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest mb-1.5 block">Categoría</label>
                    <select value={editTx.categoria || ''} onChange={e => setEditTx({ ...editTx, categoria: e.target.value })}
                      className="w-full bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 px-3 text-xs text-mcvill-text outline-none focus:border-mcvill-accent/50">
                      <option value="">Sin categoría</option>
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-mcvill-text-muted uppercase tracking-widest mb-1.5 block">Referencia / Folio</label>
                    <input type="text" value={editTx.referencia || ''} placeholder="Ej: TRF-001, CHQ-123"
                      onChange={e => setEditTx({ ...editTx, referencia: e.target.value })}
                      className="w-full bg-mcvill-card/30 border border-mcvill-card-border/30 rounded-xl py-2 px-3 text-xs text-mcvill-text font-mono outline-none focus:border-mcvill-accent/50" />
                  </div>
                  <div className="col-span-2 flex items-center gap-3">
                    <input type="checkbox" id="conciliado" checked={editTx.conciliado || false}
                      onChange={e => setEditTx({ ...editTx, conciliado: e.target.checked })}
                      className="w-4 h-4 accent-mcvill-accent" />
                    <label htmlFor="conciliado" className="text-xs text-mcvill-text-muted cursor-pointer">Marcar como conciliado</label>
                  </div>
                </div>
                <button onClick={saveTx} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-mcvill-accent text-mcvill-bg rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50">
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Registrar Movimiento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BancoView;
