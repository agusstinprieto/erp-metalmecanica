import React, { useState, useEffect } from 'react';
import { 
  Hammer, Settings, Play, CheckCircle2, Clock, 
  AlertTriangle, Search, Plus, Filter, Activity,
  User, Calendar, Loader2, X, ChevronRight, 
  ClipboardList, FileText, Edit3, Trash2, Zap, 
  BarChart3, Scan, ArrowLeft, Factory, TrendingUp
} from 'lucide-react';
import { productionService } from '../services/productionService';
import type { WorkOrder } from '../services/productionService';
import { engineeringService } from '../services/engineeringService';
import { reportUtils } from '../utils/reportUtils';
import clsx from 'clsx';
import { useSearch } from '../contexts/SearchContext';
import { useConfig } from '../contexts/ConfigContext';
import { appConfirm } from '../lib/dialogs';
import { ShopFloorTracking } from './ShopFloorTracking';
import { ProductionDashboard } from './ProductionDashboard';

export const ProductionView: React.FC = () => {
  const { isDarkMode } = useConfig();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { searchTerm, setSearchTerm } = useSearch();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    priority: 'medium' as WorkOrder['priority'],
    due_date: '',
    assigned_to: ''
  });
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [view, setView] = useState<'list' | 'tracking' | 'dashboard'>('list');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orders, engProjects] = await Promise.all([
        productionService.getWorkOrders(),
        engineeringService.getProjects()
      ]);
      setWorkOrders(orders);
      setProjects(engProjects);
    } catch (error) {
      console.error('Error loading production data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingOrder) {
        await productionService.updateWorkOrder(editingOrder.id, formData);
      } else {
        await productionService.createWorkOrder({
          ...formData,
          status: 'pending',
          progress: 0
        });
      }
      setShowModal(false);
      setEditingOrder(null);
      loadData();
      setFormData({ project_id: '', priority: 'medium', due_date: '', assigned_to: '' });
    } catch (error) {
      console.error('Error saving work order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (order: WorkOrder) => {
    setEditingOrder(order);
    setFormData({
      project_id: order.project_id,
      priority: order.priority,
      due_date: order.due_date || '',
      assigned_to: order.assigned_to || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (await appConfirm('¿Está seguro de que desea eliminar esta orden de trabajo?')) {
      try {
        await productionService.deleteWorkOrder(id);
        loadData();
      } catch (error) {
        console.error('Error deleting work order:', error);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'high': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'medium': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-emerald-500" size={14} />;
      case 'in_progress': return <Play className="text-blue-500 animate-pulse" size={14} />;
      case 'on_hold': return <AlertTriangle className="text-amber-500" size={14} />;
      default: return <Clock className="text-slate-400" size={14} />;
    }
  };

  const filteredOrders = workOrders.filter(wo => 
    wo.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wo.project_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{title}</span>
        <div className={clsx("p-1.5 rounded-lg bg-white/5", color)}>
          <Icon size={12} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-xl font-black text-white tracking-tighter">{value}</span>
        {trend && (
          <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            +{trend}%
          </span>
        )}
      </div>
    </div>
  );

  if (view === 'tracking') return <ShopFloorTracking onBack={() => setView('list')} />;
  if (view === 'dashboard') return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <button onClick={() => setView('list')} className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all"><ArrowLeft size={16} /></button>
        <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">ANÁLISIS DE PLANTA</h2>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <ProductionDashboard />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header Panel — Compact & Standardized */}
      <div className="px-6 py-4 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <Factory className="text-blue-500" size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              PLANIFICACIÓN DE <span className="text-blue-500">PRODUCCIÓN</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Programa Maestro de Planta · Manufactura v2.5</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
            <BarChart3 size={13} /> Dashboard
          </button>
          <button onClick={() => setView('tracking')} className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
            <Scan size={13} className="animate-pulse" /> Terminal Piso
          </button>
          <div className="w-px h-6 bg-white/10 mx-2" />
          <button onClick={() => setShowModal(true)} className="mcvill-btn-create flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20">
            <Plus size={13} /> Nueva Orden
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        
        {/* Compact KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <StatCard title="OEE Global" value="84.2%" icon={Activity} color="text-indigo-400" trend={2.4} />
          <StatCard title="Cola de Carga" value={`${workOrders.filter(wo => wo.status === 'pending').length} OTs`} icon={Clock} color="text-amber-400" />
          <StatCard title="ISO Yield" value="99.2%" icon={CheckCircle2} color="text-emerald-400" />
          <StatCard title="Efficiency" value="91.5%" icon={TrendingUp} color="text-blue-400" trend={1.2} />
        </div>

        {/* Table Container */}
        <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[20px] overflow-hidden flex flex-col backdrop-blur-xl">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <ClipboardList className="text-slate-500" size={16} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tablero Operativo</span>
            </div>
            <div className="relative group w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="BUSCAR OT, PROYECTO..."
                className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 pl-10 pr-3 text-[10px] font-bold text-white outline-none focus:border-blue-500/40 transition-all placeholder:text-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01] sticky top-0 z-10 backdrop-blur-md">
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">ID / Registro</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Proyecto / Cliente</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Estado</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Prioridad</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Progreso</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-mcvill-accent" size={24} />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sincronizando Planta...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Sin órdenes de trabajo</p>
                    <p className="text-[9px] text-slate-700 mt-1">Crea una nueva orden usando el botón superior</p>
                  </td></tr>
                ) : filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-blue-600/5 transition-all group border-l-2 border-transparent hover:border-l-blue-500">
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-white font-mono group-hover:text-blue-400 transition-colors">{order.order_number}</span>
                        <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase group-hover:translate-x-1 transition-transform">{order.project_title || 'OP. GENERALES'}</span>
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{order.assigned_to || 'SIN ASIGNAR'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-2">
                        {getStatusIcon(order.status)}
                        <span className="text-[8px] font-black text-slate-500 uppercase">
                          {order.status === 'pending' ? 'PEND' : 
                           order.status === 'in_progress' ? 'PROCESO' :
                           order.status === 'on_hold' ? 'ESPERA' :
                           order.status === 'quality_check' ? 'QA' : 'COMP'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        getPriorityColor(order.priority)
                      )}>
                        {order.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-400 min-w-[30px]">{order.progress}%</span>
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" style={{ width: `${order.progress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <button onClick={() => handleEdit(order)} className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-lg transition-all"><Edit3 size={12} /></button>
                        <button onClick={() => handleDelete(order.id)} className="p-1.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-all"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nueva OT — High Density Style */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[#0a1120] border border-white/10 rounded-[30px] overflow-hidden shadow-2xl relative">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                  {editingOrder ? 'EDITAR' : 'NUEVA'} <span className="text-blue-500">ORDEN</span>
                </h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">SISTEMA DE CONTROL v4.0</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCreateOrder} className="p-8 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Proyecto Vinculado</label>
                  <select required className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-[11px] text-white font-bold outline-none focus:border-blue-500/40 transition-all" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})}>
                    <option value="">SELECCIONAR PROYECTO...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Prioridad</label>
                    <select className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-[11px] text-white font-bold outline-none focus:border-blue-500/40 transition-all" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
                      <option value="low">BAJA</option>
                      <option value="medium">MEDIA</option>
                      <option value="high">ALTA</option>
                      <option value="urgent">URGENTE</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Deadline</label>
                    <input required type="date" className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-[11px] text-white font-bold outline-none focus:border-blue-500/40 transition-all" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} style={{ colorScheme: 'dark' }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Responsable Técnico</label>
                  <input type="text" className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-[11px] text-white font-bold outline-none focus:border-blue-500/40 transition-all uppercase" placeholder="NOMBRE DEL INGENIERO" value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value.toUpperCase()})} />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : (editingOrder ? 'GUARDAR' : 'LANZAR')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
