import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { 
  ShieldAlert, 
  GraduationCap, 
  AlertOctagon, 
  Plus, 
  Search,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  Loader2,
  Settings,
  Trash2
} from 'lucide-react';
import { hseService } from '../services/hseService';
import type { HSECertification, HSECourse, HSEIncident } from '../services/hseService';
import { reportUtils } from '../utils/reportUtils';
import { Toast } from './common/Toast';
import { IncidentModal } from './IncidentModal';
import { HSEFormModal } from './HSEFormModal';
import { useConfig } from '../contexts/ConfigContext';
import { appConfirm } from '../lib/dialogs';

export const HSEView = () => {
  const { isDarkMode } = useConfig();
  const [activeTab, setActiveTab] = useState<'certs' | 'courses' | 'incidents'>('certs');
  const [certs, setCerts] = useState<HSECertification[]>([]);
  const [courses, setCourses] = useState<HSECourse[]>([]);
  const [incidents, setIncidents] = useState<HSEIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isHSEModalOpen, setIsHSEModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<HSEIncident | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'certs') {
        const data = await hseService.getCertifications();
        setCerts(data);
      } else if (activeTab === 'courses') {
        const data = await hseService.getCourses();
        setCourses(data);
      } else {
        const data = await hseService.getIncidents();
        setIncidents(data);
      }
    } catch (error) {
      console.error('Error loading HSE data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    let data: any[] = [];
    let title = "";
    
    if (activeTab === 'certs') {
      data = certs;
      title = "Reporte de Certificaciones HSE Control";
    } else if (activeTab === 'courses') {
      data = courses;
      title = "Catálogo de Cursos y Normativas HSE Control";
    } else {
      data = incidents;
      title = "Bitácora de Incidentes HSE Control";
    }

    reportUtils.exportToPDF(title, data, `reporte_hse_${activeTab}_Control`, "HSE");
  };
  
  const handleAction = (action: string) => {
    if (activeTab === 'incidents') {
      setEditingIncident(null);
      setIsIncidentModalOpen(true);
    } else {
      setIsHSEModalOpen(true);
    }
  };

  const handleEditIncident = (incident: HSEIncident) => {
    setEditingIncident(incident);
    setIsIncidentModalOpen(true);
  };

  const handleDeleteIncident = async (id: string) => {
    if (!await appConfirm('¿ELIMINAR REPORTE DE INCIDENTE? ESTA ACCIÓN ES PERMANENTE.')) return;
    try {
      await hseService.deleteIncident(id);
      loadData();
      setNotification({ message: 'Incidente eliminado del registro', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Error deleting incident:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'expired': return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'pending': return 'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-accent/20';
      default: return isDarkMode ? "bg-slate-950/20 border-mcvill-card-border" : "bg-white border-mcvill-card-border shadow-xl";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'high': return 'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-accent/40';
      case 'medium': return 'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-accent/20';
      default: return 'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-accent/30';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {notification && (
        <Toast 
          message={notification.message}
          type={notification.type}
          isVisible={!!notification}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Header Section — Compact Industrial Style */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-mcvill-accent/10 rounded-xl flex items-center justify-center border border-mcvill-accent/20">
            <ShieldAlert className="text-mcvill-accent" size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              SEGURIDAD, HIGIENE <span className="text-mcvill-accent">& AMBIENTE</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Protocolos HSE · Normativas McVill</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/10 transition-all"
          >
            <Download size={12} /> AUDITORÍA CONTROL
          </button>
          <button 
            onClick={() => handleAction('Nuevo Registro HSE')}
            className="mcvill-btn-create flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <Plus size={12} strokeWidth={3} />
            {activeTab === 'incidents' ? 'REPORTAR INCIDENTE' : 'NUEVO REGISTRO'}
          </button>
        </div>
      </div>

      {/* Stats Quick Matrix — Compact */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3 bg-slate-900/20 shrink-0 border-b border-white/5">
        {[
          { label: 'Días Sin Accidentes', value: '142', icon: CheckCircle2, color: 'text-emerald-500', sub: 'META: 365 DÍAS' },
          { label: 'Cursos Pendientes', value: courses.length, icon: Clock, color: 'text-amber-500', sub: 'PRIORIDAD: ALTA' },
          { label: 'Incidentes 30d', value: incidents.filter(i => new Date(i.incident_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length, icon: AlertOctagon, color: 'text-rose-500', sub: 'SECTOR: MANTTO' },
        ].map((stat, i) => (
          <div key={i} className="px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 group hover:bg-white/[0.04] transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 shrink-0 bg-slate-900 text-slate-500">
              <stat.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className={clsx("text-xl font-black tracking-tighter leading-none", stat.color)}>{stat.value}</p>
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest truncate">{stat.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs & Search — Compact */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/20 flex items-center justify-between shrink-0">
        <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
          {[
            { id: 'certs', label: 'CERTIFICACIONES', icon: GraduationCap },
            { id: 'courses', label: 'CURSOS & NOM', icon: ShieldAlert },
            { id: 'incidents', label: 'INCIDENTES', icon: AlertOctagon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "flex items-center gap-2 px-4 py-1.5 rounded-md transition-all text-[9px] font-black uppercase tracking-widest",
                activeTab === tab.id 
                  ? 'bg-mcvill-accent text-white shadow-lg shadow-mcvill-accent/20' 
                  : 'text-slate-500 hover:text-white'
              )}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md ml-4 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={12} />
          <input 
            type="text" 
            placeholder="Buscar por colaborador, norma o incidente..."
            className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 focus:border-mcvill-accent/50 transition-all outline-none text-white font-bold text-[10px] placeholder:text-slate-700"
          />
        </div>
      </div>

      {/* Main List Area — Compact Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/40 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {activeTab === 'certs' && certs.map((cert) => (
              <div key={cert.id} className="group relative bg-slate-900/40 border border-white/5 rounded-xl p-3 hover:border-rose-500/30 transition-all flex items-center justify-between overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-rose-500/50 transition-colors">
                    <GraduationCap className="text-rose-400" size={14} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-white tracking-tight uppercase">{cert.course_title}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{cert.employee_name}</p>
                      <div className="w-1 h-1 rounded-full bg-white/10" />
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">ID: HSE-{cert.id.slice(0, 5)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 relative z-10 text-right">
                  <div className="hidden sm:block">
                    <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Vencimiento</p>
                    <p className="text-[9px] font-black text-slate-400">{new Date(cert.expiry_date).toLocaleDateString()}</p>
                  </div>
                  <div className={clsx("px-2 py-0.5 rounded-lg border text-[7px] font-black uppercase tracking-widest", getStatusColor(cert.status))}>
                    {cert.status === 'active' ? 'VIGENTE' : cert.status.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}

            {activeTab === 'incidents' && incidents.map((incident) => (
              <div key={incident.id} className="group relative bg-slate-900/40 border border-white/5 rounded-xl p-3 hover:border-rose-500/30 transition-all overflow-hidden xl:col-span-2">
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center border", getSeverityColor(incident.severity))}>
                      <AlertOctagon size={14} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-white tracking-tight uppercase">{incident.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest">{incident.location}</p>
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest">{new Date(incident.incident_date).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={clsx("px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest", getSeverityColor(incident.severity))}>
                      {incident.severity === 'critical' ? 'CRÍTICO' : 
                       incident.severity === 'high' ? 'ALTO' : 
                       incident.severity === 'medium' ? 'MEDIO' : 'BAJO'}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditIncident(incident)} className="p-1.5 bg-black/40 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><Settings size={12} /></button>
                      <button onClick={() => handleDeleteIncident(incident.id)} className="p-1.5 bg-black/40 border border-white/10 rounded-lg text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
                <div className="mt-2 pl-11">
                  <p className="text-slate-400 text-[10px] font-medium leading-relaxed max-w-4xl italic">
                    {incident.description}
                  </p>
                </div>
              </div>
            ))}

            {activeTab === 'courses' && courses.map((course) => (
              <div key={course.id} className="group relative bg-slate-900/40 border border-white/5 rounded-xl p-3 hover:border-rose-500/30 transition-all flex items-center justify-between overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-rose-500/50 transition-colors">
                    <ShieldAlert className="text-rose-400" size={16} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-white tracking-tight uppercase">{course.title}</h4>
                    <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mt-0.5">{course.category} • {course.duration_hours}H DURACIÓN</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="text-right hidden sm:block">
                    <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Validez</p>
                    <p className="text-[9px] font-black text-slate-400">{course.validity_months} MESES</p>
                  </div>
                  <button onClick={() => handleAction(`Programación: ${course.title}`)} className="p-2 bg-black/40 border border-white/10 rounded-lg text-rose-400 hover:bg-rose-600 hover:text-white transition-all">
                    <Calendar size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <IncidentModal 
        isOpen={isIncidentModalOpen}
        onClose={() => {
          setIsIncidentModalOpen(false);
          setEditingIncident(null);
        }}
        onSuccess={loadData}
        editingIncident={editingIncident}
      />

      <HSEFormModal 
        isOpen={isHSEModalOpen}
        onClose={() => setIsHSEModalOpen(false)}
        type={activeTab === 'certs' ? 'certs' : 'courses'}
        onSuccess={loadData}
      />
    </div>
  );
};
