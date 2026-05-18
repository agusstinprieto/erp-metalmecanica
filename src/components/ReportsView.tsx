import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Calendar, Download, BarChart3, Loader2, RefreshCw, Send,
  Mail, MessageSquare, CheckCircle2, ArrowUpCircle, ArrowDownCircle,
  AlertTriangle, Users, Clock, Cpu, Bell, Zap, Package, DollarSign,
  TrendingUp, Factory, ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { reportUtils } from '../utils/reportUtils';
import { productionService } from '../services/productionService';
import { inventoryService } from '../services/inventoryService';
import { payrollService } from '../services/payrollService';
import { financeService } from '../services/financeService';
import { qualityService } from '../services/qualityService';
import { whatsappService } from '../services/whatsappService';
import { format } from 'date-fns';
import { Toast } from './common/Toast';
import { useConfig } from '../contexts/ConfigContext';

type Tab = 'kpis' | 'production' | 'inventory' | 'payroll' | 'finance' | 'envio';
type PeriodFilter = 'week' | 'month' | 'quarter' | 'year';

const fmt  = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtK = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : fmt(n);

const SCHEDULE_KEY = 'mcvill_envios_programados';

interface KPIs {
  produccion: { total: number; completadas: number; en_proceso: number; pendientes: number };
  inventario:  { total: number; valor: number; bajo_minimo: number };
  payroll:     { registros: number; bruto: number; neto: number };
  finanzas:    { ingresos: number; gastos: number; balance: number };
  cxc:         { total: number; vencido: number };
  cxp:         { total: number; critico: number };
  calidad:     { inspecciones: number; tasa_pase: number; ncs_abiertas: number };
}

// ─── Sub-components (must be declared before ReportsView) ─────────────────────

const KPISection: React.FC<{
  title: string; icon: React.ElementType; color: string; bg: string; border: string; children: React.ReactNode;
}> = ({ title, icon: Icon, color, bg, border, children }) => (
  <div className={clsx('border rounded-xl overflow-hidden', bg, border)}>
    <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
      <Icon size={14} className={color} />
      <h3 className={clsx('text-[10px] font-black uppercase tracking-widest', color)}>{title}</h3>
    </div>
    <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {children}
    </div>
  </div>
);

