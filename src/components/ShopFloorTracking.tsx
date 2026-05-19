import React, { useState, useEffect } from 'react';
import { 
  Scan, 
  Search, 
  ArrowLeft, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Pause,
  ChevronRight,
  Zap,
  Loader2,
  Camera,
  ShieldCheck,
  Package,
  Hammer,
  Warehouse,
  Box
} from 'lucide-react';
import { productionService } from '../services/productionService';
import { useConfig } from '../contexts/ConfigContext';
import { VisualIAInspection } from './VisualIAInspection';
import { ShopFloorQRScannerModal } from './ShopFloorQRScannerModal';
import clsx from 'clsx';

export const ShopFloorTracking: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { isDarkMode } = useConfig();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedTraveler, setSelectedTraveler] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeOperation, setActiveOperation] = useState<any>(null);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [showIAModal, setShowIAModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'operaciones' | 'bom' | 'recogidas'>('operaciones');
  const [pickedItems, setPickedItems] = useState<Record<string, boolean>>({});

  const togglePicked = (matId: string) => {
    setPickedItems(prev => ({
      ...prev,
      [matId]: !prev[matId]
    }));
  };

  const handleQRScanSuccess = (decodedText: string) => {
    let cleanId = decodedText.trim();
    if (cleanId.includes('://')) {
      const parts = cleanId.split('/');
      cleanId = parts[parts.length - 1];
    }
    selectTraveler(cleanId);
  };

  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    if (val.length > 2) {
      const results = await productionService.searchTravelers(val);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const selectTraveler = async (id: string) => {
    setLoading(true);
    try {
      const data = await productionService.getTraveler(id);
      setSelectedTraveler(data);
      setSearchResults([]);
      setSearchTerm('');
    } catch (error) {
      console.error('Error fetching traveler:', error);
    } finally {
      setLoading(false);
    }
  };

  const startOperation = (op: any) => {
    setActiveOperation(op);
    setTimer(0);
    setIsTimerRunning(true);
  };

  const finishOperation = async () => {
    if (!activeOperation || !selectedTraveler) return;
    
    setLoading(true);
    try {
      const minutes = Math.floor(timer / 60);
      await productionService.logOperationTime(
        selectedTraveler.id,
        activeOperation.clave_operacion,
        minutes || 1, // At least 1 min for testing
        workerName || 'OPERADOR_PLANTA'
      );
      
      // Refresh traveler data
      const updated = await productionService.getTraveler(selectedTraveler.id);
      setSelectedTraveler(updated);
      setActiveOperation(null);
      setIsTimerRunning(false);
      setTimer(0);
    } catch (error) {
      console.error('Error finishing operation:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (activeOperation) {
    return (
      <div className="flex flex-col h-full bg-mcvill-bg animate-in slide-in-from-right duration-500">
        <div className="p-6 border-b border-mcvill-card-border flex items-center justify-between">
          <button onClick={() => setActiveOperation(null)} className="p-2 text-slate-500">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black text-mcvill-accent uppercase tracking-[0.3em]">Operación en Curso</p>
            <h3 className="text-lg font-black text-white">{activeOperation.nombre_operacion}</h3>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-12">
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div className={clsx(
              "absolute inset-0 rounded-full border-4 border-mcvill-accent/20",
              isTimerRunning && "animate-ping opacity-20"
            )} />
            <div className="absolute inset-4 rounded-full border-2 border-mcvill-accent/40 border-dashed animate-spin-slow" />
            <span className="text-5xl font-black text-white font-mono tracking-tighter">
              {formatTime(timer)}
            </span>
          </div>

          <div className="w-full max-w-sm space-y-6">
            <div className="cyber-panel p-6 bg-white/5 border-mcvill-card-border">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Centro de Trabajo</p>
              <p className="text-xl font-black text-white">{activeOperation.centro_trabajo}</p>
              <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Estimado: {activeOperation.tiempo_estimado}H</span>
                <span className="text-mcvill-accent">Meta: {Math.round(activeOperation.tiempo_estimado * 60)} MIN</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Firma del Operador</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text" 
                  className="cyber-input w-full pl-12 h-14 rounded-2xl"
                  placeholder="NOMBRE O ID..."
                  value={workerName}
                  onChange={e => setWorkerName(e.target.value.toUpperCase())}
                />
              </div>
            </div>
            {/* Quality Check Trigger */}
            <button
              onClick={() => setShowIAModal(true)}
              className="mcvill-btn-ai w-full py-4 rounded-2xl flex items-center justify-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <ShieldCheck size={18} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Inspección de Calidad</p>
                <p className="text-[8px] text-white/60 uppercase font-bold mt-1">Activar Motor Neural de Calidad</p>
              </div>
            </button>
          </div>
        </div>

        <div className="p-8 grid grid-cols-2 gap-4">
          <button 
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className={clsx(
              "h-16 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all",
              isTimerRunning ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-mcvill-accent/10 text-mcvill-accent border border-mcvill-accent/20"
            )}
          >
            {isTimerRunning ? <Pause size={20} /> : <Play size={20} />}
            {isTimerRunning ? 'Pausar' : 'Reanudar'}
          </button>
          <button 
            onClick={finishOperation}
            disabled={loading || !workerName}
            className="h-16 bg-mcvill-accent text-slate-950 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50"
          >
            <CheckCircle2 size={20} />
            Finalizar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-mcvill-bg animate-in fade-in duration-500">
      <div className="p-6 border-b border-mcvill-card-border flex items-center justify-between">
        <button onClick={onBack} className="p-2 text-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-mcvill-accent uppercase tracking-[0.3em]">Terminal de Piso</p>
          <h3 className="text-lg font-black text-white uppercase">Tracker de Manufactura</h3>
        </div>
        <button 
          onClick={() => setShowQRScanner(true)} 
          className="p-2 text-mcvill-accent hover:scale-110 active:scale-95 transition-transform"
          title="Escanear QR de Viajero"
        >
          <Scan size={24} />
        </button>
      </div>

      <div className="p-6">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-mcvill-accent transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="ESCANEAR O ESCRIBIR OT / JOB ID..."
            className="cyber-input w-full pl-14 h-16 text-sm font-black uppercase tracking-widest rounded-2xl"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-mcvill-card-border rounded-2xl overflow-hidden z-50 shadow-2xl">
              {searchResults.map(res => (
                <button 
                  key={res.id}
                  onClick={() => selectTraveler(res.id)}
                  className="w-full p-5 text-left border-b border-mcvill-card-border last:border-0 hover:bg-white/5 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-black text-white text-sm">{res.id}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{res.numero_parte} - {res.descripcion}</p>
                  </div>
                  <ChevronRight size={18} className="text-mcvill-accent" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="animate-spin text-mcvill-accent" size={48} />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Consultando Nube...</p>
          </div>
        ) : selectedTraveler ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="cyber-panel p-6 bg-gradient-to-br from-mcvill-accent/10 to-transparent border-mcvill-accent/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap size={60} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-mcvill-accent uppercase tracking-[0.3em] mb-1">Viajero Seleccionado</p>
                <h4 className="text-2xl font-black text-white mb-2">{selectedTraveler.id}</h4>
                <div className="flex flex-wrap gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Package size={12} /> {selectedTraveler.numero_parte}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {selectedTraveler.fecha_entrega ? new Date(selectedTraveler.fecha_entrega).toLocaleDateString() : 'S/F'}</span>
                </div>
              </div>
              
              <div className="mt-6 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-500">Progreso de Manufactura</span>
                  <span className="text-mcvill-accent">{selectedTraveler.avance_porcentaje || 0}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-mcvill-accent shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-1000" 
                    style={{ width: `${selectedTraveler.avance_porcentaje || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex gap-2 p-1.5 bg-white/5 border border-mcvill-card-border rounded-2xl shrink-0">
              {[
                { id: 'operaciones', label: 'Operaciones', count: selectedTraveler.traveler_operations?.length || 0, icon: <Hammer size={14} /> },
                { id: 'bom', label: 'BOM (Directo)', count: selectedTraveler.traveler_materials?.filter((m: any) => !m.es_recogida).length || 0, icon: <Package size={14} /> },
                { id: 'recogidas', label: 'Recogidas', count: selectedTraveler.traveler_materials?.filter((m: any) => m.es_recogida).length || 0, icon: <Warehouse size={14} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={clsx(
                    "flex-1 py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider transition-all",
                    activeTab === tab.id 
                      ? "bg-mcvill-accent text-slate-950 shadow-[0_0_12px_rgba(59,130,246,0.4)] font-black" 
                      : "text-slate-400 hover:text-white hover:bg-white/5 font-bold"
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className={clsx(
                    "px-1.5 py-0.5 rounded-full text-[8px] font-black leading-none",
                    activeTab === tab.id ? "bg-slate-950 text-mcvill-accent" : "bg-white/10 text-slate-400"
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-4 pb-20">
              {activeTab === 'operaciones' && (
                <>
                  <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Ruta de Operaciones</h5>
                  {selectedTraveler.traveler_operations?.sort((a: any, b: any) => a.orden - b.orden).map((op: any) => (
                    <div 
                      key={op.id}
                      className={clsx(
                        "cyber-panel p-5 border transition-all flex items-center justify-between group",
                        op.estado === 'completed' 
                          ? "bg-emerald-500/5 border-emerald-500/20 opacity-60" 
                          : "bg-white/5 border-mcvill-card-border hover:border-mcvill-accent/40"
                      )}
                    >
                      <div className="flex items-center gap-5">
                        <div className={clsx(
                          "w-12 h-12 rounded-2xl flex items-center justify-center border font-black text-xs transition-all duration-500",
                          op.estado === 'completed' 
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-500" 
                            : "bg-mcvill-bg border-mcvill-card-border text-slate-500 group-hover:border-mcvill-accent group-hover:text-mcvill-accent shadow-xl"
                        )}>
                          {op.orden}
                        </div>
                        <div>
                          <h6 className={clsx(
                            "text-sm font-black uppercase transition-colors",
                            op.estado === 'completed' ? "text-emerald-500/70" : "text-white group-hover:text-mcvill-accent"
                          )}>{op.nombre_operacion}</h6>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{op.centro_trabajo} • EST: {op.tiempo_estimado}H</p>
                        </div>
                      </div>
                      
                      {op.estado === 'completed' ? (
                        <div className="flex flex-col items-end gap-1">
                          <CheckCircle2 className="text-emerald-500" size={20} />
                          <span className="text-[8px] font-black text-emerald-600 uppercase">Listo</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => startOperation(op)}
                          className="w-12 h-12 bg-mcvill-accent/10 text-mcvill-accent border border-mcvill-accent/20 rounded-2xl flex items-center justify-center hover:bg-mcvill-accent hover:text-slate-950 transition-all shadow-xl active:scale-90"
                        >
                          <Play size={20} fill="currentColor" />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}

              {activeTab === 'bom' && (
                <>
                  <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Lista de Materiales (BOM)</h5>
                  {(!selectedTraveler.traveler_materials || selectedTraveler.traveler_materials.filter((m: any) => !m.es_recogida).length === 0) ? (
                    <div className="text-center py-12 text-slate-500 uppercase text-[10px] font-black tracking-widest border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                      Sin componentes estándar registrados
                    </div>
                  ) : (
                    selectedTraveler.traveler_materials.filter((m: any) => !m.es_recogida).map((mat: any) => (
                      <div 
                        key={mat.id}
                        className="cyber-panel p-5 bg-white/5 border border-mcvill-card-border hover:border-emerald-500/30 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                            <Box size={16} />
                          </div>
                          <div>
                            <h6 className="text-sm font-black text-white uppercase group-hover:text-emerald-400 transition-colors leading-tight">
                              {mat.descripcion}
                            </h6>
                            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mt-1">
                              Clave: {mat.clave || 'S/K'} • Ubicac: {mat.ubicacion || 'ALMACÉN GRAL'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pl-4 border-l border-white/5 shrink-0">
                          <div className="text-right">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">CANT REQ</p>
                            <p className="text-sm font-black text-white">{mat.cantidad || 0} <span className="text-[9px] font-bold text-slate-500">{mat.unidad}</span></p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {activeTab === 'recogidas' && (
                <>
                  <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Recogidas de Almacén (Picking)</h5>
                  {(!selectedTraveler.traveler_materials || selectedTraveler.traveler_materials.filter((m: any) => m.es_recogida).length === 0) ? (
                    <div className="text-center py-12 text-slate-500 uppercase text-[10px] font-black tracking-widest border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                      Sin recogidas de almacén registradas
                    </div>
                  ) : (
                    selectedTraveler.traveler_materials.filter((m: any) => m.es_recogida).map((mat: any) => {
                      const isPicked = !!pickedItems[mat.id];
                      return (
                        <div 
                          key={mat.id}
                          className={clsx(
                            "cyber-panel p-5 border transition-all flex items-center justify-between group cursor-pointer",
                            isPicked 
                              ? "bg-amber-500/5 border-amber-500/20 opacity-60 animate-in fade-in" 
                              : "bg-white/5 border-mcvill-card-border hover:border-amber-500/30"
                          )}
                          onClick={() => togglePicked(mat.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={clsx(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 border",
                              isPicked 
                                ? "bg-amber-500/20 border-amber-500/40 text-amber-400" 
                                : "bg-slate-800 border-white/10 text-slate-500"
                            )}>
                              <Warehouse size={16} />
                            </div>
                            <div>
                              <h6 className={clsx(
                                "text-sm font-black uppercase transition-colors leading-tight",
                                isPicked ? "text-amber-500/70 line-through" : "text-white group-hover:text-amber-400"
                              )}>
                                {mat.descripcion}
                              </h6>
                              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mt-1">
                                Clave: {mat.clave || 'S/K'} • Ubicac: {mat.ubicacion || 'ALMACÉN GRAL'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 pl-4 border-l border-white/5 shrink-0">
                            <div className="text-right">
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">PICKING</p>
                              <p className="text-sm font-black text-white">{mat.cantidad || 0} <span className="text-[9px] font-bold text-slate-500">{mat.unidad}</span></p>
                            </div>
                            <div className={clsx(
                              "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                              isPicked 
                                ? "bg-amber-500 border-amber-400 text-slate-950" 
                                : "border-white/20 text-transparent"
                            )}>
                              <CheckCircle2 size={14} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center text-slate-700 mb-4 animate-pulse">
              <Zap size={40} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Esperando Datos</h4>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-2 max-w-xs mx-auto">
                Escanee el código QR del viajero o introduzca el Job ID para iniciar el seguimiento.
              </p>
            </div>
          </div>
        )}
      </div>

      {showIAModal && (
        <VisualIAInspection 
          onClose={() => setShowIAModal(false)} 
          onComplete={() => setShowIAModal(false)} 
        />
      )}

      {showQRScanner && (
        <ShopFloorQRScannerModal
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScanSuccess={handleQRScanSuccess}
        />
      )}
    </div>
  );
};

export default ShopFloorTracking;
