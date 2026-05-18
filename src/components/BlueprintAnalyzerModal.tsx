import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  BrainCircuit,
  Search,
  Plus,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from '../services/aiService';
import { engineeringService } from '../services/engineeringService';
import { useConfig } from '../contexts/ConfigContext';
import { reportUtils } from '../utils/reportUtils';
import { toast } from '../lib/dialogs';
import clsx from 'clsx';

interface BlueprintAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}

export const BlueprintAnalyzerModal: React.FC<BlueprintAnalyzerModalProps> = ({ 
  isOpen, 
  onClose, 
  projectId,
  onSuccess 
}) => {
  const { isDarkMode, config } = useConfig();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const prompt = `Analiza este plano técnico (blueprint) industrial. 
      Extrae de manera precisa la LISTA DE MATERIALES (BOM) en formato JSON.
      
      REQUERIMIENTOS:
      1. Identifica cada componente o pieza.
      2. Extrae el nombre de la pieza (component_name).
      3. Extrae la cantidad (quantity).
      4. Identifica la unidad de medida (unit), por ejemplo: pza, kg, mts.
      5. Añade cualquier nota técnica relevante (notes).
      
      FORMATO DE RESPUESTA:
      Retorna ÚNICAMENTE un array de objetos JSON con esta estructura:
      [
        { "component_name": "NOMBRE", "quantity": 1, "unit": "pza", "notes": "DETALLES" }
      ]`;

      const result = await aiService.analyzeVision(file, prompt);
      
      // Intentar parsear el JSON de la respuesta
      let parsedResult;
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        parsedResult = JSON.parse(jsonMatch ? jsonMatch[0] : result);
      } catch (e) {
        console.error("Error parsing AI result:", e);
        throw new Error("No se pudo procesar el formato de la lista de materiales.");
      }

      setAnalysisResult(parsedResult);
      toast('Análisis de plano completado con éxito.', 'success');
    } catch (error: any) {
      console.error("Error analyzing blueprint:", error);
      toast(error.message || 'Error al analizar el plano.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportBOM = () => {
    if (!analysisResult) return;
    reportUtils.exportToPDF(
      `BOM — ${file?.name ?? 'Plano'} (Proyecto ${projectId})`,
      analysisResult.map((item: any, i: number) => ({
        '#': i + 1,
        Componente: item.component_name,
        Cantidad: item.quantity,
        Unidad: item.unit,
        'Notas técnicas': item.notes || '—',
      })),
      `bom_${projectId}_${(file?.name ?? 'plano').replace(/\.[^.]+$/, '')}`,
      'INGENIERÍA'
    );
  };

  const handleSave = async () => {
    if (!analysisResult || !projectId) return;

    setIsSaving(true);
    try {
      const itemsToSave = analysisResult.map(item => ({
        ...item,
        project_id: projectId
      }));

      await engineeringService.addBOMItems(itemsToSave);
      toast('Lista de materiales integrada al proyecto.', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving BOM items:", error);
      toast('Error al guardar los materiales.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={clsx(
          "relative w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col",
          isDarkMode ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"
        )}
      >
        {/* Header */}
        <div className={clsx(
          "p-8 border-b flex justify-between items-center relative overflow-hidden",
          isDarkMode ? "bg-slate-900/50 border-white/5" : "bg-slate-50 border-slate-100"
        )}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/10">
              <BrainCircuit size={28} />
            </div>
            <div>
              <h3 className={clsx(
                "text-2xl font-black uppercase tracking-tight",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>Vision Planos AI</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">Extracción Automática de BOM</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              isDarkMode ? "bg-white/5 text-slate-500 hover:text-white" : "bg-slate-200/50 text-slate-500 hover:text-slate-900"
            )}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {!analysisResult ? (
            <div className="h-full flex flex-col gap-8">
              {/* Upload Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  "flex-1 min-h-[300px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-6 cursor-pointer transition-all group",
                  file 
                    ? (isDarkMode ? "bg-blue-500/5 border-blue-500/30" : "bg-blue-50 border-blue-200")
                    : (isDarkMode ? "bg-slate-900/30 border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5" : "bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-blue-50")
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*,.pdf" 
                  className="hidden" 
                />
                
                {preview ? (
                  <div className="w-full h-full p-4 relative group">
                    <img src={preview} alt="Plano" className="w-full h-full object-contain rounded-2xl" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="text-white" size={32} />
                        <p className="text-white text-xs font-black uppercase tracking-widest">Cambiar Imagen</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6 text-center px-10">
                    <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:scale-110 transition-transform">
                      <Upload size={32} />
                    </div>
                    <div>
                      <h4 className={clsx("text-lg font-black uppercase tracking-tight", isDarkMode ? "text-slate-300" : "text-slate-700")}>Cargar Plano Técnico</h4>
                      <p className="text-xs text-slate-500 mt-2 max-w-xs">Sube una imagen o PDF del plano para que el Cerebro Neural analice la lista de piezas.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-slate-500/10 text-slate-500 text-[9px] font-black uppercase rounded-full border border-white/5">JPG / PNG</span>
                      <span className="px-3 py-1 bg-slate-500/10 text-slate-500 text-[9px] font-black uppercase rounded-full border border-white/5">PDF</span>
                    </div>
                  </div>
                )}
              </div>

              {file && (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full py-5 btn-ai rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-4 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {`IA ${config.brandName} Analizando Planimetría...`}
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Iniciar Extracción Neural de BOM
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Results Table */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={clsx("text-lg font-black uppercase tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>Lista de Materiales Detectada</h4>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Verifica los datos antes de integrar al proyecto</p>
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setAnalysisResult(null)}
                    className="px-4 py-2 bg-slate-500/10 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-500/20 transition-all border border-white/5"
                  >
                    Re-Analizar
                  </button>
                </div>
              </div>

              <div className={clsx(
                "rounded-2xl border overflow-hidden",
                isDarkMode ? "border-white/5 bg-black/20" : "border-slate-200 bg-slate-50/50"
              )}>
                <table className="w-full text-left">
                  <thead className={isDarkMode ? "bg-slate-900/50" : "bg-slate-100/50"}>
                    <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                      <th className="px-6 py-4">Pieza / Componente</th>
                      <th className="px-6 py-4">Cant.</th>
                      <th className="px-6 py-4">Unidad</th>
                      <th className="px-6 py-4">Notas Técnicas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {analysisResult.map((item, i) => (
                      <tr key={i} className="text-xs group hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-black uppercase tracking-tight text-blue-400">{item.component_name}</td>
                        <td className="px-6 py-4 font-mono font-bold text-white">{item.quantity}</td>
                        <td className="px-6 py-4 text-slate-400">{item.unit}</td>
                        <td className="px-6 py-4 text-slate-500 italic">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={clsx(
                "p-6 rounded-2xl border flex items-center gap-6",
                isDarkMode ? "bg-blue-500/5 border-blue-500/20" : "bg-blue-50 border-blue-100"
              )}>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <AlertCircle size={24} />
                </div>
                <div className="flex-1">
                  <p className={clsx("text-xs font-bold", isDarkMode ? "text-blue-300" : "text-blue-700")}>Validación de Integridad</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Al guardar, estas {analysisResult.length} piezas se añadirán automáticamente al BOM del proyecto actual.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportBOM}
                    className="px-5 py-3 bg-slate-700 text-white rounded-xl font-black uppercase tracking-widest hover:bg-slate-600 transition-all flex items-center gap-2"
                  >
                    <Layers size={14} /> Exportar PDF
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    Integrar al BOM
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