const KPICard: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
  <div className="text-center px-2 py-2.5 bg-black/20 rounded-lg border border-white/5">
    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-2">{label}</p>
    <p className={clsx('text-xl font-black tracking-tighter leading-none', color)}>{value}</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const ReportsView = () => {
  const { config } = useConfig();
  const [activeTab, setActiveTab]   = useState<Tab>('kpis');
  const [period, setPeriod]         = useState<PeriodFilter>('month');
  const [loading, setLoading]       = useState(true);
  const [tableData, setTableData]   = useState<any[]>([]);
  const [kpis, setKpis]             = useState<KPIs | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success'|'error'|'info' } | null>(null);

  const [envioForm, setEnvioForm] = useState({
    reportType:        'kpi_ejecutivo',
    email:             '',
    whatsapp:          '',
    teams:             '',
    programarFecha:    '',
    programarHora:     '08:00',
    programarFrecuencia: 'manual' as 'manual' | 'diario' | 'semanal' | 'mensual',
  });

  const [scheduled, setScheduled] = useState<any[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  const loadScheduled = useCallback(async () => {
    try {
      setScheduledLoading(true);
      const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('activo', true)
        .order('fecha', { ascending: true });
      if (error) {
        // Tabla no aplicada aún — usar localStorage como fallback silencioso
        try { setScheduled(JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '[]')); } catch {}
      } else {
        setScheduled(data ?? []);
      }
    } catch {
      try { setScheduled(JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '[]')); } catch {}
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  const notify = (message: string, type: 'success'|'error'|'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ── Load KPIs ──────────────────────────────────────────────────────────────
  const loadKPIs = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, materials, payrolls, stats, cxcList, cxpList, inspections, ncs] = await Promise.all([
        productionService.getWorkOrders().catch(() => [] as any[]),
        inventoryService.listMaterials().catch(() => [] as any[]),
        payrollService.listPayrolls().catch(() => [] as any[]),
        financeService.getStats().catch(() => ({ total_balance: 0, monthly_income: 0, monthly_expense: 0 })),
        financeService.getCxC().catch(() => [] as any[]),
        financeService.getCxP().catch(() => [] as any[]),
        qualityService.getInspections().catch(() => [] as any[]),
        qualityService.getNoConformidades().catch(() => [] as any[]),
      ]);

      const passed    = inspections.filter((i: any) => i.status === 'passed').length;
      const tasa_pase = inspections.length > 0 ? Math.round((passed / inspections.length) * 100) : 100;

      const totalCxC  = cxcList.filter((c: any) => ['pendiente','parcial'].includes(c.status)).reduce((s: number, c: any) => s + (c.monto - c.monto_cobrado), 0);
      const vencCxC   = cxcList.filter((c: any) => new Date(c.fecha_vencimiento) < new Date() && c.status !== 'cobrada').reduce((s: number, c: any) => s + (c.monto - c.monto_cobrado), 0);
      const totalCxP  = cxpList.filter((p: any) => ['pendiente','parcial'].includes(p.status)).reduce((s: number, p: any) => s + (p.monto - p.monto_pagado), 0);
      const critCxP   = cxpList.filter((p: any) => p.prioridad === 'critica' && ['pendiente','parcial'].includes(p.status)).reduce((s: number, p: any) => s + (p.monto - p.monto_pagado), 0);

      setKpis({
        produccion: {
          total:      orders.length,
          completadas: orders.filter((o: any) => o.status === 'completed').length,
          en_proceso:  orders.filter((o: any) => ['in_progress','en_proceso'].includes(o.status)).length,
          pendientes:  orders.filter((o: any) => ['pending','pendiente'].includes(o.status)).length,
        },
        inventario: {
          total:      materials.length,
          valor:      materials.reduce((s: number, m: any) => s + (m.stock_quantity || 0) * (m.unit_cost || 0), 0),
          bajo_minimo: materials.filter((m: any) => m.min_stock != null && m.stock_quantity <= m.min_stock).length,
        },
        payroll: {
          registros: payrolls.length,
          bruto:     payrolls.reduce((s: number, p: any) => s + Number(p.gross_salary || 0), 0),
          neto:      payrolls.reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0),
        },
        finanzas: { ingresos: stats.monthly_income, gastos: stats.monthly_expense, balance: stats.total_balance },
        cxc:      { total: totalCxC, vencido: vencCxC },
        cxp:      { total: totalCxP, critico: critCxP },
        calidad: {
          inspecciones: inspections.length,
          tasa_pase,
          ncs_abiertas: ncs.filter((n: any) => ['abierta','en_proceso'].includes(n.status)).length,
        },
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  // ── Load table data ────────────────────────────────────────────────────────
  const loadTable = useCallback(async () => {
    if (['kpis','envio'].includes(activeTab)) return;
    setLoading(true);
    try {
      if (activeTab === 'production') setTableData(await productionService.getWorkOrders());
      if (activeTab === 'inventory')  setTableData(await inventoryService.listMaterials());
      if (activeTab === 'payroll')    setTableData(await payrollService.listPayrolls());
      if (activeTab === 'finance')    setTableData(await financeService.getTransactions());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { loadKPIs(); loadScheduled(); }, []);
  useEffect(() => { loadTable(); }, [activeTab]);

  // ── Build WhatsApp/Email message ───────────────────────────────────────────
  const buildMessage = () => {
    if (!kpis) return 'Cargando datos del sistema...';
    return [
      `📊 *REPORTE KPI EJECUTIVO — ${config.logoText}*`,
      `📅 ${new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' })}`,
      ``,
      `🏭 *PRODUCCIÓN*`,
      `• OTs: ${kpis.produccion.total} total · ✅ ${kpis.produccion.completadas} completadas`,
      `• En proceso: ${kpis.produccion.en_proceso} · ⏳ Pendientes: ${kpis.produccion.pendientes}`,
      ``,
      `📦 *INVENTARIO*`,
      `• ${kpis.inventario.total} materiales · Valor: ${fmtK(kpis.inventario.valor)}`,
      kpis.inventario.bajo_minimo > 0 ? `• ⚠️ Items bajo mínimo: ${kpis.inventario.bajo_minimo}` : `• ✅ Niveles normales`,
      ``,
      `💰 *FINANZAS*`,
      `• Ingresos: ${fmtK(kpis.finanzas.ingresos)} · Gastos: ${fmtK(kpis.finanzas.gastos)}`,
      `• Balance: ${fmtK(kpis.finanzas.balance)}`,
      `• CxC pendiente: ${fmtK(kpis.cxc.total)}${kpis.cxc.vencido > 0 ? ` (${fmtK(kpis.cxc.vencido)} VENCIDO ⚠️)` : ''}`,
      `• CxP pendiente: ${fmtK(kpis.cxp.total)}${kpis.cxp.critico > 0 ? ` (${fmtK(kpis.cxp.critico)} CRÍTICO 🚨)` : ''}`,
      ``,
      `🔬 *CALIDAD*`,
      `• Inspecciones: ${kpis.calidad.inspecciones} · Tasa pase: ${kpis.calidad.tasa_pase}%`,
      kpis.calidad.ncs_abiertas > 0 ? `• ⚠️ NCs abiertas: ${kpis.calidad.ncs_abiertas}` : `• ✅ Sin NCs activas`,
      ``,
      `_Generado automáticamente por ${config.logoText}_`,
      `_Desarrollado por ${config.developerName}_`,
    ].join('\n');
  };

  const handleSendWhatsApp = () => {
    if (!envioForm.whatsapp) { notify('Ingresa un número de WhatsApp', 'error'); return; }
    window.open(whatsappService.generateLink(envioForm.whatsapp, buildMessage()), '_blank');
    notify('WhatsApp abierto con el reporte');
  };

  const handleSendEmail = () => {
    if (!envioForm.email) { notify('Ingresa un correo electrónico', 'error'); return; }
    const subject = encodeURIComponent(`Reporte KPI Ejecutivo — ${config.logoText}`);
    const body = encodeURIComponent(buildMessage().replace(/\*/g, '').replace(/_/g, ''));
    window.open(`mailto:${envioForm.email}?subject=${subject}&body=${body}`, '_blank');
    notify('Cliente de correo abierto');
  };

  const handleSendTeams = () => {
    if (!envioForm.teams) { notify('Ingresa el email del destinatario en Teams', 'error'); return; }
    const msg = encodeURIComponent(buildMessage().replace(/\*/g, '').replace(/_/g, ''));
    window.open(`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(envioForm.teams)}&message=${msg}`, '_blank');
    notify('Teams abierto con el reporte');
  };

  const handleSchedule = async () => {
    if (!envioForm.programarFecha) { notify('Selecciona una fecha', 'error'); return; }
    const frecuenciaMap: Record<string, string> = { manual: 'unica', diario: 'diaria', semanal: 'semanal', mensual: 'mensual' };
    const payload = {
      report_type:  envioForm.reportType,
      email:        envioForm.email || null,
      whatsapp:     envioForm.whatsapp || null,
      teams:        envioForm.teams || null,
      fecha:        envioForm.programarFecha,
      hora:         envioForm.programarHora || '08:00',
      frecuencia:   frecuenciaMap[envioForm.programarFrecuencia] ?? 'unica',
      activo:       true,
    };
    try {
      const { data, error } = await supabase.from('report_schedules').insert(payload).select().single();
      if (error) throw error;
      setScheduled(prev => [...prev, data]);
      notify(`Envío programado · ${payload.fecha} ${payload.hora}`);
    } catch {
      // Fallback to localStorage if table not yet in prod
      const entry = { id: Date.now().toString(), ...payload };
      const next = [...scheduled, entry];
      setScheduled(next);
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(next));
      notify(`Envío programado (local) · ${payload.fecha} ${payload.hora}`);
    }
  };

  const removeScheduled = async (id: string) => {
    try {
      await supabase.from('report_schedules').update({ activo: false }).eq('id', id);
    } catch {
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(scheduled.filter(s => s.id !== id)));
    }
    setScheduled(prev => prev.filter(s => s.id !== id));
  };

  const handleExport = () => {
    if (activeTab === 'kpis' && kpis) {
      reportUtils.exportToPDF(`KPI Ejecutivo ${config.brandName}`, [
        { MÓDULO: 'Producción',  TOTAL: kpis.produccion.total,          COMPLETADAS: kpis.produccion.completadas },
        { MÓDULO: 'Inventario',  MATERIALES: kpis.inventario.total,     VALOR: fmtK(kpis.inventario.valor) },
        { MÓDULO: 'Finanzas',    INGRESOS: fmtK(kpis.finanzas.ingresos), BALANCE: fmtK(kpis.finanzas.balance) },
        { MÓDULO: 'Calidad',     INSPECCIONES: kpis.calidad.inspecciones, TASA: `${kpis.calidad.tasa_pase}%` },
      ], 'kpi_ejecutivo_mcvill', 'REPORTES KPI');
      return;
    }
    const rows = tableData.slice(0, 150).map((item: any) => {
      if (activeTab === 'production') return { OT: item.order_number, PROYECTO: item.project_title || '-', ESTADO: item.status, PROGRESO: `${item.progress||0}%` };
      if (activeTab === 'inventory')  return { MATERIAL: item.name, SKU: item.sku, STOCK: item.stock_quantity, COSTO: `$${Number(item.unit_cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` };
      if (activeTab === 'payroll')    return { EMPLEADO: `${item.employees?.first_name||''} ${item.employees?.last_name||''}`, BRUTO: `$${Number(item.gross_salary || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, NETO: `$${Number(item.net_salary || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` };
      if (activeTab === 'finance')    return { TIPO: item.type, ENTIDAD: item.entity, MONTO: `$${Number(item.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ESTADO: item.status };
      return item;
    });
    const labels: Record<string, string> = { production: 'Producción', inventory: 'Inventario', payroll: 'Nómina', finance: 'Finanzas' };
    reportUtils.exportToPDF(labels[activeTab] || activeTab, rows, `reporte_${activeTab}`, 'REPORTES');
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'kpis',       label: 'KPIs Ejecutivo' },
    { id: 'production', label: 'Producción' },
    { id: 'inventory',  label: 'Inventario' },
    { id: 'payroll',    label: 'Nómina' },
    { id: 'finance',    label: 'Finanzas' },
    { id: 'envio',      label: 'Enviar / Programar' },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {notification && <Toast message={notification.message} type={notification.type} isVisible={!!notification} onClose={() => setNotification(null)} />}

      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-mcvill-accent" size={16} />
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              REPORTES <span className="text-mcvill-accent">& KPIs</span>
            </h2>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest hidden md:block">
            Inteligencia Ejecutiva · Consolidado Multi-Módulo · Envío Automático
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadKPIs} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          {activeTab !== 'envio' && (
            <button onClick={handleExport} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-mcvill-accent hover:opacity-90 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50">
              <Download size={12} strokeWidth={3} /> EXPORTAR PDF
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 flex items-center gap-4 shrink-0 flex-wrap">
        <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5 flex-wrap gap-0.5">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={clsx('px-3 py-1.5 rounded-md transition-all text-[9px] font-black uppercase tracking-widest',
                activeTab === tab.id
                  ? tab.id === 'envio' ? 'bg-emerald-600 text-white' : 'bg-mcvill-accent text-white shadow-lg shadow-mcvill-accent/20'
                  : 'text-slate-500 hover:text-white')}>
              {tab.label}
            </button>
          ))}
        </div>
        {(['production','inventory','payroll','finance'] as Tab[]).includes(activeTab) && (
          <select value={period} onChange={e => setPeriod(e.target.value as PeriodFilter)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none focus:border-mcvill-accent/50">
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="quarter">Último trimestre</option>
            <option value="year">Último año</option>
          </select>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {/* ── KPIs Consolidado ─────────────────────────────────────────────── */}
        {activeTab === 'kpis' && (
          <div className="p-5 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-blue-400" size={28} />
              </div>
            ) : kpis && (
              <>
                <KPISection title="Producción" icon={Factory} color="text-orange-400" bg="bg-orange-500/[0.05]" border="border-orange-500/20">
                  <KPICard label="OTs Totales"  value={kpis.produccion.total}        color="text-white" />
                  <KPICard label="Completadas"  value={kpis.produccion.completadas}   color="text-emerald-400" />
                  <KPICard label="En Proceso"   value={kpis.produccion.en_proceso}    color="text-mcvill-accent" />
                  <KPICard label="Pendientes"   value={kpis.produccion.pendientes}    color="text-amber-400" />
                </KPISection>

                <KPISection title="Inventario" icon={Package} color="text-violet-400" bg="bg-violet-500/[0.05]" border="border-violet-500/20">
                  <KPICard label="Materiales"  value={kpis.inventario.total}                         color="text-white" />
                  <KPICard label="Valor Total" value={fmtK(kpis.inventario.valor)}                   color="text-violet-400" />
                  <KPICard label="Bajo Mínimo" value={kpis.inventario.bajo_minimo}                   color={kpis.inventario.bajo_minimo > 0 ? 'text-rose-400' : 'text-emerald-400'} />
                </KPISection>

                <KPISection title="Finanzas & Tesorería" icon={DollarSign} color="text-emerald-400" bg="bg-emerald-500/[0.05]" border="border-emerald-500/20">
                  <KPICard label="Ingresos"      value={fmtK(kpis.finanzas.ingresos)} color="text-emerald-400" />
                  <KPICard label="Gastos"        value={fmtK(kpis.finanzas.gastos)}   color="text-rose-400" />
                  <KPICard label="Balance"       value={fmtK(kpis.finanzas.balance)}  color={kpis.finanzas.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
                  <KPICard label="CxC Pendiente" value={fmtK(kpis.cxc.total)}         color="text-mcvill-accent" />
                  <KPICard label="CxC Vencido"   value={fmtK(kpis.cxc.vencido)}       color={kpis.cxc.vencido > 0 ? 'text-rose-400' : 'text-slate-500'} />
                  <KPICard label="CxP Crítico"   value={fmtK(kpis.cxp.critico)}       color={kpis.cxp.critico > 0 ? 'text-red-400' : 'text-slate-500'} />
                </KPISection>

                <KPISection title="Calidad SGC" icon={ShieldCheck} color="text-cyan-400" bg="bg-cyan-500/[0.05]" border="border-cyan-500/20">
                  <KPICard label="Inspecciones" value={kpis.calidad.inspecciones}  color="text-white" />
                  <KPICard label="Tasa de Pase" value={`${kpis.calidad.tasa_pase}%`} color={kpis.calidad.tasa_pase >= 95 ? 'text-emerald-400' : kpis.calidad.tasa_pase >= 80 ? 'text-amber-400' : 'text-rose-400'} />
                  <KPICard label="NCs Abiertas" value={kpis.calidad.ncs_abiertas}  color={kpis.calidad.ncs_abiertas > 0 ? 'text-rose-400' : 'text-emerald-400'} />
                </KPISection>

                <KPISection title="Capital Humano" icon={Users} color="text-pink-400" bg="bg-pink-500/[0.05]" border="border-pink-500/20">
                  <KPICard label="Registros Nómina" value={kpis.payroll.registros}  color="text-white" />
                  <KPICard label="Bruto Total"       value={fmtK(kpis.payroll.bruto)} color="text-pink-400" />
                  <KPICard label="Neto Total"        value={fmtK(kpis.payroll.neto)}  color="text-emerald-400" />
                </KPISection>
              </>
            )}
          </div>
        )}

        {/* ── Production ───────────────────────────────────────────────────── */}
        {activeTab === 'production' && (
          <table className="w-full text-left border-collapse">
            <thead><tr className="sticky top-0 bg-slate-900 border-b border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <th className="px-4 py-2">OT</th><th className="px-4 py-2">Proyecto</th>
              <th className="px-4 py-2">Estado</th><th className="px-4 py-2">Progreso</th><th className="px-4 py-2">Fecha</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {tableData.map((item: any, i) => (
                <tr key={i} className="hover:bg-blue-500/5 transition-colors">
                  <td className="px-4 py-1.5 text-[11px] font-black text-white uppercase">{item.order_number}</td>
                  <td className="px-4 py-1.5 text-[10px] text-slate-400">{item.project_title || '—'}</td>
                  <td className="px-4 py-1.5"><span className="text-[9px] font-black text-blue-400 uppercase">{item.status}</span></td>
                  <td className="px-4 py-1.5 text-[11px] font-black text-white">{item.progress || 0}%</td>
                  <td className="px-4 py-1.5 text-[9px] font-mono text-slate-500">{item.created_at ? format(new Date(item.created_at), 'dd/MM/yy') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Inventory ────────────────────────────────────────────────────── */}
        {activeTab === 'inventory' && (
          <table className="w-full text-left border-collapse">
            <thead><tr className="sticky top-0 bg-slate-900 border-b border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <th className="px-4 py-2">Material</th><th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2 text-center">Stock</th><th className="px-4 py-2 text-right">Costo Unit.</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {tableData.map((item: any, i) => (
                <tr key={i} className="hover:bg-blue-500/5 transition-colors">
                  <td className="px-4 py-1.5 text-[11px] font-black text-white">{item.name}</td>
                  <td className="px-4 py-1.5 text-[10px] font-mono text-slate-500 uppercase">{item.sku}</td>
                  <td className={clsx('px-4 py-1.5 text-[11px] font-black text-center', item.min_stock != null && item.stock_quantity <= item.min_stock ? 'text-rose-400' : 'text-white')}>{item.stock_quantity}</td>
                  <td className="px-4 py-1.5 text-[11px] font-black text-emerald-400 text-right">${Number(item.unit_cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Payroll ──────────────────────────────────────────────────────── */}
        {activeTab === 'payroll' && (
          <table className="w-full text-left border-collapse">
            <thead><tr className="sticky top-0 bg-slate-900 border-b border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <th className="px-4 py-2">Empleado</th><th className="px-4 py-2 text-center">Bruto</th>
              <th className="px-4 py-2 text-center">Deducciones</th><th className="px-4 py-2 text-right">Neto</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {tableData.map((item: any, i) => (
                <tr key={i} className="hover:bg-blue-500/5 transition-colors">
                  <td className="px-4 py-1.5 text-[11px] font-black text-white uppercase">{item.employees?.first_name} {item.employees?.last_name}</td>
                  <td className="px-4 py-1.5 text-[11px] font-bold text-slate-300 text-center">${Number(item.gross_salary||0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-1.5 text-[11px] font-bold text-rose-400 text-center">-${Number(item.deductions||0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-1.5 text-[11px] font-black text-emerald-400 text-right">${Number(item.net_salary||0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Finance ──────────────────────────────────────────────────────── */}
        {activeTab === 'finance' && (
          <table className="w-full text-left border-collapse">
            <thead><tr className="sticky top-0 bg-slate-900 border-b border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Entidad</th>
              <th className="px-4 py-2 text-center">Monto</th><th className="px-4 py-2 text-right">Estado</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {tableData.map((item: any, i) => (
                <tr key={i} className="hover:bg-blue-500/5 transition-colors">
                  <td className="px-4 py-1.5">
                    <span className={clsx('px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border',
                      item.type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20')}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-1.5 text-[10px] text-slate-400 uppercase">{item.entity}</td>
                  <td className="px-4 py-1.5 text-[11px] font-black text-white text-center">${Number(item.amount||0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-1.5 text-[9px] font-black uppercase text-slate-600 tracking-widest text-right">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Enviar / Programar ───────────────────────────────────────────── */}
        {activeTab === 'envio' && (
          <div className="p-5 space-y-5 max-w-3xl mx-auto">

            {/* Send now */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Send size={14} className="text-emerald-400" /> Enviar Reporte Ahora
              </h3>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Tipo de Reporte</label>
                <select className="cyber-select w-full" value={envioForm.reportType}
                  onChange={e => setEnvioForm({ ...envioForm, reportType: e.target.value })}>
                  <option value="kpi_ejecutivo">KPI Ejecutivo Consolidado</option>
                  <option value="produccion">Producción & OTs</option>
                  <option value="finanzas">Finanzas & Tesorería</option>
                  <option value="calidad">Calidad SGC</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Mail size={10} /> Email
                  </label>
                  <input className="cyber-input w-full" type="email" placeholder={`gerencia@${config.supportEmail.split('@')[1]}`}
                    value={envioForm.email} onChange={e => setEnvioForm({ ...envioForm, email: e.target.value })} />
                  <button onClick={handleSendEmail}
                    className="w-full py-2 bg-mcvill-accent hover:opacity-90 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5">
                    <Mail size={11} /> Enviar Email
                  </button>
                </div>

                {/* WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <MessageSquare size={10} /> WhatsApp
                  </label>
                  <input className="cyber-input w-full" type="tel" placeholder="+52 81 1234 5678"
                    value={envioForm.whatsapp} onChange={e => setEnvioForm({ ...envioForm, whatsapp: e.target.value })} />
                  <button onClick={handleSendWhatsApp}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5">
                    <MessageSquare size={11} /> Enviar WhatsApp
                  </button>
                </div>

                {/* Teams */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap size={10} /> Teams
                  </label>
                  <input className="cyber-input w-full" type="email" placeholder={`usuario@${config.supportEmail.split('@')[1]}`}
                    value={envioForm.teams} onChange={e => setEnvioForm({ ...envioForm, teams: e.target.value })} />
                  <button onClick={handleSendTeams}
                    className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5">
                    <Zap size={11} /> Compartir Teams
                  </button>
                </div>
              </div>

              {/* Message preview */}
              {kpis && (
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Vista Previa del Mensaje</label>
                  <pre className="bg-black/40 border border-white/5 rounded-lg p-3 text-[9px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto custom-scrollbar">
                    {buildMessage()}
                  </pre>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Bell size={14} className="text-amber-400" /> Programar Envío Automático
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Fecha</label>
                  <input type="date" className="cyber-input w-full" value={envioForm.programarFecha}
                    onChange={e => setEnvioForm({ ...envioForm, programarFecha: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Hora</label>
                  <input type="time" className="cyber-input w-full" value={envioForm.programarHora}
                    onChange={e => setEnvioForm({ ...envioForm, programarHora: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Frecuencia</label>
                  <select className="cyber-select w-full" value={envioForm.programarFrecuencia}
                    onChange={e => setEnvioForm({ ...envioForm, programarFrecuencia: e.target.value as any })}>
                    <option value="manual">Una vez</option>
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={handleSchedule}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5">
                    <Bell size={11} /> Programar
                  </button>
                </div>
              </div>

              {scheduled.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Envíos Programados ({scheduled.length})</p>
                  {scheduled.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-black/30 border border-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock size={12} className="text-amber-400 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-white uppercase">{s.reportType.replace(/_/g,' ')} · {s.fecha} {s.hora}</p>
                          <p className="text-[8px] text-slate-600 uppercase tracking-widest">{s.frecuencia} · {s.email || s.whatsapp || s.teams || 'sin destino'}</p>
                        </div>
                      </div>
                      <button onClick={() => removeScheduled(s.id)} className="p-1 text-slate-600 hover:text-rose-400 transition-all">
                        <AlertTriangle size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsView;
