import React, { useState, useEffect } from 'react';
import {
  Cog, Search, Plus, Rocket, FileCode, Layers, Cpu,
  Loader2, X, ArrowRight, FileText, Settings, CheckCircle2,
  Clock, Archive, GitBranch, ShieldAlert, RefreshCw, Trash2
} from 'lucide-react';
import { engineeringService } from '../services/engineeringService';
import { EngineeringDetailView } from './EngineeringDetailView';
import { reportUtils } from '../utils/reportUtils';
import clsx from 'clsx';
import { useConfig } from '../contexts/ConfigContext';
import { appConfirm, toast } from '../lib/dialogs';
import { FactibilidadGatekeeper } from './FactibilidadGatekeeper';
import { MetalQuoterView } from './MetalQuoterView';
import NestingView from './NestingView';
import { Scissors, DollarSign, Zap } from 'lucide-react';
import { TarifasTab } from './SettingsView';

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  draft:       { label: 'Borrador',    cls: 'bg-slate-700/50 text-slate-400 border-white/5',         icon: FileCode },
  in_progress: { label: 'En progreso', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',       icon: Clock },
  completed:   { label: 'Completado',  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  archived:    { label: 'Archivado',   cls: 'bg-slate-800/50 text-slate-500 border-white/5',         icon: Archive },
};

export const EngineeringView: React.FC = () => {
  const { isDarkMode } = useConfig();
  const [activeTab, setActiveTab] = useState<'proyectos' | 'factibilidad' | 'cotizacion' | 'nesting' | 'tarifas'>('proyectos');
  const [projects, setProjects]           = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject]       = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'in_progress' as 'draft' | 'in_progress' | 'completed' | 'archived',
    version: '1.0.0',
    metadata: {},
  });

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await engineeringService.getProjects();
      setProjects(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', status: 'in_progress', version: '1.0.0', metadata: {} });
    setEditingProject(null);
  };

  const openNew = () => { resetForm(); setShowModal(true); };

  const openEdit = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || '',
      status: project.status,
      version: project.version || '1.0.0',
      metadata: project.metadata || {},
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!await appConfirm('¿Eliminar este proyecto?')) return;
    try {
      await engineeringService.deleteProject(id);
      loadProjects();
      toast('Proyecto eliminado', 'success');
    } catch (e) { console.error(e); toast('Error al eliminar el proyecto', 'error'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingProject) {
        await engineeringService.updateProject(editingProject.id, formData);
        toast('Proyecto actualizado', 'success');
      } else {
        await engineeringService.createProject(formData);
        toast('Proyecto creado', 'success');
      }
      setShowModal(false);
      resetForm();
      loadProjects();
    } catch (e) { console.error(e); toast('Error al guardar el proyecto — intenta de nuevo', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const filtered = projects.filter(p =>
    !search ||
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const kpis = [
    { label: 'Proyectos totales', value: projects.length, icon: Rocket, cls: 'text-blue-400' },
    { label: 'En progreso', value: projects.filter(p => p.status === 'in_progress').length, icon: Clock, cls: 'text-amber-400' },
    { label: 'Completados', value: projects.filter(p => p.status === 'completed').length, icon: CheckCircle2, cls: 'text-emerald-400' },
  ];

  if (selectedProjectId) {
    return <EngineeringDetailView projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />;
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Header Panel */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <Cog size={20} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              INGENIERÍA <span className="text-blue-500">& DISEÑO TÉCNICO</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Protocolo de Ingeniería v6.2</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest text-right">
            PROJECTS_ACTIVE: <span className="text-blue-400">{projects.length}</span>
          </div>
          <button onClick={loadProjects} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-20">
        {/* Main Header Branding */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 rounded-xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-xl relative overflow-hidden group shrink-0">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-[1px] w-8 bg-blue-500" />
              <p className="text-blue-500 text-[8px] font-black tracking-[0.4em] uppercase">Protocolo Ingeniería v6.2</p>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase">
              GESTIÓN DE <span className="text-blue-500 glow-text">DESARROLLO</span>
            </h2>
          </div>
          <div className="flex gap-2 relative z-10">
            <button onClick={openNew} className="h-8 px-4 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]">
              <Plus size={12} /> NUEVO PROYECTO
            </button>
          </div>
        </div>

        {/* Tabs Control */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <button
            onClick={() => setActiveTab('factibilidad')}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
              activeTab === 'factibilidad' ? "bg-indigo-600/20 border-indigo-500 text-indigo-400" : "bg-white/5 border-white/10 text-slate-500"
            )}
          >
            <ShieldAlert size={11} /> FACTIBILIDAD
          </button>
          <button
            onClick={() => setActiveTab('proyectos')}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
              activeTab === 'proyectos' ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-slate-500"
            )}
          >
            <Cog size={11} /> PROYECTOS ACTIVOS
          </button>
          <button
            onClick={() => setActiveTab('cotizacion')}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
              activeTab === 'cotizacion' ? "bg-emerald-600/20 border-emerald-500 text-emerald-400" : "bg-white/5 border-white/10 text-slate-500"
            )}
          >
            <DollarSign size={11} /> COTIZADOR VISUAL
          </button>
          <button
            onClick={() => setActiveTab('nesting')}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
              activeTab === 'nesting' ? "bg-amber-600/20 border-amber-500 text-amber-400" : "bg-white/5 border-white/10 text-slate-500"
            )}
          >
            <Scissors size={11} /> OPTIMIZADOR NESTING
          </button>
          <button
            onClick={() => setActiveTab('tarifas')}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
              activeTab === 'tarifas' ? "bg-orange-600/20 border-orange-500 text-orange-400" : "bg-white/5 border-white/10 text-slate-500"
            )}
          >
            <Zap size={11} /> TARIFARIO
          </button>
        </div>

        {activeTab === 'tarifas' ? (
          <TarifasTab />
        ) : activeTab === 'factibilidad' ? (
          <FactibilidadGatekeeper />
        ) : activeTab === 'cotizacion' ? (
          <MetalQuoterView />
        ) : activeTab === 'nesting' ? (
          <NestingView />
        ) : (
          <div className="space-y-4">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {kpis.map((k, i) => (
                <div key={i} className="bg-slate-900/40 border border-white/5 p-3 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <k.icon size={12} className={k.cls} />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{k.label}</span>
                  </div>
                  <p className="text-xl font-black text-white">{k.value}</p>
                </div>
              ))}
            </div>

            {/* Project Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(p => {
                const st = STATUS[p.status] || STATUS.draft;
                const Icon = st.icon;
                return (
                  <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-slate-900/60 border border-white/5 p-3 rounded-xl cursor-pointer hover:border-blue-500/40 transition-all group relative">
                    <div className="flex justify-between items-start mb-2">
                      <span className={clsx("text-[7px] font-black px-1.5 py-0.5 rounded border uppercase", st.cls)}>
                        {st.label}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => openEdit(p, e)} className="p-1 rounded hover:bg-blue-500/10 hover:text-blue-400 transition-colors"><Settings size={10} /></button>
                        <button onClick={e => handleDelete(p.id, e)} className="p-1 rounded hover:bg-rose-500/10 hover:text-rose-400 transition-colors"><Trash2 size={10} /></button>
                      </div>
                    </div>
                    <h4 className="text-[10px] font-black text-white uppercase line-clamp-1 mb-1">{p.title}</h4>
                    <p className="text-[9px] text-slate-500 line-clamp-2 h-6 mb-2">{p.description || 'Sin descripción.'}</p>
                    <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-auto">
                      <span className="text-[8px] font-mono text-slate-600">v{p.version}</span>
                      <ArrowRight size={10} className="text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 lg:p-8 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl my-auto">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase">{editingProject ? 'EDITAR' : 'NUEVO'} PROYECTO</h3>
              <button onClick={() => setShowModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <input 
                required placeholder="TÍTULO" 
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full bg-black/40 border border-white/5 rounded-lg h-9 px-3 text-[10px] text-white" 
              />
              <textarea 
                placeholder="DESCRIPCIÓN" rows={3}
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-black/40 border border-white/5 rounded-lg p-3 text-[10px] text-white resize-none" 
              />
              <div className="flex gap-3">
                <select 
                  className="flex-1 bg-black/40 border border-white/5 rounded-lg h-9 px-3 text-[10px] text-white"
                  value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                  <option value="draft">Borrador</option>
                  <option value="in_progress">En progreso</option>
                  <option value="completed">Completado</option>
                </select>
                <input 
                  placeholder="VERSIÓN" 
                  value={formData.version} onChange={e => setFormData({...formData, version: e.target.value})}
                  className="w-32 bg-black/40 border border-white/5 rounded-lg h-9 px-3 text-[10px] text-white font-mono" 
                />
              </div>
              <button type="submit" className="w-full py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg">
                {isSubmitting ? 'PROCESANDO...' : 'EJECUTAR'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EngineeringView;
