import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Zap, 
  X, 
  Loader2, 
  Cpu, 
  Settings,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { maintenanceService } from '../services/maintenanceService';

interface MaintenanceAIModalProps {
  onClose: () => void;
  onMachineAdded: () => void;
}

export const MaintenanceAIModal: React.FC<MaintenanceAIModalProps> = ({ onClose, onMachineAdded }) => {
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

    const prompt = `Analiza esta imagen de una máquina industrial o equipo de planta. 
    Identifica el equipo y devuelve un JSON con:
    {
      "name": "Nombre comercial/técnico del equipo",
      "status": "operational",
      "description": "Descripción de sus capacidades y función",
      "critical": true/false (si parece ser un equipo vital para la producción),
      "confidence": 0.98,
      "suggested_spare_parts": ["Pieza 1", "Pieza 2"]
    }
    Responde ÚNICAMENTE el JSON.`;

    try {
      const result = await aiService.analyzeVision(image, prompt);
      const parsed = typeof result === 'string' ? JSON.parse(result.replace(/```json|```/g, '')) : result;
      setAnalysisResult(parsed);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddMachine = async () => {
    if (!analysisResult) return;
    
    setIsAdding(true);
    try {
      await maintenanceService.createMachine({
        name: analysisResult.name,
        status: analysisResult.status || 'operational',
        usage: 0,
        next_maintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        health: 100,
        critical: analysisResult.critical || false,
        spare_parts: analysisResult.suggested_spare_parts || []
      });
      onMachineAdded();
      onClose();
    } catch (error) {
      console.error("Error adding machine:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 lg:left-64 top-16 z-[100] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className="w-full max-w-4xl bg-slate-950 border border-mcvill-card-border rounded-2xl overflow-hidden shadow-[0_0_150px_var(--theme-glow)] relative flex flex-col max-h-[90vh]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mcvill-accent to-transparent" />
        
        {/* Header */}
        <div className="p-8 border-b border-mcvill-card-border bg-mcvill-accent/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-mcvill-accent/10 flex items-center justify-center text-mcvill-accent border border-mcvill-accent/20 shadow-[0_0_20px_var(--theme-glow)]">
              <Zap size={24} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight uppercase">DETECTOR DE <span className="text-mcvill-accent">ACTIVOS</span></h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">Reconocimiento Industrial Control v2.5</p>
            </div>
          </div>
          <button 
            onClick={() => {
              stopCamera();
              onClose();
            }} 
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-mcvill-accent/10 text-mcvill-accent hover:text-rose-500 hover:bg-rose-500/10 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* Visual Input Section */}
            <div className="space-y-6">
              <div className="aspect-square rounded-2xl bg-slate-900/50 border-2 border-dashed border-mcvill-card-border overflow-hidden relative group">
                {!image && !cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-10 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 group-hover:scale-110 group-hover:text-mcvill-accent transition-all duration-500">
                      <Camera size={40} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-black text-white uppercase tracking-widest">Identificar Equipo</p>
                      <p className="text-[10px] font-medium text-slate-500 max-w-[200px]">Escanea máquinas o equipos pesados para vincularlos al nodo central.</p>
                    </div>
                    <div className="flex gap-4 w-full">
                      <button 
                        onClick={startCamera}
                        className="flex-1 h-12 bg-mcvill-accent/10 hover:bg-mcvill-accent hover:text-slate-950 border border-mcvill-card-border rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Camera size={16} /> Cámara
                      </button>
                      <label className="flex-1 h-12 bg-mcvill-accent/5 hover:bg-mcvill-accent/10 border border-mcvill-card-border rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer">
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
                        className="w-16 h-16 rounded-full bg-mcvill-accent text-slate-950 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all border-4 border-mcvill-accent/20"
                      >
                        <Camera size={28} />
                      </button>
                      <button 
                        onClick={stopCamera}
                        className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all border-4 border-rose-500/20"
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
                        className="w-12 h-12 rounded-2xl bg-mcvill-accent text-slate-950 flex items-center justify-center shadow-xl hover:scale-110 transition-all"
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
                  className="w-full py-5 btn-ai font-black text-sm uppercase tracking-[0.3em] rounded-2xl shadow-[0_0_40px_var(--theme-glow)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                  <Zap size={20} />
                  ANALIZAR ESPECIFICACIONES
                </button>
              )}

              {isAnalyzing && (
                <div className="w-full py-10 flex flex-col items-center gap-4 bg-mcvill-accent/5 rounded-2xl border border-mcvill-card-border border-dashed">
                  <Loader2 className="animate-spin text-mcvill-accent" size={40} />
                  <p className="text-[10px] font-black text-mcvill-accent uppercase tracking-[0.5em] animate-pulse">Escaneando Activo...</p>
                </div>
              )}
            </div>

            {/* Analysis Result Section */}
            <div className="space-y-6">
              <div className="glass-premium p-8 h-full min-h-[400px] flex flex-col">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400">
                    <Cpu size={16} />
                  </div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Nodo Detectado</h4>
                </div>

                {!analysisResult ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-mcvill-card-border rounded-2xl opacity-40">
                    <Settings size={48} className="mb-4 text-slate-600" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Esperando telemetría visual...</p>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-700">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-mcvill-accent" />
                        <span className="text-[10px] font-black text-mcvill-accent uppercase tracking-widest">IA Industrial Link OK ({Math.round(analysisResult.confidence * 100)}%)</span>
                      </div>
                      <h5 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">{analysisResult.name}</h5>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-mcvill-card-border">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">EVALUACIÓN DE CRITICIDAD</p>
                      <p className={`text-xs font-black tracking-widest ${analysisResult.critical ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {analysisResult.critical ? 'ACTIVO CRÍTICO (HIGH_PRIORITY)' : 'ACTIVO ESTÁNDAR (LOW_PRIORITY)'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Settings size={12} /> Refacciones Identificadas
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.suggested_spare_parts?.map((p: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-white/5 rounded-2xl text-[9px] font-black text-slate-300 uppercase tracking-widest border border-mcvill-card-border">{p}</span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-mcvill-accent/30 space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-mcvill-accent/5 border border-mcvill-card-border text-mcvill-accent">
                        <AlertTriangle size={14} />
                        <p className="text-[9px] font-black uppercase tracking-widest">Vincular para iniciar monitoreo</p>
                      </div>
                      <button 
                        onClick={handleAddMachine}
                        disabled={isAdding}
                        className="w-full py-5 bg-mcvill-accent text-slate-950 font-black text-sm uppercase tracking-[0.3em] rounded-2xl hover:bg-mcvill-cyber transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                      >
                        {isAdding ? <Loader2 className="animate-spin" size={20} /> : <Database size={20} />}
                        {isAdding ? 'PROCESANDO...' : 'VINCULAR ACTIVO A PLANTA'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-6 bg-slate-950 border-t border-mcvill-card-border text-[9px] font-black uppercase tracking-[0.4em] text-slate-600 flex justify-between shrink-0">
          <p>ENGINEERING VISION SYSTEM</p>
          <p>POWERED BY GEMINI 2.5 FLASH</p>
        </div>
      </div>
    </div>
  );
};
