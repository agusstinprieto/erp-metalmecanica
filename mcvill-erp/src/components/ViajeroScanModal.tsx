import React, { useState, useRef, useCallback } from 'react';
import {
  X, Camera, Upload, Loader2, Sparkles, CheckCircle2,
  AlertTriangle, ChevronRight, Hammer, Box, FileText,
  RotateCcw, Zap, Ruler,
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import geminiService from '../services/geminiService';

interface MaterialSugerido {
  material:    string;
  descripcion: string;
  cantidad:    number;
  unidad:      string;
  espesor:     string;
}

interface ScanResult {
  numero_parte:          string;
  revision:              string;
  descripcion:           string;
  cliente:               string;
  materiales_sugeridos:  MaterialSugerido[];
  operaciones_sugeridas: string[];
  horas_por_operacion:   Record<string, number>;
  horas_estimadas_total: number;
  notas_tecnicas:        string;
  confianza:             'alta' | 'media' | 'baja';
}

interface Props {
  onClose:  () => void;
  onFill:   (data: Partial<ScanResult & { operaciones_sugeridas: string[]; horas_por_operacion: Record<string, number> }>) => void;
}

const CT_OPTIONS = ['LASER', 'DOBLEZ', 'CNC', 'SOLDADURA', 'PINTURA', 'ENSAMBLE'];

const CONFIANZA_COLOR: Record<string, string> = {
  alta:  'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  media: 'text-amber-400  border-amber-500/30  bg-amber-500/10',
  baja:  'text-rose-400   border-rose-500/30   bg-rose-500/10',
};

export const ViajeroScanModal: React.FC<Props> = ({ onClose, onFill }) => {
  const { isDarkMode } = useConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode]                 = useState<'foto' | 'plano'>('foto');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64]   = useState<string | null>(null);
  const [imageMime, setImageMime]       = useState<string>('image/jpeg');
  const [dragging, setDragging]         = useState(false);
  const [scanning, setScanning]         = useState(false);
  const [result, setResult]             = useState<ScanResult | null>(null);
  const [error, setError]               = useState<string | null>(null);

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Solo se aceptan imágenes (JPG, PNG, WEBP).');
      return;
    }
    setResult(null);
    setError(null);
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setImageDataUrl(dataUrl);
      // Strip the data:image/...;base64, prefix
      setImageBase64(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleScan = async () => {
    if (!imageBase64) return;
    setScanning(true);
    setError(null);
    try {
      const schema = `{
  "numero_parte":          "Número de parte visible o inferido. Si no hay, usa ''",
  "revision":              "Letra o número de revisión (A, B, 01...). Si no hay, usa ''",
  "descripcion":           "Descripción técnica profesional en español de la pieza o ensamble",
  "cliente":               "Nombre del cliente si aparece. Si no hay, usa ''",
  "materiales_sugeridos":  [{ "material": "MATERIAL EN MAYÚSCULAS", "descripcion": "uso o forma", "cantidad": 1, "unidad": "kg", "espesor": "espesor o ''" }],
  "operaciones_sugeridas": ["Lista de operaciones requeridas de: LASER, DOBLEZ, CNC, SOLDADURA, PINTURA, ENSAMBLE, MAQUINADO, TORNO, FRESADO"],
  "horas_por_operacion":   {"OPERACION": 0.0},
  "horas_estimadas_total": 0.0,
  "notas_tecnicas":        "Notas técnicas: tolerancias, acabados, tratamientos térmicos, observaciones importantes",
  "confianza":             "alta | media | baja — basado en qué tan clara es la imagen"
}`;

      const prompt = mode === 'plano'
        ? `Eres un ingeniero de manufactura metalmecánica experto en lectura de planos técnicos (GD&T, ISO, ASME).
Analiza este PLANO TÉCNICO de ingeniería y extrae toda la información del cuadro de título (título, número de parte, revisión, material, escala, tolerancias generales, nombre del cliente/proyecto).
Lee las notas técnicas, especificaciones de acabado superficial y tratamientos indicados.
Con base en la geometría y tolerancias del plano, determina qué operaciones de manufactura son necesarias y estima las horas de producción.
Responde SOLO con el JSON, sin texto adicional.`
        : `Eres un experto en manufactura metalmecánica con 20 años de experiencia en talleres de corte, doblez y soldadura.
Analiza esta FOTO DE PIEZA METÁLICA e identifica visualmente: tipo de pieza, material (por color, textura, acabado), procesos de manufactura ya aplicados (corte, doblez, soldadura, maquinado, pintura) y estado de la pieza.
Infiere qué operaciones serían necesarias para fabricarla desde cero y estima horas de producción.
Si hay textos o etiquetas visibles en la pieza, léelos para obtener número de parte o cliente.
Responde SOLO con el JSON, sin texto adicional.`;

      const data = await geminiService.generateStructuredData<ScanResult>(
        prompt,
        schema,
        {
          model: 'gemini-2.5-pro',
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType: imageMime, data: imageBase64 } },
              { text: prompt + '\n\n**FORMATO DE SALIDA OBLIGATORIO (JSON):**\n' + schema + '\n\nResponde EXCLUSIVAMENTE con el objeto JSON. Sin markdown, sin explicaciones.' },
            ],
          }],
          temperature: 0.1,
        }
      );
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error al analizar la imagen con IA.');
    } finally {
      setScanning(false);
    }
  };

  const handleUseData = () => {
    if (!result) return;
    onFill(result);
    onClose();
  };

  const base = isDarkMode
    ? 'bg-[#080f1e] border-white/10 text-slate-200'
    : 'bg-white border-slate-200 text-slate-800';

  return (
    <div className="fixed inset-0 left-64 top-16 z-[70] flex items-start justify-center p-4 pt-8 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className={`w-full max-w-3xl border rounded-2xl shadow-2xl shadow-black/60 flex flex-col ${base}`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-white/8 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/60'} shrink-0 rounded-t-2xl`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${mode === 'plano' ? 'bg-blue-500/15 border-blue-500/30' : 'bg-violet-500/15 border-violet-500/30'}`}>
              {mode === 'plano' ? <Ruler size={16} className="text-blue-400" /> : <Camera size={16} className="text-violet-400" />}
            </div>
            <div>
              <h2 className="text-[13px] font-black uppercase tracking-tight text-white leading-none">
                {mode === 'plano' ? 'Leer Plano Técnico con IA' : 'Escanear Pieza con IA'}
              </h2>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                {mode === 'plano' ? 'Sube el plano de ingeniería → extrae todos los datos' : 'Foto de pieza → rellena el viajero automáticamente'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className={`flex rounded-xl border overflow-hidden ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
              <button
                onClick={() => { setMode('foto'); setResult(null); setError(null); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                  mode === 'foto'
                    ? 'bg-violet-600 text-white'
                    : isDarkMode ? 'bg-transparent text-slate-500 hover:text-slate-300' : 'bg-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Camera size={11} /> Foto
              </button>
              <button
                onClick={() => { setMode('plano'); setResult(null); setError(null); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                  mode === 'plano'
                    ? 'bg-blue-600 text-white'
                    : isDarkMode ? 'bg-transparent text-slate-500 hover:text-slate-300' : 'bg-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Ruler size={11} /> Plano
              </button>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Upload zone */}
          {!imageDataUrl ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all
                ${dragging
                  ? 'border-violet-500 bg-violet-500/10'
                  : isDarkMode ? 'border-white/10 hover:border-white/20 bg-white/[0.02]' : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                }
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={`p-4 rounded-2xl border ${mode === 'plano' ? 'bg-blue-500/15 border-blue-500/30' : 'bg-violet-500/15 border-violet-500/30'}`}>
                {mode === 'plano'
                  ? <Ruler size={28} className="text-blue-400" />
                  : <Upload size={28} className="text-violet-400" />
                }
              </div>
              <div className="text-center">
                <p className="text-[12px] font-black text-white uppercase tracking-wide">
                  {mode === 'plano' ? 'Arrastra el plano técnico aquí' : 'Arrastra una foto de la pieza aquí'}
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-1">
                  {mode === 'plano'
                    ? 'JPG, PNG, PDF escaneado · o da clic para explorar'
                    : 'JPG, PNG, WEBP · o da clic para explorar'
                  }
                </p>
              </div>
              {mode === 'foto' && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-white/10 rounded-xl text-[9px] font-black text-slate-300 uppercase tracking-widest transition-all"
                >
                  <Camera size={12} /> Usar cámara
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="flex gap-5">
              {/* Preview */}
              <div className="relative shrink-0">
                <img
                  src={imageDataUrl}
                  alt="Pieza a analizar"
                  className="w-48 h-48 object-cover rounded-2xl border border-white/10"
                />
                <button
                  onClick={() => { setImageDataUrl(null); setImageBase64(null); setResult(null); setError(null); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-all"
                >
                  <RotateCcw size={12} />
                </button>
              </div>

              {/* Analyze button or result */}
              <div className="flex-1 flex flex-col justify-center gap-3">
                {!result && !scanning && (
                  <>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {mode === 'plano' ? 'Plano listo para leer' : 'Imagen lista para analizar'}
                    </p>
                    <button
                      onClick={handleScan}
                      className="mcvill-btn-ai w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      {mode === 'plano' ? <Ruler size={14} /> : <Zap size={14} />}
                      {mode === 'plano' ? 'Leer Plano con Gemini Vision' : 'Analizar con Gemini Vision'}
                    </button>
                    <p className="text-[9px] text-slate-600 font-bold text-center">
                      {mode === 'plano'
                        ? 'Lee cuadro de título, tolerancias, material y operaciones'
                        : 'Extrae número de parte, material, operaciones y horas estimadas'
                      }
                    </p>
                  </>
                )}

                {scanning && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 size={28} className={`animate-spin ${mode === 'plano' ? 'text-blue-400' : 'text-violet-400'}`} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      {mode === 'plano' ? 'Leyendo plano técnico...' : 'Gemini Vision analizando...'}
                    </p>
                    <p className="text-[9px] text-slate-600 font-bold text-center">
                      {mode === 'plano'
                        ? 'Extrayendo datos del cuadro de título y geometría'
                        : 'Identificando pieza, material y secuencia de operaciones'
                      }
                    </p>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <AlertTriangle size={13} className="text-rose-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] font-bold text-rose-400">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className={`rounded-2xl border ${isDarkMode ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} overflow-hidden`}>

              {/* Result header */}
              <div className={`flex items-center justify-between px-5 py-3 border-b ${isDarkMode ? 'border-white/8 bg-emerald-500/5' : 'border-slate-200 bg-emerald-50/60'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    Análisis completado
                  </span>
                </div>
                <span className={`px-2 py-0.5 border rounded-full text-[8px] font-black uppercase tracking-widest ${CONFIANZA_COLOR[result.confianza] || CONFIANZA_COLOR.media}`}>
                  Confianza {result.confianza}
                </span>
              </div>

              <div className="p-5 grid grid-cols-2 gap-4">

                {/* Identificación */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <FileText size={10} className="text-blue-400" /> Identificación
                  </p>
                  <div className="space-y-1.5">
                    {result.numero_parte && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-bold">Num. Parte</span>
                        <span className="text-[10px] font-black text-white">{result.numero_parte}</span>
                      </div>
                    )}
                    {result.revision && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-bold">Revisión</span>
                        <span className="text-[10px] font-black text-white">{result.revision}</span>
                      </div>
                    )}
                    {result.cliente && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-bold">Cliente</span>
                        <span className="text-[10px] font-black text-emerald-400">{result.cliente}</span>
                      </div>
                    )}
                    {result.material && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-bold">Material</span>
                        <span className="text-[10px] font-black text-amber-400">{result.material}{result.espesor ? ` · ${result.espesor}` : ''}</span>
                      </div>
                    )}
                  </div>

                  {result.descripcion && (
                    <div className={`mt-3 p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Descripción</p>
                      <p className="text-[10px] text-slate-300 font-medium leading-snug">{result.descripcion}</p>
                    </div>
                  )}
                </div>

                {/* Operaciones */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Hammer size={10} className="text-blue-400" /> Operaciones sugeridas
                  </p>
                  <div className="space-y-1.5">
                    {CT_OPTIONS.filter(ct => result.operaciones_sugeridas?.includes(ct)).map(ct => (
                      <div key={ct} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-wide">{ct}</span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {result.horas_por_operacion?.[ct]
                            ? `${result.horas_por_operacion[ct]}h est.`
                            : '—'}
                        </span>
                      </div>
                    ))}
                    {(!result.operaciones_sugeridas?.length) && (
                      <p className="text-[9px] text-slate-600 font-bold">No se detectaron operaciones.</p>
                    )}
                  </div>

                  <div className={`mt-2 flex items-center justify-between px-3 py-2 rounded-xl ${isDarkMode ? 'bg-white/5 border border-white/8' : 'bg-slate-100 border border-slate-200'}`}>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total estimado</span>
                    <span className="text-[12px] font-black text-violet-400">{result.horas_estimadas_total || 0}h</span>
                  </div>

                  {result.notas_tecnicas && (
                    <div className={`mt-1 p-3 rounded-xl ${isDarkMode ? 'bg-amber-500/5 border border-amber-500/15' : 'bg-amber-50 border border-amber-200'}`}>
                      <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-1">Notas técnicas</p>
                      <p className="text-[9px] text-slate-400 font-medium leading-snug">{result.notas_tecnicas}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className={`px-5 pb-5 flex gap-3`}>
                <button
                  onClick={handleUseData}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-600/25"
                >
                  <ChevronRight size={14} /> Usar estos datos en el viajero
                </button>
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500'}`}
                >
                  Re-escanear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
