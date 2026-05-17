import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Zap, 
  X, 
  Loader2, 
  Package, 
  Tag, 
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Save,
  Plus,
  ArrowRight,
  Layers,
  HelpCircle
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { inventoryService } from '../services/inventoryService';
import { useConfig } from '../contexts/ConfigContext';
import clsx from 'clsx';

interface InventoryAIModalProps {
  onClose: () => void;
  onItemAdded: () => void;
  items?: any[];
}

export const InventoryAIModal: React.FC<InventoryAIModalProps> = ({ onClose, onItemAdded, items = [] }) => {
  const { isDarkMode, config } = useConfig();
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form states for manual review/override
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formUnit, setFormUnit] = useState('pcs');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('ALMACÉN CENTRAL');
  const [formMinStock, setFormMinStock] = useState<number>(5);

  // Match states
  const [matchedItem, setMatchedItem] = useState<any>(null);
  const [mergeMode, setMergeMode] = useState<'sum' | 'overwrite' | 'create'>('sum');

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setMatchedItem(null);

    const prompt = `Analiza detalladamente esta imagen de un almacén industrial, material, perno o pieza metálica.
    1. Identifica qué tipo de objeto/material es.
    2. CUENTA o ESTIMA visualmente la cantidad visible de piezas en la imagen con la mayor precisión posible. Si es una caja de tornillos o piezas pequeñas, estima un número lógico basándote en la densidad.
    3. Si hay alguna etiqueta, número impreso, QR, código de barras o código SKU escrito, extráelo textualmente. Si no hay ninguno, autogenera un SKU estructurado inteligente (ej: SKU-PER-12, SKU-PLA-A36-14).
    
    Debes devolver estrictamente un JSON plano con la siguiente estructura (no agregues comentarios ni texto fuera de él):
    {
      "name": "Nombre técnico premium de la pieza (Ej: TORNILLO HEXAGONAL 1/2 X 3, PLACA DE ACERO A36 1/4)",
      "category": "Categoría (MAQUINARIA, MATERIA PRIMA, CONSUMIBLE, HERRAMIENTA)",
      "sku": "Código de barras o SKU sugerido",
      "description": "Explicación breve del conteo visual y especificaciones técnicas identificadas",
      "quantity": 10,
      "unit": "pcs",
      "confidence": 0.95,
      "specs": "Dimensiones, aleación, calibre u otros parámetros técnicos visibles"
    }`;

    try {
      const result = await aiService.analyzeVision(image, prompt);
      const parsed = typeof result === 'string' ? JSON.parse(result.replace(/```json|```/g, '')) : result;
      
      setAnalysisResult(parsed);

      // Pre-fill editable states
      const rawSku = (parsed.sku || '').toUpperCase();
      const rawName = (parsed.name || '').toUpperCase();
      const rawCategory = (parsed.category || '').toUpperCase();
      const rawQty = parsed.quantity || 1;
      const rawUnit = parsed.unit || 'pcs';
      const rawDesc = parsed.description || '';

      setFormSku(rawSku);
      setFormName(rawName);
      setFormCategory(rawCategory);
      setFormQuantity(rawQty);
      setFormUnit(rawUnit);
      setFormDescription(rawDesc);
      setFormMinStock(5);
      setFormLocation('ALMACÉN CENTRAL');

      // Run dynamic local database match logic
      const matched = items.find(
        (item: any) => 
          (item.sku && item.sku.trim().toUpperCase() === rawSku.trim().toUpperCase()) ||
          (item.name && item.name.trim().toUpperCase() === rawName.trim().toUpperCase())
      );

      if (matched) {
        setMatchedItem(matched);
        setMergeMode('sum');
        // Overwrite Form values with matched item details for consistency
        setFormSku(matched.sku);
        setFormName(matched.name);
        setFormCategory(matched.category || rawCategory);
        setFormUnit(matched.unit || rawUnit);
        setFormLocation(matched.location || 'ALMACÉN CENTRAL');
        setFormMinStock(matched.min_stock || 5);
      } else {
        setMatchedItem(null);
        setMergeMode('create');
      }

    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmMerge = async () => {
    setIsSubmitting(true);
    try {
      if (matchedItem && (mergeMode === 'sum' || mergeMode === 'overwrite')) {
        const finalQty = mergeMode === 'sum' 
          ? (Number(matchedItem.quantity || 0) + Number(formQuantity))
          : Number(formQuantity);

        await inventoryService.updateItem(matchedItem.id, {
          sku: formSku,
          name: formName,
          category: formCategory,
          quantity: finalQty,
          unit: formUnit,
          description: formDescription || matchedItem.description,
          location: formLocation,
          min_stock: formMinStock
        });
      } else {
        // Create new item
        await inventoryService.createItem({
          sku: formSku,
          name: formName,
          description: formDescription,
          category: formCategory,
          quantity: Number(formQuantity),
          unit: formUnit,
          min_stock: formMinStock,
          location: formLocation
        });
      }
      onItemAdded();
      onClose();
    } catch (error) {
      console.error("Error committing inventory transaction:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={clsx(
      "fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 backdrop-blur-2xl animate-in fade-in duration-500",
      isDarkMode ? "bg-slate-950/95" : "bg-slate-900/40"
    )}>
      <div className={clsx(
        "w-full max-w-6xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh] transition-all duration-500",
        isDarkMode ? "bg-slate-950" : "bg-slate-900"
      )}>
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-mcvill-accent to-transparent" />
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-mcvill-accent/10 text-mcvill-accent border border-mcvill-accent/20 flex items-center justify-center shadow-lg">
              <Zap size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight uppercase flex items-center gap-2">
                ESCÁNER NEURAL <span className="text-mcvill-accent">DE INVENTARIO</span>
              </h3>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] mt-0.5">Visión Artificial Gemini 2.5 • Control de Conteo & SKU</p>
            </div>
          </div>
          <button 
            onClick={() => {
              stopCamera();
              onClose();
            }} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Visual Input Panel (Left) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative aspect-square rounded-2xl border-2 border-dashed border-white/10 bg-black/40 overflow-hidden group">
                {!image && !cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-mcvill-accent group-hover:scale-110 transition-all duration-300">
                      <Camera size={32} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-black text-white uppercase tracking-wider">Capturar Pieza o Caja</p>
                      <p className="text-[9px] text-slate-500 max-w-[240px] leading-relaxed">
                        Sube una fotografía o usa la cámara de tu dispositivo. La IA identificará la pieza, estimará el conteo y buscará coincidencias.
                      </p>
                    </div>
                    <div className="flex gap-3 w-full max-w-sm">
                      <button 
                        onClick={startCamera}
                        className="flex-1 h-12 bg-white/5 hover:bg-mcvill-accent hover:text-white border border-white/10 rounded-xl transition-all text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        <Camera size={14} /> Cámara
                      </button>
                      <label className="flex-1 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer">
                        <Upload size={14} /> Subir Foto
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                      </label>
                    </div>
                  </div>
                )}

                {cameraActive && (
                  <div className="absolute inset-0 bg-black">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    {/* Laser lines */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 border border-mcvill-accent/30 rounded-2xl m-6">
                      <div className="flex justify-between">
                        <div className="w-4 h-4 border-t-2 border-l-2 border-mcvill-accent" />
                        <div className="w-4 h-4 border-t-2 border-r-2 border-mcvill-accent" />
                      </div>
                      <div className="flex justify-between">
                        <div className="w-4 h-4 border-b-2 border-l-2 border-mcvill-accent" />
                        <div className="w-4 h-4 border-b-2 border-r-2 border-mcvill-accent" />
                      </div>
                    </div>
                    <div className="absolute bottom-6 inset-x-0 flex justify-center gap-4">
                      <button 
                        onClick={capturePhoto}
                        className="w-14 h-14 rounded-full bg-mcvill-accent text-white flex items-center justify-center shadow-2xl hover:scale-115 active:scale-90 transition-all border-4 border-white/20"
                      >
                        <Camera size={22} />
                      </button>
                      <button 
                        onClick={stopCamera}
                        className="w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-2xl hover:scale-115 active:scale-90 transition-all border-4 border-white/20"
                      >
                        <X size={22} />
                      </button>
                    </div>
                  </div>
                )}

                {image && !cameraActive && (
                  <div className="absolute inset-0">
                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    
                    {/* Laser Scanning Line Animation */}
                    {isAnalyzing && (
                      <div className="absolute left-0 w-full h-[3px] bg-emerald-500/80 shadow-[0_0_15px_#10b981] animate-[sweep_2.5s_infinite_ease-in-out]" />
                    )}

                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                      <button 
                        onClick={() => { setImage(null); startCamera(); }}
                        className="w-11 h-11 rounded-xl bg-mcvill-accent text-white flex items-center justify-center shadow-xl hover:scale-110 transition-all"
                      >
                        <RefreshCw size={18} />
                      </button>
                      <button 
                        onClick={() => setImage(null)}
                        className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {image && !isAnalyzing && !analysisResult && (
                <button
                  onClick={analyzeImage}
                  className="w-full py-4 bg-mcvill-accent text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-[0_0_30px_rgba(0,128,255,0.25)] hover:shadow-[0_0_40px_rgba(0,128,255,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <Zap size={16} className="animate-pulse" />
                  INICIAR ANÁLISIS NEURAL
                </button>
              )}

              {isAnalyzing && (
                <div className="w-full py-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-950/5 text-center">
                  <Loader2 className="animate-spin text-emerald-500" size={32} />
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.4em] animate-pulse">PROCESANDO PIXELES CON VISION-AI...</p>
                </div>
              )}
            </div>

            {/* Audit & Editable Form Panel (Right) */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 sm:p-6 flex-1 flex flex-col min-h-[400px]">
                
                {/* Result Status Indicator */}
                {!analysisResult ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-xl opacity-40">
                    <Package size={40} className="text-slate-600 mb-3" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Esperando carga y escaneo de imagen</p>
                  </div>
                ) : (
                  <div className="space-y-5 animate-in slide-in-from-right-4 duration-500 flex-1 flex flex-col">
                    
                    {/* Header Details */}
                    <div className="flex justify-between items-start border-b border-white/5 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                            Lectura Lista (Confianza: {Math.round(analysisResult.confidence * 100)}%)
                          </span>
                        </div>
                        <h4 className="text-base font-black text-white uppercase tracking-tight leading-tight">
                          {analysisResult.name}
                        </h4>
                      </div>
                    </div>

                    {/* Smart Matching Alert */}
                    {matchedItem ? (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-amber-400">
                          <AlertTriangle size={14} />
                          <span className="text-[9px] font-black uppercase tracking-wider">COINCIDENCIA ENCONTRADA EN STOCK</span>
                        </div>
                        <p className="text-[10px] text-slate-300 font-bold leading-normal">
                          Se detectó que el SKU <span className="text-amber-400 font-mono font-black">[{matchedItem.sku}]</span> ya existe. 
                          Stock actual en Almacén: <span className="text-white font-black">{matchedItem.quantity} {matchedItem.unit}</span>.
                        </p>
                        
                        {/* Transaction Mode Selector */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          {(['sum', 'overwrite', 'create'] as const).map(mode => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setMergeMode(mode)}
                              className={clsx(
                                "py-2 px-2.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all border",
                                mergeMode === mode
                                  ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-lg shadow-amber-500/15"
                                  : "bg-white/5 border-white/5 text-slate-500 hover:text-white"
                              )}
                            >
                              {mode === 'sum' && 'Sumar Stock'}
                              {mode === 'overwrite' && 'Sobreescribir'}
                              {mode === 'create' && 'Registrar como SKU Nuevo'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-emerald-400">
                        <Plus size={14} />
                        <span className="text-[9px] font-black uppercase tracking-wider">NUEVO ELEMENTO DE INVENTARIO SUGERIDO</span>
                      </div>
                    )}

                    {/* Audit Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Código SKU</label>
                        <input 
                          type="text" 
                          value={formSku} 
                          onChange={e => setFormSku(e.target.value.toUpperCase())}
                          className="cyber-input w-full h-11 text-xs" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Técnico</label>
                        <input 
                          type="text" 
                          value={formName} 
                          onChange={e => setFormName(e.target.value.toUpperCase())}
                          className="cyber-input w-full h-11 text-xs" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoría</label>
                        <select 
                          value={formCategory} 
                          onChange={e => setFormCategory(e.target.value.toUpperCase())}
                          className="cyber-select w-full h-11 text-xs text-white"
                        >
                          <option value="MATERIA PRIMA">MATERIA PRIMA</option>
                          <option value="HERRAMIENTA">HERRAMIENTA</option>
                          <option value="CONSUMIBLE">CONSUMIBLE</option>
                          <option value="PRODUCTO TERMINADO">PRODUCTO TERMINADO</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Cantidad Estimada IA</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            value={formQuantity} 
                            onChange={e => setFormQuantity(parseInt(e.target.value) || 0)}
                            className="cyber-input flex-1 h-11 text-xs text-center font-black" 
                          />
                          <select 
                            value={formUnit} 
                            onChange={e => setFormUnit(e.target.value)}
                            className="cyber-select w-20 h-11 text-xs"
                          >
                            <option value="pcs">Pcs</option>
                            <option value="kg">Kg</option>
                            <option value="m">Metros</option>
                            <option value="ton">Ton</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Ubicación Almacén</label>
                        <input 
                          type="text" 
                          value={formLocation} 
                          onChange={e => setFormLocation(e.target.value.toUpperCase())}
                          className="cyber-input w-full h-11 text-xs" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock Mínimo</label>
                        <input 
                          type="number" 
                          value={formMinStock} 
                          onChange={e => setFormMinStock(parseInt(e.target.value) || 0)}
                          className="cyber-input w-full h-11 text-xs text-center" 
                        />
                      </div>
                    </div>

                    {/* Explicación de Conteo por la IA */}
                    {formDescription && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Razonamiento & Descripción de Conteo</label>
                        <p className="text-[10px] text-slate-400 bg-black/30 p-3 border border-white/5 rounded-xl leading-relaxed">
                          {formDescription}
                        </p>
                      </div>
                    )}

                    {/* Action Block */}
                    <div className="mt-auto pt-4 border-t border-white/5">
                      <button 
                        onClick={handleConfirmMerge}
                        disabled={isSubmitting}
                        className={clsx(
                          "w-full h-13 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.98]",
                          mergeMode === 'sum' 
                            ? "bg-amber-500 hover:opacity-90 text-slate-950 shadow-amber-500/10" 
                            : "bg-mcvill-accent hover:opacity-90 text-white shadow-mcvill-accent/10"
                        )}
                      >
                        {isSubmitting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : mergeMode === 'sum' ? (
                          <Layers size={16} />
                        ) : (
                          <Save size={16} />
                        )}
                        {isSubmitting ? 'PROCESANDO SINCRO...' : 
                          mergeMode === 'sum' ? `SUMAR +${formQuantity} UNIDADES AL STOCK` :
                          mergeMode === 'overwrite' ? `AJUSTAR STOCK EXACTO A ${formQuantity}` :
                          'REGISTRAR NUEVA PIEZA EN INVENTARIO'
                        }
                      </button>
                    </div>

                  </div>
                )}

              </div>
            </div>

          </div>
        </div>

        {/* Laser CSS style helper */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes sweep {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
        `}} />

        {/* Footer info */}
        <div className="p-4 border-t border-white/5 text-[8px] font-black uppercase tracking-[0.3em] flex justify-between bg-slate-900/20 text-slate-600 shrink-0">
          <p>PROCESAMIENTO LOCAL + NUBE NEURAL • {config.brandName}</p>
          <p>MODELO: GEMINI 2.5 FLASH LITE</p>
        </div>
      </div>
    </div>
  );
};
