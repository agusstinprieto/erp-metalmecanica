import React, { useState, useRef, useCallback } from 'react';
import { Camera, Plus, Trash2, Zap, RefreshCw, Settings, X, Loader2, CheckCircle2, XCircle, Wifi, WifiOff } from 'lucide-react';
import clsx from 'clsx';
import { aiService } from '../services/aiService';
import { qualityService } from '../services/qualityService';
import { eventBus } from '../utils/eventBus';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CameraConfig {
  id: string;
  name: string;
  streamUrl: string;       // MJPEG stream URL  (para visualizar)
  snapshotUrl: string;     // JPEG snapshot URL (para capturar frame)
  location?: string;
}

interface CameraResult {
  decision: 'PASS' | 'FAIL';
  confidence: number;
  defects: string[];
  analysis: string;
}

const STORAGE_KEY = 'mcvill_quality_cameras';

function loadCameras(): CameraConfig[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveCameras(cams: CameraConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cams));
}

// ─── Camera Card ─────────────────────────────────────────────────────────────

const CameraCard: React.FC<{
  cam: CameraConfig;
  onDelete: (id: string) => void;
}> = ({ cam, onDelete }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [online, setOnline] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CameraResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const captureAndAnalyze = useCallback(async () => {
    setAnalyzing(true);
    setResult(null);
    setShowResult(false);

    try {
      // Intenta obtener el snapshot via fetch (mismo origen o CORS abierto)
      let base64 = '';
      try {
        const res = await fetch(cam.snapshotUrl, { mode: 'cors' });
        const blob = await res.blob();
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).replace(/^data:[^;]+;base64,/, ''));
          reader.readAsDataURL(blob);
        });
      } catch {
        // Fallback: capturar desde el <img> MJPEG con canvas
        const img = imgRef.current;
        if (!img) throw new Error('Sin imagen disponible');
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 640;
        canvas.height = img.naturalHeight || 360;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        base64 = canvas.toDataURL('image/jpeg', 0.9).replace(/^data:[^;]+;base64,/, '');
      }

      const prompt = `Actúa como Inspector de Calidad de McVill. Analiza este frame en vivo de cámara de piso de planta.
Identifica cualquier anomalía, defecto, situación de riesgo o no conformidad visible.
Responde ÚNICAMENTE con JSON:
{
  "decision": "PASS" | "FAIL",
  "confidence": 0-100,
  "defects": ["descripción breve"],
  "analysis": "resumen en español (1-2 oraciones)"
}`;

      const raw = await aiService.analyzeVision(base64, prompt);
      const clean = (typeof raw === 'string' ? raw : JSON.stringify(raw))
        .replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
      const parsed: CameraResult = JSON.parse(clean);
      setResult(parsed);
      setShowResult(true);

      // Si es FAIL, crear NC automáticamente
      if (parsed.decision === 'FAIL') {
        const ncNum = `NC-CAM-${Date.now()}`;
        await qualityService.createNoConformidad({
          numero: ncNum,
          tipo: 'proceso',
          descripcion: parsed.defects.length > 0 ? parsed.defects.join('; ') : parsed.analysis,
          origen: 'inspeccion',
          area: cam.name,
          severidad: parsed.confidence >= 85 ? 'critica' : parsed.confidence >= 60 ? 'mayor' : 'menor',
          causa_raiz: `Detección automática cámara "${cam.name}" — confianza ${parsed.confidence}%`,
          status: 'abierta',
          notas: `[LIVE CAM IA] ${cam.name} — ${parsed.analysis}`,
        });

        eventBus.emit('SHOW_NOTIFICATION', {
          type: 'quality_fail',
          title: `ALERTA CÁMARA — ${cam.name}`,
          message: `NC ${parsed.confidence >= 85 ? 'CRÍTICA' : 'MAYOR'}: ${parsed.defects[0] || parsed.analysis}`,
        });
      }
    } catch (err) {
      console.error('Camera analysis error:', err);
      setResult({ decision: 'FAIL', confidence: 0, defects: ['Error de conexión'], analysis: 'No se pudo obtener el frame de la cámara. Verifica la URL y CORS.' });
      setShowResult(true);
    } finally {
      setAnalyzing(false);
    }
  }, [cam]);

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
      {/* Camera feed */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        <img
          ref={imgRef}
          src={cam.streamUrl}
          alt={cam.name}
          className="w-full h-full object-cover"
          onLoad={() => setOnline(true)}
          onError={() => setOnline(false)}
          crossOrigin="anonymous"
        />

        {/* Online / Offline badge */}
        <div className={clsx(
          'absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase border',
          online
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/20 border-rose-500/30 text-rose-400'
        )}>
          {online ? <Wifi size={9} /> : <WifiOff size={9} />}
          {online ? 'LIVE' : 'SIN SEÑAL'}
        </div>

        {/* Location */}
        {cam.location && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded">
            {cam.location}
          </div>
        )}

        {/* Result overlay */}
        {showResult && result && (
          <div className={clsx(
            'absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm',
            result.decision === 'PASS' ? 'text-emerald-400' : 'text-rose-400'
          )}>
            {result.decision === 'PASS'
              ? <CheckCircle2 size={40} />
              : <XCircle size={40} />}
            <p className="text-xl font-black mt-2">{result.decision === 'PASS' ? 'APROBADO' : 'RECHAZADO'}</p>
            <p className="text-[9px] font-black opacity-70">{result.confidence}% confianza</p>
            {result.defects[0] && (
              <p className="text-[9px] text-center px-4 mt-1 opacity-80">{result.defects[0]}</p>
            )}
            <button onClick={() => setShowResult(false)} className="mt-3 text-[8px] font-black text-white/50 hover:text-white uppercase tracking-widest">
              Cerrar
            </button>
          </div>
        )}

        {/* Analyzing overlay */}
        {analyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm text-blue-400">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-[10px] font-black mt-2 uppercase tracking-widest">Analizando frame...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black text-white uppercase tracking-tight">{cam.name}</p>
          <p className="text-[8px] text-slate-600 font-mono truncate max-w-[160px]">{cam.streamUrl}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={captureAndAnalyze}
            disabled={analyzing}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-400 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all disabled:opacity-40"
          >
            {analyzing ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
            Analizar IA
          </button>
          <button
            onClick={() => onDelete(cam.id)}
            className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-600 hover:text-rose-400 transition-all"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Config Modal ─────────────────────────────────────────────────────────────

const ConfigModal: React.FC<{ onSave: (cam: CameraConfig) => void; onClose: () => void }> = ({ onSave, onClose }) => {
  const [form, setForm] = useState<Omit<CameraConfig, 'id'>>({
    name: '', streamUrl: '', snapshotUrl: '', location: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.streamUrl) return;
    const snap = form.snapshotUrl || form.streamUrl.replace('/mjpg/video.mjpg', '/jpg/image.jpg');
    onSave({ ...form, snapshotUrl: snap, id: Date.now().toString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-blue-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Agregar Cámara</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-all"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Nombre / Ubicación</label>
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ej: Soldadura CNC-01"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white outline-none focus:border-blue-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">URL Stream MJPEG</label>
            <input
              value={form.streamUrl}
              onChange={e => setForm(p => ({ ...p, streamUrl: e.target.value }))}
              placeholder="http://192.168.1.x/mjpg/video.mjpg"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white font-mono outline-none focus:border-blue-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
              URL Snapshot JPEG <span className="text-slate-600 normal-case font-bold">(opcional — para captura IA)</span>
            </label>
            <input
              value={form.snapshotUrl}
              onChange={e => setForm(p => ({ ...p, snapshotUrl: e.target.value }))}
              placeholder="http://192.168.1.x/jpg/image.jpg"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white font-mono outline-none focus:border-blue-500/50"
            />
            <p className="text-[8px] text-slate-600 mt-1">Si no se especifica, se usa la URL del stream.</p>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Zona / Área</label>
            <input
              value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              placeholder="Ej: Línea 2 — Estación 4"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="pt-2 flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-white transition-all">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
              Agregar Cámara
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

export const CameraFeedPanel: React.FC = () => {
  const [cameras, setCameras] = useState<CameraConfig[]>(loadCameras);
  const [showConfig, setShowConfig] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const addCamera = (cam: CameraConfig) => {
    const updated = [...cameras, cam];
    setCameras(updated);
    saveCameras(updated);
  };

  const deleteCamera = (id: string) => {
    const updated = cameras.filter(c => c.id !== id);
    setCameras(updated);
    saveCameras(updated);
  };

  const refresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Camera size={14} className="text-blue-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">
            Cámaras en Vivo
          </span>
          <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black rounded-full">
            {cameras.length} activa{cameras.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
            title="Refrescar feeds"
          >
            <RefreshCw size={12} />
          </button>
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <Plus size={11} /> Agregar Cámara
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {cameras.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-40">
            <Camera size={48} className="text-slate-600" />
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sin cámaras configuradas</p>
              <p className="text-[9px] text-slate-600 uppercase font-bold mt-1">
                Agrega las URLs de tus cámaras IP del piso de planta
              </p>
            </div>
            <button
              onClick={() => setShowConfig(true)}
              className="px-4 py-2 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
            >
              + Configurar primera cámara
            </button>
          </div>
        ) : (
          <div key={refreshKey} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {cameras.map(cam => (
              <CameraCard key={cam.id} cam={cam} onDelete={deleteCamera} />
            ))}
          </div>
        )}
      </div>

      {showConfig && <ConfigModal onSave={addCamera} onClose={() => setShowConfig(false)} />}
    </div>
  );
};
