import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Settings,
  Activity,
  AlertTriangle,
  Clock,
  FileText,
  Plus,
  ShieldCheck,
  Zap,
  Loader2,
  Trash2,
  DollarSign
} from 'lucide-react';
import clsx from 'clsx';
import { reportUtils } from '../utils/reportUtils';
import { maintenanceService } from '../services/maintenanceService';
import type { Machine } from '../services/maintenanceService';
import { eventBus } from '../utils/eventBus';
import { FormulaPanel, FORMULAS } from './common/FormulaPanel';
import { MachineFormModal } from './MachineFormModal';
import { MaintenanceAIModal } from './MaintenanceAIModal';
import { useSearch } from '../contexts/SearchContext';
import { appConfirm } from '../lib/dialogs';
import { PrintButton } from './common/PrintButton';

export const MaintenanceView = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { searchTerm } = useSearch();

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const data = await maintenanceService.listMachines();
      setMachines(data);
    } catch (err) {
      console.error('Error fetching machines:', err);
      setLoadError('Error al cargar activos.');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    fetchMachines();
  }, []);

  const handleDownloadReport = () => {
    reportUtils.exportToPDF(
      "Estado de Salud y Protocolos de Mantenimiento de Activos",
      machines.map(m => ({
        ID: m.id,
        ACTIVO: m.name,
        STATUS: m.status.toUpperCase(),
        SALUD: `${m.health}%`,
        USO_HRS: m.usage,
        COSTO: m.cost ? `$${m.cost.toLocaleString()}` : 'N/A',
        GARANTIA: m.warranty_expiration || 'N/A',
        PROX_MTTO: m.next_maintenance
      })),
      "reporte_mantenimiento",
      "MANTENIMIENTO INDUSTRIAL"
    );
  };

  const handleAgendarServicio = (machineName: string) => {
    eventBus.emit('SHOW_NOTIFICATION', {
      type: 'info',
      title: 'Servicio programado',
      message: `Asignando técnico para mantenimiento de: ${machineName}`
    });
  };

  const handleDelete = async (id: string) => {
    if (!await appConfirm('¿Seguro que deseas eliminar este activo del sistema?')) return;
    try {
      await maintenanceService.deleteMachine(id);
      fetchMachines();
    } catch (err) {
      console.error('Error deleting machine:', err);
      setLoadError('Error al eliminar el activo.');
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-card-border';
      case 'warning': return 'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-accent/20';
      case 'maintenance': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-mcvill-text-muted bg-mcvill-text-muted/10 border-mcvill-card-border';
    }
  };

  const filteredMachines = machines.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {loadError && <div className="mx-4 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] font-bold">{loadError}</div>}
      {/* Header — Agus Pro Standard */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <Wrench className="text-blue-500" size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              MANTENIMIENTO <span className="text-blue-500">INDUSTRIAL</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Activos Críticos · Protocolos IOT · NOM-STPS</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <FileText size={12} /> REPORTE
          </button>
          <button 
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <Zap size={12} className="animate-pulse" /> ANÁLISIS IA
          </button>
          <button
            onClick={() => { setEditingMachine(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            <Plus size={12} strokeWidth={3} /> VINCULAR ACTIVO
          </button>
          <PrintButton />
        </div>
      </div>

      {/* Formula Panel — Mantenimiento */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 shrink-0">
        <FormulaPanel formulas={FORMULAS.mantenimiento} variant="amber" label="Fórmulas Mantenimiento" />
      </div>

      {/* Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'DISPONIBILIDAD', value: '94.2%', sub: 'Target 92%', icon: Activity, color: 'text-emerald-500' },
          { label: 'VALOR DE ACTIVOS', value: `$${machines.reduce((acc, m) => acc + (m.cost || 0), 0).toLocaleString()}`, sub: 'Capex Activos', icon: DollarSign, color: 'text-mcvill-accent' },
          { label: 'MTTR PROMEDIO', value: '4.2H', sub: 'Tiempo Respuesta', icon: Clock, color: 'text-indigo-500' },
          { label: 'ACTIVOS EN ALERTA', value: machines.filter(m => m.status !== 'operational').length.toString().padStart(2, '0'), sub: 'Críticos Hoy', icon: AlertTriangle, color: 'text-rose-500' },
        ].map((stat, i) => (
          <div key={i} className="cyber-panel p-6 bg-[var(--mcvill-card)]/40 border-mcvill-card-border rounded-2xl group relative overflow-hidden transition-all duration-500">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
              <stat.icon size={60} />
            </div>
            <div className="flex flex-col gap-4">
              <div className={clsx("w-10 h-10 rounded-2xl flex items-center justify-center border border-mcvill-card-border bg-[var(--mcvill-bg)]", stat.color)}>
                <stat.icon size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-mcvill-text-muted uppercase tracking-[0.3em] mb-1">{stat.label}</p>
                <p className={clsx("text-2xl font-black tracking-tighter", stat.color)}>{stat.value}</p>
                <p className="text-[9px] font-black text-mcvill-text-muted uppercase tracking-widest mt-1">{stat.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Machines Visualizer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="w-12 h-12 text-mcvill-accent animate-spin mx-auto mb-4" role="status" aria-label="Cargando" />
            <p className="text-[10px] font-black text-mcvill-text-muted uppercase tracking-[0.4em]">Sincronizando Activos Industriales...</p>
          </div>
        ) : filteredMachines.map((machine) => (
          <div key={machine.id} className="cyber-panel p-8 bg-[var(--mcvill-card)]/40 border-mcvill-card-border rounded-2xl transition-all duration-700 group relative overflow-hidden hover:border-mcvill-accent/40">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-mcvill-accent/5 rounded-full blur-[60px] group-hover:bg-mcvill-accent/10 transition-colors" />
            
            <div className="flex justify-between items-start mb-10">
              <div className="w-16 h-16 rounded-2xl bg-[var(--mcvill-bg)] flex items-center justify-center border border-mcvill-card-border group-hover:border-mcvill-accent/40 transition-all shadow-2xl relative">
                <div className="absolute inset-0 bg-mcvill-accent/5 animate-pulse rounded-2xl" />
                <Wrench className="text-mcvill-accent group-hover:scale-110 transition-transform duration-500" size={28} />
              </div>
              <div className="flex gap-2">
                <div className={clsx(
                  "px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                  getStatusColor(machine.status)
                )}>
                  {machine.status === 'operational' ? 'OPERATIVO' : machine.status === 'warning' ? 'ALERTA' : 'FUERA DE SERVICIO'}
                </div>
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => handleEdit(machine)}
                    className="p-2 bg-[var(--mcvill-bg)] border border-mcvill-card-border rounded-2xl text-mcvill-text-muted hover:text-mcvill-accent transition-colors"
                  >
                    <Settings size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(machine.id)}
                    className="p-2 bg-[var(--mcvill-bg)] border border-mcvill-card-border rounded-2xl text-mcvill-text-muted hover:text-mcvill-accent transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-black text-[var(--mcvill-text)] tracking-tight uppercase group-hover:text-mcvill-accent transition-colors duration-500 leading-none mb-2">{machine.name}</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-black text-mcvill-text-muted font-mono tracking-widest uppercase">ID: {machine.id.substring(0, 8)}</span>
                  {machine.critical && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">CRÍTICO</span>
                    </div>
                  )}
                  {machine.warranty_expiration && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={12} className="text-emerald-500" />
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Garantía OK</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="bg-[var(--mcvill-bg)]/60 p-5 rounded-2xl border border-mcvill-card-border group-hover:border-mcvill-card-border transition-colors">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.2em] text-mcvill-text-muted mb-3">
                    <span>Salud Integral del Activo</span>
                    <span className={clsx("font-black", machine.health < 60 ? 'text-rose-500' : 'text-emerald-500')}>{machine.health}%</span>
                  </div>
                  <div className="h-2 bg-[var(--mcvill-bg)] rounded-full overflow-hidden shadow-inner p-0.5">
                    <div 
                      className={clsx(
                        "h-full rounded-full transition-all duration-1000",
                        machine.health < 60 ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      )}
                      style={{ width: `${machine.health}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[var(--mcvill-bg)]/40 rounded-2xl border border-mcvill-card-border group-hover:bg-[var(--mcvill-bg)] transition-colors">
                    <p className="text-[9px] font-black text-mcvill-text-muted uppercase tracking-[0.3em] mb-2">Refacciones</p>
                    <p className="text-lg font-black text-[var(--mcvill-text)] tracking-tighter">{machine.spare_parts?.length || 0}<span className="text-[10px] text-mcvill-text-muted ml-1 uppercase">ITEMS</span></p>
                  </div>
                  <div className="p-4 bg-[var(--mcvill-bg)]/40 rounded-2xl border border-mcvill-card-border group-hover:bg-[var(--mcvill-bg)] transition-colors">
                    <p className="text-[9px] font-black text-mcvill-text-muted uppercase tracking-[0.3em] mb-2">Próximo Protocolo</p>
                    <p className="text-lg font-black text-mcvill-accent tracking-tighter uppercase">{machine.next_maintenance ? new Date(machine.next_maintenance).toLocaleDateString('es-ES', {month:'short', day:'numeric'}) : '—'}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleAgendarServicio(machine.name)}
                  className="flex-1 h-[60px] bg-mcvill-accent/10 border border-mcvill-accent/20 rounded-2xl flex items-center justify-center gap-3 text-mcvill-accent hover:bg-mcvill-accent hover:text-slate-950 transition-all"
                >
                  <Zap size={18} />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Protocolo MTTO</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Machine Node */}
        <div 
        className="cyber-panel p-8 bg-[var(--mcvill-card)]/10 border-dashed border-mcvill-card-border hover:border-mcvill-accent/30 transition-all duration-700 flex flex-col items-center justify-center text-center group cursor-pointer min-h-[400px]"
      >
          <div className="w-20 h-20 rounded-2xl bg-[var(--mcvill-bg)] border border-mcvill-card-border flex items-center justify-center text-mcvill-text-muted group-hover:text-mcvill-accent group-hover:border-mcvill-accent/40 transition-all duration-700 mb-6 group-hover:scale-110">
            <Plus size={40} />
          </div>
          <h3 className="text-sm font-black text-mcvill-text-muted uppercase tracking-[0.4em] group-hover:text-[var(--mcvill-text)] transition-colors">Vincular Nodo Adicional</h3>
          <p className="text-[10px] font-bold text-mcvill-text-muted uppercase tracking-widest mt-2 px-10">Expandir infraestructura de monitoreo industrial Control</p>
        </div>
      </div>

      {/* Machine Form Modal */}
      {showModal && (
        <MachineFormModal 
          onClose={() => {
            setShowModal(false);
            setEditingMachine(null);
          }}
          onMachineSaved={fetchMachines}
          editingMachine={editingMachine}
        />
      )}

      {/* AI Scanner Modal */}
      {showAIModal && (
        <MaintenanceAIModal 
          onClose={() => setShowAIModal(false)}
          onMachineAdded={fetchMachines}
        />
      )}
    </div>
  );
};

export default MaintenanceView;
