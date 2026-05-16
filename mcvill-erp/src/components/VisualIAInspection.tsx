import React, { useState, useRef } from 'react';
import {
  Camera, Upload, Zap, CheckCircle2, XCircle, RefreshCcw, Loader2,
  AlertTriangle, ChevronRight, ShieldCheck, BrainCircuit, Eye, Info, X, Plus, Trash2
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { qualityService } from '../services/qualityService';
import { eventBus } from '../utils/eventBus';
import clsx from 'clsx';

interface IAInspectionResult {
  decision: 'PASS' | 'FAIL';
  confidence: number;
  defects: string[];
  analysis: string;
  measurements?: Record<string, string>;
}

type InspectionType = 'soldadura' | 'ensamble' | 'pintura' | 'dimensional' | 'material' | 'general';

const INSPECTION_TYPES: { id: InspectionType; label: string; emoji: string; color: string }[] = [
  { id: 'soldadura',   label: 'Soldadura',   emoji: '🔥', color: 'border-orange-500/40 bg-orange-500/10 text-orange-400' },
  { id: 'ensamble',    label: 'Ensamble',    emoji: '⚙️', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
  { id: 'pintura',     label: 'Pintura',     emoji: '🎨', color: 'border-purple-500/40 bg-purple-500/10 text-purple-400' },
  { id: 'dimensional', label: 'Dimensional', emoji: '📐', color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400' },
  { id: 'material',    label: 'Materia Prima', emoji: '🔩', color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' },
  { id: 'general',    label: 'General',     emoji: '🔍', color: 'border-slate-500/40 bg-slate-500/10 text-slate-400' },
];

const getPromptForType = (type: InspectionType, notes: string): string => {
  const noteBlock = notes ? `\n\nNOTA DEL INSPECTOR: "${notes}"` : '';

  const prompts: Record<InspectionType, string> = {
    soldadura: `Actúa como Inspector de Soldadura Certificado CWI (Certified Welding Inspector) de McVill.
Analiza esta imagen de soldadura e identifica específicamente:
- Porosidades (poros superficiales o subsuperficiales)
- Fisuras / grietas (longitudinales, transversales, de cráter)
- Socavación (undercut) en los bordes del cordón
- Penetración incompleta o falta de fusión
- Salpicaduras excesivas (spatter)
- Perfiles incorrectos del cordón (convexidad/concavidad excesiva)
- Mordeduras, traslapes, cráteres sin rellenar
- Decoloración excesiva o zona afectada por el calor (ZAC) irregular
${noteBlock}
Responde ÚNICAMENTE con JSON válido (sin texto extra):
{
  "decision": "PASS" | "FAIL",
  "confidence": 0-100,
  "defects": ["defecto 1", "defecto 2"],
  "analysis": "resumen técnico en español con referencia a norma AWS D1.1 o ISO 5817 si aplica",
  "measurements": {"cordón_ancho_mm": "estimación", "penetración": "adecuada|insuficiente"}
}`,

    ensamble: `Actúa como Inspector de Calidad Industrial de McVill especializado en ensamble.
Analiza esta imagen de un ensamble y detecta:
- Piezas faltantes o incorrectas
- Tornillos/tuercas sin apretar o ausentes
- Desalineación de componentes
- Daños mecánicos (deformaciones, abolladuras)
- Cables o mangueras mal ruteadas o sin asegurar
- Holguras excesivas o aprietes incorrectos
- Etiquetas, marcas o números de parte ilegibles o faltantes
${noteBlock}
Responde ÚNICAMENTE con JSON válido:
{
  "decision": "PASS" | "FAIL",
  "confidence": 0-100,
  "defects": ["defecto 1", "defecto 2"],
  "analysis": "resumen técnico en español",
  "measurements": {"componentes_verificados": "estimación"}
}`,

    pintura: `Actúa como Inspector de Acabados Superficiales de McVill.
Analiza esta imagen e identifica defectos de pintura o recubrimiento:
- Chorreos o escurrimientos
- Burbujas o ampollas (solvent popping, blistering)
- Cáscara de naranja (orange peel)
- Falta de cobertura o áreas sin pintura
- Rayaduras, golpes o daños post-pintura
- Contaminación superficial (polvo, suciedad embebida)
- Delaminación o pintura levantada
- Diferencias de tono o color (metamerismo)
${noteBlock}
Responde ÚNICAMENTE con JSON válido:
{
  "decision": "PASS" | "FAIL",
  "confidence": 0-100,
  "defects": ["defecto 1", "defecto 2"],
  "analysis": "resumen técnico en español",
  "measurements": {"cobertura_estimada": "porcentaje"}
}`,

    dimensional: `Actúa como Metróloga Industrial de McVill.
Analiza esta imagen y detecta desviaciones dimensionales visibles:
- Deformaciones plásticas o pandeo
- Perforaciones en posición incorrecta
- Roscas dañadas o incorrectas
- Bordes irregulares, rebabas o material sobrante
- Asimetría visible respecto al plano
- Tolerancias fuera de rango estimadas visualmente
${noteBlock}
Responde ÚNICAMENTE con JSON válido:
{
  "decision": "PASS" | "FAIL",
  "confidence": 0-100,
  "defects": ["defecto 1", "defecto 2"],
  "analysis": "resumen técnico en español",
  "measurements": {"desviacion_estimada": "mm", "rebabas": "sí|no"}
}`,

    material: `Actúa como Inspector de Recepción de Materia Prima de McVill.
Analiza esta imagen e identifica problemas en el material:
- Corrosión, oxidación o manchas
- Golpes, rayaduras o deformaciones en el material crudo
- Humedad o contaminación visible
- Dimensiones incorrectas (perfil, espesor, largo estimado)
- Material incorrecto (color, acabado diferente al especificado)
- Certificado de calidad o etiqueta faltante o ilegible
${noteBlock}
Responde ÚNICAMENTE con JSON válido:
{
  "decision": "PASS" | "FAIL",
  "confidence": 0-100,
  "defects": ["defecto 1", "defecto 2"],
  "analysis": "resumen técnico en español",
  "measurements": {"estado_superficie": "bueno|regular|malo"}
}`,

    general: `Actúa como Inspector de Calidad Industrial de McVill.
Analiza esta imagen e identifica cualquier defecto visible:
- Defectos de superficie (rayaduras, golpes, corrosión)
- Defectos de forma o geometría
- Faltantes o componentes incorrectos
- Contaminación o suciedad
- Cualquier anomalía respecto a una pieza conforme
${noteBlock}
Responde ÚNICAMENTE con JSON válido:
{
  "decision": "PASS" | "FAIL",
  "confidence": 0-100,
  "defects": ["defecto 1", "defecto 2"],
  "analysis": "resumen técnico en español",
  "measurements": {}
}`,
  };

  return prompts[type];
};

export const VisualIAInspection: React.FC<{ onClose: () => void; onComplete: () => void }> = ({ onClose, onComplete }) => {
  const [images, setImages] = useState<{ dataUrl: string; file: File }[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [inspectionType, setInspectionType] = useState<InspectionType>('soldadura');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IAInspectionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, { dataUrl: reader.result as string, file }]);
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setActiveImageIdx(prev => Math.max(0, prev - 1));
    setResult(null);
  };

  const analyzeImage = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const prompt = getPromptForType(inspectionType, notes);
      const activeImage = images[activeImageIdx]?.dataUrl || images[0].dataUrl;
      const response = await aiService.analyzeVision(activeImage, prompt);
      const raw = typeof response === 'string' ? response : JSON.stringify(response);
      // Strip possible markdown code block
      const clean = raw.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
      const parsed: IAInspectionResult = JSON.parse(clean);
      setResult(parsed);
    } catch (error) {
      console.error('Error in IA Inspection:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveInspection = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const typeLabel = INSPECTION_TYPES.find(t => t.id === inspectionType)?.label || inspectionType;
      const inspection = await qualityService.createInspection({
        status: result.decision === 'PASS' ? 'passed' : 'failed',
        details: {
          notes: `[IA ${typeLabel.toUpperCase()}] ${result.analysis}. Defectos: ${result.defects.join(', ') || 'Ninguno'}`,
          checkpoints: {
            dimensions: true,
            material_quality: result.decision === 'PASS',
            finish: result.decision === 'PASS',
          },
          ia_result: result,
          inspection_type: inspectionType,
          inspector_notes: notes,
        },
      });

      if (result.decision === 'FAIL') {
        const severidad: 'critica' | 'mayor' | 'menor' =
          result.confidence >= 85 ? 'critica' : result.confidence >= 60 ? 'mayor' : 'menor';
        const ncNumero = `NC-IA-${Date.now()}`;

        await qualityService.createNoConformidad({
          numero: ncNumero,
          inspection_id: inspection?.id,
          tipo: 'producto',
          descripcion: result.defects.length > 0 ? result.defects.join('; ') : result.analysis,
          origen: 'inspeccion',
          area: `Piso de Producción — ${INSPECTION_TYPES.find(t => t.id === inspectionType)?.label}`,
          severidad,
          causa_raiz: `Detección automática por IA Visual — confianza: ${result.confidence}%`,
          status: 'abierta',
          notas: `[NEURAL INSPECTION ENGINE v2.5] Tipo: ${inspectionType}. ${result.analysis}`,
        });

        eventBus.emit('SHOW_NOTIFICATION', {
          type: 'quality_fail',
          title: `ALERTA DE CALIDAD — NC ${ncNumero}`,
          message: `No conformidad ${severidad.toUpperCase()} en ${inspectionType}. Defecto: ${result.defects[0] || 'Ver detalle'}.`,
        });

        eventBus.emit('QUALITY_EVENT', {
          type: 'FAIL',
          timestamp: new Date().toISOString(),
          defects: result.defects,
          analysis: result.analysis,
          nc_numero: ncNumero,
        });
      } else {
        eventBus.emit('SHOW_NOTIFICATION', {
          type: 'success',
          title: 'INSPECCIÓN EXITOSA',
          message: `Pieza APROBADA — ${INSPECTION_TYPES.find(t => t.id === inspectionType)?.label}. Confianza: ${result.confidence}%`,
        });
      }

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error saving inspection:', error);
    } finally {
      setSaving(false);
    }
  };

  const activeTypeConfig = INSPECTION_TYPES.find(t => t.id === inspectionType)!;

  return (
    <div className="fixed inset-0 top-16 left-0 md:left-64 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mcvill-accent/10 border border-mcvill-accent/30 flex items-center justify-center text-mcvill-accent">
              <BrainCircuit size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-tight">Neural Inspection Engine</h2>
              <p className="text-[9px] font-black text-mcvill-accent uppercase tracking-widest">Visual QA Intelligence v2.5 · {activeTypeConfig.emoji} {activeTypeConfig.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

          {/* Left Panel */}
          <div className="w-full md:w-1/2 p-5 border-r border-white/5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">

            {/* Tipo de inspección */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Tipo de Inspección</p>
              <div className="grid grid-cols-3 gap-2">
                {INSPECTION_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => { setInspectionType(type.id); setResult(null); }}
                    className={clsx(
                      'py-2 px-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1',
                      inspectionType === type.id ? type.color : 'border-white/5 bg-white/[0.02] text-slate-600 hover:text-slate-300'
                    )}
                  >
                    <span className="text-base leading-none">{type.emoji}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zona de imágenes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Imágenes ({images.length})</p>
                <div className="flex gap-2">
                  {images.length > 0 && (
                    <button
                      onClick={() => { setImages([]); setResult(null); setActiveImageIdx(0); }}
                      className="flex items-center gap-1 px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[9px] font-black text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <Trash2 size={11} /> Limpiar Todo
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 hover:text-mcvill-accent hover:border-mcvill-accent/40 transition-all"
                  >
                    <Plus size={11} /> Agregar
                  </button>
                </div>
              </div>

              {images.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-48 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-mcvill-accent/40 transition-all bg-white/[0.01]"
                >
                  <Camera size={36} className="text-slate-600" />
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Subir foto</p>
                    <p className="text-[9px] text-slate-700 uppercase font-bold mt-0.5">PNG · JPG · WEBP · Cámara</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Preview principal */}
                  <div className="relative h-48 rounded-2xl overflow-hidden border border-white/10 group">
                    <img src={images[activeImageIdx]?.dataUrl} className="w-full h-full object-cover" alt="Preview" />
                    <button
                      onClick={() => removeImage(activeImageIdx)}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-rose-400 hover:bg-rose-500 hover:text-white transition-all border border-white/10 z-10"
                      title="Eliminar imagen actual"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIdx(idx)}
                          className={clsx('w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all relative', activeImageIdx === idx ? 'border-mcvill-accent' : 'border-white/10 opacity-50 hover:opacity-80')}
                        >
                          <img src={img.dataUrl} className="w-full h-full object-cover" alt={`Foto ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notas del inspector */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Notas (opcional)</p>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="EJ: Cordón de soldadura longitudinal, proceso MIG-MAG, material A36..."
                className="cyber-input w-full resize-none text-[11px]"
              />
            </div>

            {/* Botón analizar */}
            <button
              onClick={analyzeImage}
              disabled={images.length === 0 || loading}
              className={clsx(
                'w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-[11px] transition-all',
                images.length === 0 || loading
                  ? 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                  : 'bg-mcvill-accent text-slate-950 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] active:scale-[0.98]'
              )}
            >
              {loading ? <><Loader2 size={20} className="animate-spin" /> Analizando...</> : <><Zap size={20} fill="currentColor" /> Iniciar Escaneo Neural</>}
            </button>
          </div>

          {/* Right Panel: Results */}
          <div className="w-full md:w-1/2 p-5 bg-slate-950/30 overflow-y-auto custom-scrollbar">
            {!result && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                <Eye size={48} className="text-slate-600" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Esperando imagen</p>
                  <p className="text-[9px] text-slate-600 uppercase font-bold mt-1">Sube una foto y presiona Escaneo Neural</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="space-y-6 animate-pulse">
                <div className="h-28 bg-white/5 rounded-2xl" />
                <div className="space-y-3">
                  <div className="h-3 w-1/2 bg-white/5 rounded-full" />
                  <div className="h-20 bg-white/5 rounded-2xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 bg-white/5 rounded-2xl" />
                  <div className="h-16 bg-white/5 rounded-2xl" />
                </div>
                <p className="text-center text-[9px] font-black text-slate-600 uppercase tracking-widest animate-pulse">
                  Procesando redes neuronales · {activeTypeConfig.emoji} {activeTypeConfig.label}...
                </p>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-5 animate-in slide-in-from-right-4 duration-500">
                {/* Veredicto */}
                <div className={clsx(
                  'p-5 rounded-2xl border flex items-center justify-between',
                  result.decision === 'PASS'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                )}>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Resultado · {activeTypeConfig.label}</p>
                    <h3 className="text-3xl font-black tracking-tighter uppercase">
                      {result.decision === 'PASS' ? '✓ APROBADO' : '✗ RECHAZADO'}
                    </h3>
                  </div>
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-current animate-ping opacity-20" />
                    {result.decision === 'PASS' ? <ShieldCheck size={32} /> : <XCircle size={32} />}
                  </div>
                </div>

                {/* Score */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Confianza IA</p>
                    <p className="text-2xl font-black text-white">{result.confidence}<span className="text-[11px] text-slate-500 ml-0.5">%</span></p>
                    <div className="h-1 bg-white/5 rounded-full mt-2">
                      <div className={clsx('h-full rounded-full transition-all', result.decision === 'PASS' ? 'bg-emerald-500' : 'bg-rose-500')}
                        style={{ width: `${result.confidence}%` }} />
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Defectos</p>
                    <p className="text-2xl font-black text-white">{result.defects.length}</p>
                    <p className="text-[9px] text-slate-600 uppercase font-bold mt-1">Detectados</p>
                  </div>
                </div>

                {/* Análisis */}
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Info size={12} /> Análisis Técnico
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed bg-white/[0.03] p-4 rounded-xl border border-white/5">
                    {result.analysis}
                  </p>
                </div>

                {/* Defectos */}
                {result.defects.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Anomalías Detectadas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.defects.map((defect, i) => (
                        <span key={i} className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase rounded-lg">
                          {defect}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mediciones */}
                {result.measurements && Object.keys(result.measurements).length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(result.measurements).map(([key, val]) => (
                      <div key={key} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{key.replace(/_/g, ' ')}</p>
                        <p className="text-[11px] font-black text-white mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Guardar */}
                <div className="pt-4 border-t border-white/5">
                  <button
                    onClick={saveInspection}
                    disabled={saving}
                    className="w-full h-12 bg-white text-slate-950 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-mcvill-accent transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                    Registrar en Bitácora QA
                  </button>
                  <p className="text-[8px] text-slate-600 text-center uppercase font-black tracking-widest mt-2">
                    Se guardará como inspección + {result.decision === 'FAIL' ? 'No Conformidad automática' : 'certificación aprobada'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleImageUpload}
        />
      </div>
    </div>
  );
};

export default VisualIAInspection;
