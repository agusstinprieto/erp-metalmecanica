import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  BarChart3, 
  BrainCircuit, 
  Sparkles,
  AlertTriangle,
  TrendingDown,
  ChevronRight,
  Loader2,
  Package,
  Calculator
} from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import type { InventoryItem } from '../services/inventoryService';
import { useConfig } from '../contexts/ConfigContext';
import { aiService } from '../services/aiService';
import clsx from 'clsx';

interface ScrapAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScrapAnalyzerModal: React.FC<ScrapAnalyzerModalProps> = ({ isOpen, onClose }) => {
  const { isDarkMode } = useConfig();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    materialId: '',
    totalPurchased: 0,
    totalUsed: 0,
    timeframe: 'últimos 30 días'
  });

  useEffect(() => {
    if (isOpen) {
      loadMaterials();
    }
  }, [isOpen]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getItems();
      setItems(data);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!formData.materialId || formData.totalPurchased <= 0) return;

    setAnalyzing(true);
    try {
      const selectedMaterial = items.find(i => i.id === formData.materialId);
      const scrapQuantity = formData.totalPurchased - formData.totalUsed;
      const scrapPercentage = (scrapQuantity / formData.totalPurchased) * 100;

      const prompt = `
        Analiza la merma de material en un entorno industrial:
        - Material: ${selectedMaterial?.name} (${selectedMaterial?.category})
        - Comprado: ${formData.totalPurchased} ${selectedMaterial?.unit}
        - Utilizado en producto final: ${formData.totalUsed} ${selectedMaterial?.unit}
        - Merma (Desperdicio): ${scrapQuantity} ${selectedMaterial?.unit} (${scrapPercentage.toFixed(2)}%)
        - Periodo: ${formData.timeframe}

        Proporciona un análisis estructurado en JSON con:
        1. "nivel_alerta": "bajo" | "medio" | "alto"
        2. "causas_probables": Array de strings
        3. "estrategias_optimizacion": Array de strings
        4. "ahorro_potencial_estimado": String
        5. "resumen_ejecutivo": Un párrafo corto
      `;

      const result = await aiService.generateJSONResponse(prompt);
      setAnalysisResult({
        ...result,
        scrapQuantity,
        scrapPercentage
      });
    } catch (error) {
      console.error('Error in AI analysis:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-mcvill-bg/80 backdrop-blur-2xl animate-in fade-in duration-500" onClick={onClose} />
      
      <div className={clsx(
        "relative w-full max-w-4xl cyber-panel overflow-hidden flex flex-col max-h-[90vh]",
        isDarkMode ? "bg-slate-900" : "bg-white"
      )}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mcvill-accent to-transparent" />
        
        {/* Header */}
        <div className="p-8 border-b border-mcvill-card-border flex justify-between items-center bg-slate-950/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-mcvill-accent/10 flex items-center justify-center text-mcvill-accent border border-mcvill-accent/20">
              <TrendingDown size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Analizador de Merma Pro</h3>
              <p className="text-mcvill-accent text-[10px] font-black uppercase tracking-[0.4em] mt-1">Sincronización de Eficiencia de Materiales</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Input Form */}
            <div className="space-y-8">
              <div className="cyber-panel p-6 bg-slate-900/40 space-y-6">
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                  <Calculator size={14} className="text-mcvill-accent" />
                  Datos de Entrada
                </h4>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Material</label>
                    <select 
                      className="cyber-select w-full"
                      value={formData.materialId}
                      onChange={e => setFormData({...formData, materialId: e.target.value})}
                    >
                      <option value="">-- Seleccionar --</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id} className="bg-slate-900">{item.name} ({item.sku})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Comprado</label>
                      <input 
                        type="number" 
                        className="cyber-input w-full"
                        value={formData.totalPurchased}
                        onChange={e => setFormData({...formData, totalPurchased: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Utilizado</label>
                      <input 
                        type="number" 
                        className="cyber-input w-full"
                        value={formData.totalUsed}
                        onChange={e => setFormData({...formData, totalUsed: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Periodo de Análisis</label>
                    <select 
                      className="cyber-select w-full"
                      value={formData.timeframe}
                      onChange={e => setFormData({...formData, timeframe: e.target.value})}
                    >
                      <option value="últimos 30 días" className="bg-slate-900">Últimos 30 días</option>
                      <option value="último trimestre" className="bg-slate-900">Último Trimestre</option>
                      <option value="último año" className="bg-slate-900">Último Año</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || !formData.materialId}
                  className="w-full flex items-center justify-center gap-4 btn-ai font-black py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {analyzing ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
                  <span className="uppercase tracking-[0.2em] text-xs">{analyzing ? 'Procesando Neuronas...' : 'Ejecutar Análisis IA'}</span>
                </button>
              </div>

              {analysisResult && (
                <div className={clsx(
                  "cyber-panel p-6 border-l-4",
                  analysisResult.nivel_alerta === 'alto' ? "border-l-rose-500" : analysisResult.nivel_alerta === 'medio' ? "border-l-amber-500" : "border-l-emerald-500"
                )}>
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resumen Ejecutivo</p>
                    <div className={clsx(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      analysisResult.nivel_alerta === 'alto' ? "bg-rose-500/10 text-rose-400" : analysisResult.nivel_alerta === 'medio' ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                    )}>
                      Alerta {analysisResult.nivel_alerta}
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed italic">"{analysisResult.resumen_ejecutivo}"</p>
                </div>
              )}
            </div>

            {/* Results Section */}
            <div className="space-y-8">
              {!analysisResult && !analyzing ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-mcvill-card-border rounded-3xl opacity-50">
                  <Sparkles size={48} className="text-mcvill-accent mb-4 animate-pulse" />
                  <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Esperando Datos para Análisis Neural</p>
                </div>
              ) : analyzing ? (
                <div className="h-full flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-mcvill-accent/20 border-t-mcvill-accent animate-spin" />
                    <BrainCircuit className="absolute inset-0 m-auto text-mcvill-accent animate-pulse" size={32} />
                  </div>
                  <p className="text-mcvill-accent font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Sincronizando Base de Datos...</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right duration-700">
                  {/* Scrap Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="cyber-panel p-5 bg-rose-500/5 border-rose-500/20">
                      <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Volumen Merma</p>
                      <p className="text-2xl font-black text-white">{analysisResult.scrapQuantity.toFixed(2)} <span className="text-xs text-slate-500">unidades</span></p>
                    </div>
                    <div className="cyber-panel p-5 bg-amber-500/5 border-amber-500/20">
                      <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Eficiencia Material</p>
                      <p className="text-2xl font-black text-white">{(100 - analysisResult.scrapPercentage).toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Savings Potential */}
                  <div className="cyber-panel p-6 bg-emerald-500/10 border-emerald-500/30 flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                      <TrendingDown size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">Ahorro Potencial Mensual</p>
                      <p className="text-2xl font-black text-white uppercase tracking-tighter">{analysisResult.ahorro_potencial_estimado}</p>
                    </div>
                  </div>

                  {/* Causes & Strategies */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Estrategias de Optimización</h4>
                    <div className="space-y-2">
                      {analysisResult.estrategias_optimizacion.map((strategy: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-4 bg-slate-900/60 border border-mcvill-card-border rounded-xl group hover:border-mcvill-accent/30 transition-all">
                          <ChevronRight size={14} className="text-mcvill-accent group-hover:translate-x-1 transition-transform" />
                          <span className="text-xs text-slate-300 font-medium">{strategy}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Posibles Causas</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.causas_probables.map((cause: string, idx: number) => (
                        <span key={idx} className="px-3 py-1.5 bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-700">
                          {cause}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-mcvill-card-border bg-slate-950/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-[10px] tracking-widest uppercase rounded-xl transition-all"
          >
            Cerrar Protocolo
          </button>
        </div>
      </div>
    </div>
  );
};
