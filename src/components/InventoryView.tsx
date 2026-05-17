import React, { useState, useEffect } from 'react';
import {
  Package, Search, Plus, Filter, AlertCircle, Truck, Database, BarChart3,
  MoreVertical, Loader2, X, History, Tag, Box, FileText, Edit3, Trash2, Zap,
  Upload, MessageSquare, FileDown, Download, RefreshCw, ShoppingCart, ChevronDown, ChevronUp, Brain, TrendingUp
} from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { whatsappService } from '../services/whatsappService';
import type { InventoryItem } from '../services/inventoryService';
import geminiService from '../services/geminiService';
import { reportUtils } from '../utils/reportUtils';
import clsx from 'clsx';
import { InventoryAIModal } from './InventoryAIModal';
import { ImportDataModal, IMPORT_CONFIGS } from './ImportDataModal';
import { ScrapAnalyzerModal } from './ScrapAnalyzerModal';
import { useSearch } from '../contexts/SearchContext';
import { useConfig } from '../contexts/ConfigContext';
import { appConfirm } from '../lib/dialogs';

export const InventoryView: React.FC = () => {
  const { config } = useConfig();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { searchTerm, setSearchTerm } = useSearch();
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showScrapAnalyzer, setShowScrapAnalyzer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    sku: '', name: '', description: '', category: '',
    quantity: 0, unit: 'pcs', min_stock: 5, location: ''
  });
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [forecastText, setForecastText]       = useState('');
  const [forecastLoading, setForecastLoading] = useState(false);
  const [showForecast, setShowForecast]       = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadInventory(); }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getItems();
      setItems(data.map((item: any) => ({
        ...item,
        name: item.name || item.descripcion_mp || 'Sin nombre',
        quantity: item.quantity || 0
      })));
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    reportUtils.exportToPDF(
      `Inventario General ${config.brandName}`,
      items.map(item => ({
        SKU: item.sku || 'N/A',
        Nombre: item.name,
        Stock: `${item.quantity} ${item.unit}`,
        Ubicación: item.location || 'Almacén'
      })),
      `inventario_${config.brandName.toLowerCase().replace(/\s+/g, '_')}`,
      'LOGÍSTICA'
    );
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingItem) {
        await inventoryService.updateItem(editingItem.id, formData);
      } else {
        await inventoryService.createItem(formData);
      }
      setShowModal(false);
      setEditingItem(null);
      loadInventory();
      setFormData({ sku: '', name: '', description: '', category: '', quantity: 0, unit: 'pcs', min_stock: 5, location: '' });
    } catch (error) { console.error(error); }
    finally { setIsSubmitting(false); }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      sku: item.sku, name: item.name, description: item.description || '',
      category: item.category || '', quantity: item.quantity, unit: item.unit,
      min_stock: item.min_stock, location: item.location || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!await appConfirm('¿Eliminar este suministro?')) return;
    try {
      await inventoryService.deleteItem(id);
      loadInventory();
    } catch (error) { console.error(error); }
  };

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity === 0) return { label: 'AGOTADO', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
    if (quantity <= minStock) return { label: 'CRÍTICO', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    return { label: 'OPTIMO', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const suggestions = inventoryService.getPurchaseSuggestions(items);

  const generateForecast = async () => {
    setForecastLoading(true);
    setShowForecast(true);
    setForecastText('');
    try {
      const criticos = items.filter(i => i.quantity === 0).map(i => i.name).slice(0, 5).join(', ') || 'ninguno';
      const bajos    = items.filter(i => i.quantity > 0 && i.quantity <= i.min_stock).map(i => `${i.name} (${i.quantity} ${i.unit})`).slice(0, 8).join(', ') || 'ninguno';
      const top5     = [...items].sort((a, b) => b.quantity - a.quantity).slice(0, 5).map(i => `${i.name}: ${i.quantity} ${i.unit}`).join(', ');
      const prompt = `Eres experto en logística industrial para la empresa ${config.brandName}, que fabrica piezas metálicas de precisión (CNC, soldadura, corte láser). Analiza el siguiente inventario:

- Total SKUs: ${items.length}
- SKUs agotados (crítico): ${criticos}
- SKUs bajo mínimo: ${bajos}
- Mayor stock: ${top5}

Genera un PRONÓSTICO DE DEMANDA Y REABASTECIMIENTO con:
1. Materiales en riesgo de paro de producción (próximos 2 semanas)
2. Recomendación de cantidades a pedir por material crítico (con justificación)
3. Patrón de consumo probable para el mes
4. Una alerta específica si detectas riesgo de desabasto

Responde en español, formato conciso con bullets. Sé directo y específico.`;
      const text = await geminiService.generateText(prompt);
      setForecastText(text);
    } catch {
      setForecastText('Error al generar pronóstico. Verifica la conexión con Gemini.');
    } finally {
      setForecastLoading(false);
    }
  };

  const handleExportSuggestions = () => {
    reportUtils.exportToPDF(
      `Sugerencias de Reabastecimiento ${config.brandName}`,
      suggestions.map(s => ({
        Material: s.name,
        SKU: s.sku || 'N/A',
        'Stock Actual': `${s.quantity} ${s.unit}`,
        'Stock Mínimo': `${s.min_stock} ${s.unit}`,
        'Pedir': `${s.suggested_qty} ${s.unit}`,
        Urgencia: s.urgency === 'critico' ? 'CRÍTICO' : 'BAJO',
      })),
      `oc_sugerida_${config.brandName.toLowerCase().replace(/\s+/g, '_')}`,
      'LOGÍSTICA'
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header Panel */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-mcvill-accent/10 rounded-xl flex items-center justify-center border border-mcvill-accent/20">
            <Package size={20} className="text-mcvill-accent" />
          </div>
          <div>
            <h2 className="text-base font-black text-mcvill-text tracking-tight uppercase">
              INVENTARIO <span className="text-mcvill-accent">& LOGÍSTICA</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Almacén Central · {config.brandName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest text-right">
            SKUS_SYNCED: <span className="text-amber-400">{items.length}</span>
          </div>
          <button onClick={loadInventory} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-20">
        {/* Main Header Card */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 rounded-xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-xl relative overflow-hidden group shrink-0">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-[1px] w-8 bg-mcvill-accent" />
              <p className="text-mcvill-accent text-[8px] font-black tracking-[0.4em] uppercase">Logística v4.0</p>
            </div>
            <h2 className="text-xl font-black text-mcvill-text tracking-tight leading-none uppercase">
              CONTROL DE <span className="text-mcvill-accent glow-text">SUMINISTROS</span>
            </h2>
          </div>
          <div className="flex gap-2 relative z-10">
            <button onClick={handleDownloadPDF} className="mcvill-btn-secondary h-8 px-3 rounded-lg text-[9px] font-black flex items-center gap-2">
              <FileDown size={12} /> REPORTE
            </button>
            <button onClick={generateForecast} disabled={forecastLoading} className="mcvill-btn-ai h-8 px-4 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50">
              {forecastLoading ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />} PRONÓSTICO IA
            </button>
            <button onClick={() => setShowImportModal(true)} className="mcvill-btn-secondary h-8 px-3 rounded-lg text-[9px] font-black flex items-center gap-2">
              <Upload size={12} /> IMPORTAR
            </button>
            <button onClick={() => setShowScrapAnalyzer(true)} className="h-8 px-3 rounded-lg bg-slate-950 border border-slate-800 text-[9px] font-black text-amber-400 hover:text-amber-300 transition-all flex items-center gap-2">
              <AlertCircle size={12} /> SCRAP
            </button>
            <button onClick={() => setShowAIModal(true)} className="mcvill-btn-ai h-8 px-4 rounded-lg flex items-center gap-2 transition-all">
              <Zap size={12} className="animate-pulse" /> IA SCANNER
            </button>
            <button onClick={() => setShowModal(true)} className="mcvill-btn-create h-8 px-4 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20">
              <Plus size={12} /> REGISTRAR
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {[
            { label: 'SKUS TOTALES', value: items.length, icon: Database, color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10' },
            { label: 'STOCK CRÍTICO', value: items.filter(i => i.quantity <= i.min_stock).length, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { label: 'ALERTAS STOCK', value: items.filter(i => i.quantity === 0).length, icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'COBERTURA STOCK', value: `${items.length ? Math.round(items.filter(i => i.quantity > i.min_stock).length / items.length * 100) : 0}%`, icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
          ].map((kpi, idx) => (
            <div key={idx} className="bg-slate-900/40 border border-slate-800/40 p-3 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon size={14} className={kpi.color} />
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</p>
              </div>
              <p className={clsx("text-xl font-black leading-none", kpi.color)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Panel de Sugerencias de Reabastecimiento */}
        {suggestions.length > 0 && (
          <div className="bg-slate-900/40 border border-amber-500/20 rounded-xl overflow-hidden">
            <div
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-500/5 transition-all cursor-pointer"
              onClick={() => setShowSuggestions(prev => !prev)}
            >
              <div className="flex items-center gap-3">
                <ShoppingCart size={14} className="text-amber-400" />
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                  Sugerencias de Reabastecimiento
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black">
                  {suggestions.length} materiales
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); handleExportSuggestions(); }}
                  className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                >
                  <FileDown size={10} /> Exportar OC
                </button>
                {showSuggestions ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
              </div>
            </div>

            {showSuggestions && (
              <div className="border-t border-amber-500/10">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="px-4 py-2.5">Material / SKU</th>
                      <th className="px-4 py-2.5 text-center">Stock Actual</th>
                      <th className="px-4 py-2.5 text-center">Mínimo</th>
                      <th className="px-4 py-2.5 text-center">Pedir</th>
                      <th className="px-4 py-2.5 text-center">Urgencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {suggestions.map(item => (
                      <tr key={item.id} className="hover:bg-amber-500/5 transition-all">
                        <td className="px-4 py-2">
                          <p className="text-[10px] font-black text-white uppercase">{item.name}</p>
                          <p className="text-[8px] font-mono text-slate-500">{item.sku}</p>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={clsx(
                            "text-xs font-black",
                            item.quantity === 0 ? 'text-rose-500' : 'text-amber-400'
                          )}>
                            {item.quantity} <span className="text-[8px] text-slate-500">{item.unit}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center text-[10px] text-slate-400 font-bold">
                          {item.min_stock} <span className="text-[8px] text-slate-600">{item.unit}</span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-[11px] font-black text-emerald-400">
                            +{item.suggested_qty} <span className="text-[8px] text-slate-500">{item.unit}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={clsx(
                            "px-2 py-0.5 rounded border text-[7px] font-black uppercase",
                            item.urgency === 'critico'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          )}>
                            {item.urgency === 'critico' ? 'CRÍTICO' : 'BAJO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Panel Pronóstico IA */}
        {showForecast && (
          <div className="bg-slate-900/40 border border-purple-500/20 rounded-xl overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-purple-500/10">
              <div className="flex items-center gap-3">
                <TrendingUp size={14} className="text-purple-400" />
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Pronóstico IA de Demanda</span>
                {forecastLoading && <Loader2 size={12} className="text-purple-400 animate-spin" />}
              </div>
              <button onClick={() => setShowForecast(false)} className="text-slate-600 hover:text-white transition-all">
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-4">
              {forecastLoading ? (
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 size={14} className="animate-spin text-purple-400" />
                  <span className="text-[10px] font-bold">Analizando inventario con IA...</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">{forecastText}</p>
              )}
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="bg-slate-950/40 border border-white/5 rounded-xl overflow-hidden backdrop-blur-md">
          <div className="px-4 py-3 border-b border-white/5 bg-slate-900/60 flex items-center justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={12} />
              <input 
                type="text" placeholder="FILTRAR..." 
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-[10px] font-bold text-white outline-none focus:border-mcvill-accent/40" 
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="px-4 py-2.5">Suministro / SKU</th>
                  <th className="px-4 py-2.5 text-center">Disponible</th>
                  <th className="px-4 py-2.5 text-center">Estado</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="animate-spin text-mcvill-accent mx-auto" size={20} /></td></tr>
                ) : (
                  filteredItems.map(item => {
                    const status = getStockStatus(item.quantity, item.min_stock);
                    return (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-4 py-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white uppercase group-hover:text-mcvill-accent transition-colors">{item.name}</span>
                            <span className="text-[8px] text-slate-500 font-mono">{item.sku}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-baseline justify-center gap-1">
                            <span className={clsx("text-xs font-black", item.quantity <= item.min_stock ? 'text-rose-500' : 'text-slate-300')}>{item.quantity}</span>
                            <span className="text-[7px] text-slate-600 font-black uppercase">{item.unit}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={clsx("text-[7px] font-black px-1.5 py-0.5 rounded border uppercase", status.color)}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(item)} className="p-1.5 hover:text-mcvill-accent transition-colors"><Edit3 size={11} /></button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:text-rose-400 transition-colors"><Trash2 size={11} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 lg:p-8 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] my-auto">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
              <div>
                <h3 className="text-sm font-black text-mcvill-text uppercase tracking-widest">{editingItem ? 'EDITAR' : 'NUEVO'} <span className="text-mcvill-accent">SUMINISTRO</span></h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] mt-1">Gestión de Inventario {config.brandName}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-white transition-all">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateItem} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Código SKU</label>
                  <input required placeholder="EJ: AC-36-01" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} className="cyber-input w-full h-14 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre del Material</label>
                  <input required placeholder="EJ: PLACA 3/16" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} className="cyber-input w-full h-14 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock Inicial</label>
                  <input required type="number" placeholder="0" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="cyber-input w-full h-14 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Unidad de Medida</label>
                  <select className="cyber-select w-full h-14 text-sm bg-slate-950 border-white/10 text-white px-6" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                    <option value="pcs">PIEZAS</option>
                    <option value="kg">KILOGRAMOS</option>
                    <option value="m">METROS</option>
                    <option value="ton">TONELADAS</option>
                  </select>
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full h-14 bg-mcvill-accent hover:opacity-90 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-mcvill-accent/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> {editingItem ? 'ACTUALIZAR SUMINISTRO' : 'REGISTRAR SUMINISTRO'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAIModal && <InventoryAIModal onClose={() => setShowAIModal(false)} onItemAdded={loadInventory} items={items} />}
      <ScrapAnalyzerModal isOpen={showScrapAnalyzer} onClose={() => setShowScrapAnalyzer(false)} />
      {showImportModal && (
        <ImportDataModal
          config={IMPORT_CONFIGS.inventory}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { setShowImportModal(false); loadInventory(); }}
        />
      )}
    </div>
  );
};

const ShieldAlert = ({ size, className }: any) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);
