import React, { useState, useEffect } from 'react';
import {
  Calculator,
  TrendingUp,
  Layers,
  Trash2,
  Download,
  X,
  Zap
} from 'lucide-react';
import { toast, appConfirm } from '../lib/dialogs';
import clsx from 'clsx';
import { costingService } from '../services/costingService';
import type { CostingSimulation } from '../services/costingService';
import { eventBus } from '../utils/eventBus';
import { reportUtils } from '../utils/reportUtils';
import { payrollService } from '../services/payrollService';
import { productionService } from '../services/productionService';
import { useConfig } from '../contexts/ConfigContext';
import { CotizadorExpress } from './CotizadorExpress';
import { FormulaPanel, FORMULAS } from './common/FormulaPanel';
import { formatMoneyInput, parseFormattedNumber } from '../utils/inputFormatters';

export const CostingView: React.FC = () => {
  const { isDarkMode } = useConfig();
  const [activeTab, setActiveTab] = useState<'express' | 'detallado'>('express');
  const [simulations, setSimulations] = useState<CostingSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Calculator State
  const [projectName, setProjectName] = useState('');
  const [matCost, setMatCost] = useState(0);
  const [labCost, setLabCost] = useState(0);
  const [matCostStr, setMatCostStr] = useState('0');
  const [labCostStr, setLabCostStr] = useState('0');
  const [overhead, setOverhead] = useState(15);
  const [margin, setMargin] = useState(30);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sync string states with numeric states when they are updated programmatically
  useEffect(() => {
    const parsed = parseFormattedNumber(matCostStr);
    if (parsed !== matCost) {
      setMatCostStr(formatMoneyInput(matCost));
    }
  }, [matCost]);

  useEffect(() => {
    const parsed = parseFormattedNumber(labCostStr);
    if (parsed !== labCost) {
      setLabCostStr(formatMoneyInput(labCost));
    }
  }, [labCost]);


  const calculateTotals = () => {
    const subtotal = matCost + labCost;
    const overheadAmt = subtotal * (overhead / 100);
    const totalCost = subtotal + overheadAmt;
    const clampedMargin = Math.min(Math.max(margin, 0), 99);
    const denominator = 1 - (clampedMargin / 100);
    const suggestedPrice = totalCost / denominator;
    return { totalCost, suggestedPrice, profit: suggestedPrice - totalCost };
  };

  const { totalCost, suggestedPrice, profit } = calculateTotals();

  const fetchSimulations = async () => {
    try {
      setLoading(true);
      const data = await costingService.listSimulations();
      setSimulations(data);
    } catch (err) {
      console.error('Error loading simulations:', err);
      toast('No se pudieron cargar las simulaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!projectName) return toast('Ingresa un nombre de proyecto', 'error');
    if (margin >= 100) return toast('El margen debe ser menor a 100%', 'error');
    try {
      const payload = {
        project_name: projectName,
        material_cost: matCost,
        labor_cost: labCost,
        overhead_pct: overhead,
        profit_margin_pct: margin,
        total_cost: totalCost,
        suggested_price: suggestedPrice,
        status: 'draft' as const
      };

      if (editingId) {
        await costingService.updateSimulation(editingId, payload);
      } else {
        await costingService.saveSimulation(payload);
      }
      
      toast(editingId ? 'Simulación Actualizada' : 'Simulación Guardada', 'success');
      fetchSimulations();
      setProjectName('');
      setMatCost(0);
      setLabCost(0);
      setEditingId(null);
    } catch (err) {
      console.error('Error saving:', err);
      toast('No se pudo guardar la simulación', 'error');
    }
  };

  const handleEdit = (sim: CostingSimulation) => {
    setEditingId(sim.id);
    setProjectName(sim.project_name);
    setMatCost(Number(sim.material_cost));
    setLabCost(Number(sim.labor_cost));
    setOverhead(Number(sim.overhead_pct));
    setMargin(Number(sim.profit_margin_pct));
  };

  const handleDelete = async (id: string) => {
    if (!await appConfirm('¿Seguro que deseas eliminar esta simulación?')) return;
    try {
      await costingService.deleteSimulation(id);
      fetchSimulations();
    } catch (err) {
      console.error('Error deleting:', err);
      toast('No se pudo eliminar la simulación', 'error');
    }
  };

  const handleExport = (sim: CostingSimulation) => {
    reportUtils.exportToPDF(
      `Análisis de Costos: ${sim.project_name}`,
      [{
        PROYECTO: sim.project_name,
        MATERIALES: `$${Number(sim.material_cost).toLocaleString()}`,
        MANO_OBRA: `$${Number(sim.labor_cost).toLocaleString()}`,
        OVERHEAD: `${sim.overhead_pct}%`,
        MARGEN: `${sim.profit_margin_pct}%`,
        COSTO_TOTAL: `$${Number(sim.total_cost).toLocaleString()}`,
        PRECIO_VENTA: `$${Number(sim.suggested_price).toLocaleString()}`,
      }],
      `costeo_${sim.id.slice(0,8)}`,
      "FINANZAS"
    );
  };

  useEffect(() => {
    fetchSimulations();
  }, []);

  // Labor Cost Modal State
  const [showLaborModal, setShowLaborModal] = useState(false);
  const [laborProjects, setLaborProjects] = useState<any[]>([]);
  const [selectedLaborProject, setSelectedLaborProject] = useState<string>('');
  const [laborCostData, setLaborCostData] = useState<any>(null);
  const [loadingLabor, setLoadingLabor] = useState(false);

  const handleOpenLaborCost = async () => {
    try {
      setLoadingLabor(true);
      const orders = await productionService.getWorkOrders();
      const projectIds = [...new Set(orders.map((o: any) => o.project_id).filter(Boolean))];
      setLaborProjects(projectIds);
      setShowLaborModal(true);
    } catch (err) {
      console.error('Error loading projects:', err);
      toast('No se pudieron cargar los proyectos', 'error');
    } finally {
      setLoadingLabor(false);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    if (!projectId) return;
    setSelectedLaborProject(projectId);
    try {
      setLoadingLabor(true);
      const costData = await payrollService.getLaborCostByProject(projectId);
      setLaborCostData(costData);
    } catch (err) {
      console.error('Error calculating labor cost:', err);
      toast('No se pudo calcular el costo laboral', 'error');
    } finally {
      setLoadingLabor(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Header Panel */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <Calculator size={20} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              COSTEO <span className="text-blue-500">& ESTRATEGIA</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Simulación de Proyectos · Márgenes McVill</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
            Simulaciones: <span className="text-blue-400">{simulations.length}</span>
          </div>
          <button onClick={fetchSimulations} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} role={loading ? 'status' : undefined} aria-label={loading ? 'Cargando' : undefined} />
          </button>
        </div>
      </div>

      {/* Formula Panel — Cotización */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10">
        <FormulaPanel formulas={FORMULAS.cotizacion} variant="blue" label="Fórmulas Costeo" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-20">
        {/* Tabs Control */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <button
            onClick={() => setActiveTab('express')}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
              activeTab === 'express' ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-slate-500"
            )}
          >
            <Zap size={11} /> EXPRESS
          </button>
          <button
            onClick={() => setActiveTab('detallado')}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
              activeTab === 'detallado' ? "bg-emerald-600/20 border-emerald-500 text-emerald-400" : "bg-white/5 border-white/10 text-slate-500"
            )}
          >
            <Calculator size={11} /> DETALLADO
          </button>
        </div>

        {activeTab === 'express' ? (
          <CotizadorExpress />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Form */}
              <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Nueva Simulación</h3>
                  <button onClick={handleOpenLaborCost} className="text-[8px] font-black text-blue-400 uppercase tracking-widest hover:underline">
                    Extraer Labor de DB
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="costing-project-name" className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Nombre Proyecto</label>
                      <input
                        id="costing-project-name"
                        type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-lg h-8 px-3 text-[10px] text-white outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="costing-mat-cost" className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Materiales ($)</label>
                        <input
                          id="costing-mat-cost"
                          type="text" value={matCostStr} onChange={e => {
                            const formatted = formatMoneyInput(e.target.value);
                            setMatCostStr(formatted);
                            setMatCost(parseFormattedNumber(formatted));
                          }}
                          className="w-full bg-black/40 border border-white/5 rounded-lg h-8 px-3 text-[10px] text-white outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label htmlFor="costing-lab-cost" className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Mano de Obra ($)</label>
                        <input
                          id="costing-lab-cost"
                          type="text" value={labCostStr} onChange={e => {
                            const formatted = formatMoneyInput(e.target.value);
                            setLabCostStr(formatted);
                            setLabCost(parseFormattedNumber(formatted));
                          }}
                          className="w-full bg-black/40 border border-white/5 rounded-lg h-8 px-3 text-[10px] text-white outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/60 rounded-xl p-4 border border-white/5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-slate-500 uppercase font-black">Costo Directo</span>
                        <span className="text-white font-mono">${(matCost + labCost).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[11px] border-t border-white/5 pt-1">
                        <span className="text-blue-400 uppercase font-black">Precio Target</span>
                        <span className="text-white font-mono font-black">${suggestedPrice.toLocaleString()}</span>
                      </div>
                    </div>
                    <button onClick={handleSave} disabled={loading} className="w-full mt-4 h-8 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest disabled:opacity-60">
                      {editingId ? 'ACTUALIZAR' : 'GUARDAR'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl flex flex-col justify-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <TrendingUp size={14} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Utilidad Estimada</p>
                    <p className="text-xl font-black text-white">${profit.toLocaleString()}</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${margin}%` }} />
                </div>
              </div>
            </div>

            {/* History */}
            <div className="bg-slate-950/40 border border-white/5 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="px-4 py-2">Proyecto</th>
                    <th className="px-4 py-2 text-center">Márgenes</th>
                    <th className="px-4 py-2 text-right">Precio Venta</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {simulations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[10px] text-slate-600 font-black uppercase tracking-widest italic">Sin registros</td>
                    </tr>
                  )}
                  {simulations.map(sim => (
                    <tr key={sim.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-white uppercase">{sim.project_name}</span>
                          <span className="text-[8px] text-slate-500">{new Date(sim.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                          {sim.profit_margin_pct}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[10px] font-black text-white">
                        ${Number(sim.suggested_price).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleEdit(sim)} className="p-1.5 hover:text-blue-400"><Layers size={11} /></button>
                          <button onClick={() => handleExport(sim)} className="p-1.5 hover:text-emerald-400"><Download size={11} /></button>
                          <button onClick={() => handleDelete(sim.id)} className="p-1.5 hover:text-rose-400"><Trash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showLaborModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowLaborModal(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase">Costo Laboral DB</h3>
              <button onClick={() => setShowLaborModal(false)}><X size={14} /></button>
            </div>
            <div className="p-4 space-y-4">
              <select 
                className="w-full bg-black/40 border border-white/5 rounded-lg h-9 px-3 text-[10px] text-white"
                onChange={e => handleSelectProject(e.target.value)}
              >
                <option value="">Seleccionar Proyecto...</option>
                {laborProjects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {laborCostData && (
                <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl text-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Costo Total Estimado</p>
                  <p className="text-2xl font-black text-blue-400">${laborCostData.total_labor_cost?.toLocaleString()}</p>
                  <button 
                    onClick={() => { setLabCost(laborCostData.total_labor_cost ?? 0); setShowLaborModal(false); }}
                    className="mt-3 px-4 py-1.5 bg-blue-600 text-white text-[9px] font-black uppercase rounded-lg"
                  >
                    Importar al Costeo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RefreshCw = ({ size, className }: any) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);
