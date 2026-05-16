import React, { useState, useRef } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { inventoryService } from '../services/inventoryService';
import { useConfig } from '../contexts/ConfigContext';
import clsx from 'clsx';

interface InventoryAIModalProps {
  onClose: () => void;
  onItemAdded: () => void;
}

export const InventoryAIModal: React.FC<InventoryAIModalProps> = ({ onClose, onItemAdded }) => {
  const { isDarkMode } = useConfig();
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const prompt = `Analiza esta imagen de un almacén industrial o pieza. 
    Detecta qué objeto es y devuelve un JSON con:
    {
      "name": "Nombre técnico de la pieza o máquina",
      "category": "Categoría (EJ: HERRAMIENTA, MATERIA PRIMA, CONSUMIBLE, MAQUINARIA)",
      "sku": "Genera un SKU sugerido basado en el nombre (EJ: MCH-001)",
      "description": "Breve descripción técnica",
      "confidence": 0.95,
      "suggested_unit": "pcs/kg/lt"
    }
    Responde ÚNICAMENTE el JSON.`;

    try {
      const result = await aiService.analyzeVision(image, prompt);
      // Intentar parsear si viene como string
      const parsed = typeof result === 'string' ? JSON.parse(result.replace(/```json|```/g, '')) : result;
      setAnalysisResult(parsed);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddInventory = async () => {
    if (!analysisResult) return;
    
    setIsAdding(true);
    try {
      await inventoryService.createItem({
        sku: analysisResult.sku,
        name: analysisResult.name,
        description: analysisResult.description,
        category: analysisResult.category,
        quantity: 1,
        unit: analysisResult.suggested_unit || 'pcs',
        min_stock: 5,
        location: 'ALMACÉN CENTRAL'
      });
      onItemAdded();
      onClose();
    } catch (error) {
      console.error("Error adding to inventory:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className={clsx(
      "fixed inset-0 lg:left-64 top-16 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-500",
      isDarkMode ? "bg-slate-950/95" : "bg-slate-900/40"
    )}>
      <div className={clsx(
        "w-full max-w-4xl border border-mcvill-card-border rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] transition-all duration-500",
        isDarkMode ? "bg-slate-950" : "bg-white"
      )}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        
        {/* Header */}
        <div className={clsx(
          "p-8 border-b flex justify-between items-center shrink-0 transition-colors duration-500",
          isDarkMode ? "border-white/5 bg-slate-900/20" : "border-slate-100 bg-slate-50/50"
        )}>
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg transition-colors duration-500",
              isDarkMode ? "bg-mcvill-accent/10 text-mcvill-accent border-mcvill-card-border" : "bg-blue-50 text-blue-600 border-blue-100"
            )}>
              <Zap size={24} className="animate-pulse" />
            </div>
            <div>
              <h3 className={clsx(
                "text-2xl font-black tracking-tight uppercase transition-colors duration-500",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>ESCÁNER <span className="text-blue-500">NEURAL</span></h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">SISTEMA Control DE VISIÓN v2.5</p>
            </div>
          </div>
          <button 
            onClick={() => {
              stopCamera();
              onClose();
            }} 
            className={clsx(
              "w-12 h-12 flex items-center justify-center rounded-2xl transition-all",
              isDarkMode ? "bg-white/5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10" : "bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
            )}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* Visual Input Section */}
            <div className="space-y-6">
              <div className={clsx(
                "aspect-square rounded-2xl border-2 border-dashed overflow-hidden relative group transition-all duration-500",
                isDarkMode ? "bg-slate-900/50 border-mcvill-card-border" : "bg-slate-50 border-mcvill-card-border/50"
              )}>
                {!image && !cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-10 text-center">
                    <div className={clsx(
                      "w-20 h-20 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-500",
                      isDarkMode ? "bg-slate-800 text-slate-500 group-hover:text-blue-400" : "bg-white text-slate-400 group-hover:text-blue-500 shadow-md"
                    )}>
                      <Camera size={40} />
                    </div>
                    <div className="space-y-2">
                      <p className={clsx("text-sm font-black uppercase tracking-widest", isDarkMode ? "text-white" : "text-slate-900")}>Detectar Objeto</p>
                      <p className="text-[10px] font-medium text-slate-500 max-w-[200px]">Usa la cámara o sube una foto para que la IA identifique la pieza automáticamente.</p>
                    </div>
                    <div className="flex gap-4 w-full">
                      <button 
                        onClick={startCamera}
                        className={clsx(
                          "flex-1 h-12 border rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2",
                          isDarkMode ? "bg-white/5 hover:bg-blue-600 hover:text-white border-mcvill-card-border" : "bg-white hover:bg-blue-600 hover:text-white border-mcvill-card-border shadow-sm"
                        )}
                      >
                        <Camera size={16} /> Cámara
                      </button>
                      <label className={clsx(
                        "flex-1 h-12 border rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer",
                        isDarkMode ? "bg-white/5 hover:bg-white/10 border-mcvill-card-border" : "bg-white hover:bg-slate-50 border-mcvill-card-border shadow-sm"
                      )}>
                        <Upload size={16} /> Subir
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                      </label>
                    </div>
                  </div>
                )}

                {cameraActive && (
                  <div className="absolute inset-0">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-6 inset-x-0 flex justify-center gap-4">
                      <button 
                        onClick={capturePhoto}
                        className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all border-4 border-white/20"
                      >
                        <Camera size={28} />
                      </button>
                      <button 
                        onClick={stopCamera}
                        className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all border-4 border-white/20"
                      >
                        <X size={28} />
                      </button>
                    </div>
                  </div>
                )}

                {image && !cameraActive && (
                  <div className="absolute inset-0">
                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                      <button 
                        onClick={() => { setImage(null); startCamera(); }}
                        className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-all"
                      >
                        <RefreshCw size={20} />
                      </button>
                      <button 
                        onClick={() => setImage(null)}
                        className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-all"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {image && !isAnalyzing && !analysisResult && (
                <button
                  onClick={analyzeImage}
                  className="w-full py-5 btn-ai font-black text-sm uppercase tracking-[0.3em] rounded-2xl shadow-[0_0_40px_rgba(0,128,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                  <Zap size={20} />
                  INICIAR ANÁLISIS NEURAL
                </button>
              )}

              {isAnalyzing && (
                <div className={clsx(
                  "w-full py-10 flex flex-col items-center gap-4 rounded-2xl border border-dashed transition-colors duration-500",
                  isDarkMode ? "bg-mcvill-accent/5 border-mcvill-card-border" : "bg-blue-50 border-blue-200"
                )}>
                  <Loader2 className="animate-spin text-blue-500" size={40} />
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] animate-pulse">Procesando Pixeles...</p>
                </div>
              )}
            </div>

            {/* Analysis Result Section */}
            <div className="space-y-6">
              <div className={clsx(
                "glass-premium p-8 h-full min-h-[400px] flex flex-col transition-all duration-500",
                isDarkMode ? "bg-slate-900/40 border-mcvill-accent/30" : "bg-white border-mcvill-accent/20 shadow-xl"
              )}>
                <div className="flex items-center gap-3 mb-8">
                  <div className={clsx(
                    "w-8 h-8 rounded-2xl flex items-center justify-center transition-colors duration-500",
                    isDarkMode ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"
                  )}>
                    <Database size={16} />
                  </div>
                  <h4 className={clsx("text-[11px] font-black uppercase tracking-[0.3em]", isDarkMode ? "text-white" : "text-slate-900")}>Resultados del Análisis</h4>
                </div>

                {!analysisResult ? (
                  <div className={clsx(
                    "flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-2xl transition-all duration-500",
                    isDarkMode ? "border-white/5 opacity-40" : "border-slate-100"
                  )}>
                    <Package size={48} className={clsx("mb-4", isDarkMode ? "text-slate-600" : "text-slate-300")} />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Esperando datos de visión...</p>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-700">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Detección Exitosa ({Math.round(analysisResult.confidence * 100)}%)</span>
                      </div>
                      <h5 className={clsx(
                        "text-2xl font-black uppercase tracking-tight leading-tight transition-colors duration-500",
                        isDarkMode ? "text-white" : "text-slate-900"
                      )}>{analysisResult.name}</h5>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className={clsx(
                        "p-4 rounded-2xl border transition-colors duration-500",
                        isDarkMode ? "bg-white/5 border-white/5" : "bg-slate-50 border-mcvill-card-border"
                      )}>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">SKU SUGERIDO</p>
                        <p className={clsx("text-xs font-black tracking-widest", isDarkMode ? "text-white" : "text-slate-900")}>{analysisResult.sku}</p>
                      </div>
                      <div className={clsx(
                        "p-4 rounded-2xl border transition-colors duration-500",
                        isDarkMode ? "bg-white/5 border-white/5" : "bg-slate-50 border-mcvill-card-border"
                      )}>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">CATEGORÍA</p>
                        <p className="text-xs font-black text-blue-500 tracking-widest">{analysisResult.category}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Tag size={12} /> Descripción Técnica
                      </p>
                      <p className={clsx(
                        "text-xs leading-relaxed font-medium p-4 rounded-2xl border transition-colors duration-500",
                        isDarkMode ? "bg-slate-900/50 border-white/5 text-slate-400" : "bg-slate-50 border-mcvill-card-border text-slate-600"
                      )}>
                        {analysisResult.description}
                      </p>
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                      <div className={clsx(
                        "flex items-center gap-3 p-3 rounded-2xl border transition-colors duration-500",
                        isDarkMode ? "bg-amber-500/5 border-amber-500/10 text-amber-500" : "bg-amber-50 border-amber-100 text-amber-600"
                      )}>
                        <AlertTriangle size={14} />
                        <p className="text-[9px] font-black uppercase tracking-widest">Verificar datos antes de confirmar</p>
                      </div>
                      <button 
                        onClick={handleAddInventory}
                        disabled={isAdding}
                        className={clsx(
                          "w-full py-5 font-black text-sm uppercase tracking-[0.3em] rounded-2xl transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-lg",
                          isDarkMode ? "bg-white text-slate-950 hover:bg-blue-500 hover:text-white" : "bg-slate-900 text-white hover:bg-blue-600"
                        )}
                      >
                        {isAdding ? <Loader2 className="animate-spin" size={20} /> : <Database size={20} />}
                        {isAdding ? 'SINCROIZANDO...' : 'REGISTRAR EN INVENTARIO'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className={clsx(
          "p-6 border-t text-[9px] font-black uppercase tracking-[0.4em] flex justify-between shrink-0 transition-colors duration-500",
          isDarkMode ? "bg-slate-950 border-white/5 text-slate-600" : "bg-slate-50 border-slate-100 text-slate-400"
        )}>
          <p>PROCESAMIENTO LOCAL + NUBE NEURAL</p>
          <p>MODELO: GEMINI 2.5 FLASH LITE</p>
        </div>
      </div>
    </div>
  );
};
