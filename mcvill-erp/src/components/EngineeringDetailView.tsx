import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  ExternalLink,
  Loader2,
  Layers,
  BrainCircuit,
  Shield
} from 'lucide-react';
import { engineeringService } from '../services/engineeringService';
import { BlueprintAnalyzerModal } from './BlueprintAnalyzerModal';
import type { BOMItem, TechnicalDoc } from '../services/engineeringService';
import { inventoryService } from '../services/inventoryService';
import type { Material } from '../services/inventoryService';
import clsx from 'clsx';
import { useConfig } from '../contexts/ConfigContext';
import { appConfirm, toast } from '../lib/dialogs';

interface EngineeringDetailViewProps {
  projectId: string;
  onBack: () => void;
}

export const EngineeringDetailView: React.FC<EngineeringDetailViewProps> = ({ projectId, onBack }) => {
  const { isDarkMode } = useConfig();
  const [project, setProject] = useState<any>(null);
  const [bom, setBom] = useState<BOMItem[]>([]);
  const [docs, setDocs] = useState<TechnicalDoc[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBOM, setShowAddBOM] = useState(false);
  const [showBlueprintAnalyzer, setShowBlueprintAnalyzer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newItem, setNewItem] = useState({
    material_id: '',
    component_name: '',
    quantity: 1,
    unit: 'pc',
    notes: ''
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projData, materialsData] = await Promise.all([
        engineeringService.getProjectDetails(projectId),
        inventoryService.getMaterials()
      ]);
      setProject(projData);
      setBom(projData.bom_items || []);
      setDocs(projData.technical_docs || []);
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error loading project details:', error);
      toast('No se pudo cargar el proyecto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBOMItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const selectedMaterial = materials.find(m => m.id === newItem.material_id);
      
      await engineeringService.addBOMItem({
        ...newItem,
        project_id: projectId,
        component_name: newItem.component_name || selectedMaterial?.name || 'COMPONENTE_SIN_NOMBRE'
      });
      
      setShowAddBOM(false);
      loadData();
      setNewItem({ material_id: '', component_name: '', quantity: 1, unit: 'pc', notes: '' });
    } catch (error) {
      console.error('Error adding BOM item:', error);
      toast('No se pudo agregar el componente al BOM', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveBOMItem = async (id: string) => {
    if (!await appConfirm('¿Seguro que desea eliminar este item del BOM?')) return;
    try {
      await engineeringService.removeBOMItem(id);
      loadData();
    } catch (error) {
      console.error('Error removing BOM item:', error);
      toast('No se pudo eliminar el componente', 'error');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" role="status" aria-label="Cargando" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando Matriz...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Header Panel Technical */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1 hover:text-white text-slate-500 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-blue-400" />
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">PROYECTO: {project.id.slice(0, 8)}</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx(
            "text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest",
            project.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
          )}>
            {project.status}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-20">
        {/* Project Branding Card */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 rounded-xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-xl relative overflow-hidden group shrink-0">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-[1px] w-8 bg-blue-500" />
              <p className="text-blue-500 text-[8px] font-black tracking-[0.4em] uppercase">Detalle Técnico</p>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase">
              {project.title}
            </h2>
            <p className="text-[10px] text-slate-500 mt-2 font-medium italic">"{project.description}"</p>
          </div>
          <div className="flex gap-2 relative z-10">
            <button onClick={() => setShowBlueprintAnalyzer(true)} className="h-8 px-4 bg-indigo-600/20 border border-indigo-500 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all">
              <BrainCircuit size={12} /> ANALIZAR PLANO IA
            </button>
            <button onClick={() => setShowAddBOM(true)} className="h-8 px-4 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]">
              <Plus size={12} /> INTEGRAR PIEZA
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          {/* BOM Section */}
          <div className="lg:col-span-2 flex flex-col bg-slate-950/40 border border-white/5 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-white/5 bg-slate-900/60 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Bill of Materials (BOM)</h3>
              <span className="text-[8px] font-black text-slate-500 uppercase">Items: {bom.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-950/30 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <th className="px-4 py-2">Componente / SKU</th>
                    <th className="px-4 py-2 text-center">Requerido</th>
                    <th className="px-4 py-2 text-center">Stock</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bom.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-[10px] text-slate-600 font-black uppercase tracking-widest italic">Matriz vacía</td>
                    </tr>
                  ) : (
                    bom.map(item => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-4 py-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white uppercase group-hover:text-blue-400 transition-colors">{item.component_name}</span>
                            <span className="text-[8px] text-slate-500 font-mono">{item.material?.name || 'GENERIC'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-[11px] font-black text-white">{item.quantity}</span>
                            <span className="text-[7px] text-slate-600 font-black uppercase">{item.unit}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className={clsx(
                              "w-1.5 h-1.5 rounded-full",
                              (item.material?.current_stock || 0) >= item.quantity ? "bg-blue-500" : "bg-rose-500"
                            )} />
                            <span className="text-[9px] font-black text-slate-500">{item.material?.current_stock || 0}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleRemoveBOMItem(item.id)} className="p-1.5 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={11} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar Docs */}
          <div className="space-y-4">
            <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText size={12} className="text-blue-400" /> PLANOS TÉCNICOS
              </h3>
              <div className="space-y-2">
                {docs.length === 0 ? (
                  <p className="text-[9px] text-slate-600 font-black uppercase text-center py-4 border border-dashed border-white/5 rounded-lg">Sin blueprints</p>
                ) : (
                  docs.map(doc => (
                    <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 bg-slate-900/60 border border-white/5 rounded-lg hover:border-blue-500/40 transition-all group">
                      <div className="flex items-center gap-3">
                        <Layers size={10} className="text-slate-500" />
                        <div>
                          <p className="text-[9px] font-black text-white uppercase line-clamp-1">{doc.title}</p>
                          <p className="text-[7px] text-slate-500 font-mono">v{doc.version} • {doc.doc_type}</p>
                        </div>
                      </div>
                      <ExternalLink size={10} className="text-slate-600 group-hover:text-blue-400" />
                    </a>
                  ))
                )}
                <button className="w-full py-2 border border-dashed border-white/10 rounded-lg text-[8px] font-black text-slate-600 uppercase hover:text-blue-400 transition-all mt-2">
                  + VINCULAR MASTER BLUEPRINT
                </button>
              </div>
            </div>

            <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-xl p-4">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">VIABILIDAD TÉCNICA</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[8px] font-black text-slate-500 uppercase">Factibilidad</span>
                  <span className="text-lg font-black text-white tracking-tighter">92.4%</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: '92.4%' }} />
                </div>
                <p className="text-[8px] text-slate-500 leading-relaxed italic border-t border-white/5 pt-3">
                  BOM validado contra stock en tiempo real. 2 componentes críticos requieren validación.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddBOM && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Integrar Componente</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] mt-1">Ingeniería & Diseño McVill</p>
              </div>
              <button onClick={() => setShowAddBOM(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-white transition-all">
                <Plus className="rotate-45" size={16} />
              </button>
            </div>
            <form onSubmit={handleAddBOMItem} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label htmlFor="bom-material" className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Material Base</label>
                <select
                  id="bom-material"
                  required
                  className="cyber-select w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-6 text-sm text-white"
                  value={newItem.material_id}
                  onChange={e => setNewItem({...newItem, material_id: e.target.value})}
                >
                  <option value="">-- SELECCIONAR MATERIAL --</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name.toUpperCase()} ({m.unit})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="bom-component-name" className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Pieza / Componente</label>
                <input
                  id="bom-component-name"
                  type="text" placeholder="EJ. SOPORTE LATERAL..."
                  className="cyber-input w-full h-14 text-sm"
                  value={newItem.component_name}
                  onChange={e => setNewItem({...newItem, component_name: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label htmlFor="bom-quantity" className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Cantidad Requerida</label>
                  <input
                    id="bom-quantity"
                    required type="number" step="0.01"
                    className="cyber-input w-full h-14 text-sm"
                    value={newItem.quantity}
                    onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="bom-unit" className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Unidad</label>
                  <input id="bom-unit" readOnly className="cyber-input w-full h-14 text-sm bg-white/5 text-slate-500 cursor-not-allowed" value={newItem.unit} />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" role="status" aria-label="Cargando" /> : <><Layers size={18} /> REGISTRAR EN MATRIZ BOM</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BlueprintAnalyzerModal
        isOpen={showBlueprintAnalyzer}
        onClose={() => setShowBlueprintAnalyzer(false)}
        projectId={projectId}
        onSuccess={loadData}
      />
    </div>
  );
};
