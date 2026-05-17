import React, { useState, useRef, useCallback } from 'react';
import { Camera, Plus, Trash2, Zap, RefreshCw, Settings, X, Loader2, CheckCircle2, XCircle, Wifi, WifiOff } from 'lucide-react';
import clsx from 'clsx';
import { aiService } from '../services/aiService';
import { qualityService } from '../services/qualityService';
import { eventBus } from '../utils/eventBus';
import { useConfig } from '../contexts/ConfigContext';

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
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(c => {
          if (c.streamUrl.includes('buffalotrace') || c.id === 'cam-1') {
            return { ...c, streamUrl: 'demo-assembly', snapshotUrl: 'demo-assembly' };
          }
          if (c.streamUrl.includes('pendelcam') || c.streamUrl.includes('uni-heidelberg') || c.id === 'cam-2') {
            return { ...c, streamUrl: 'demo-welding', snapshotUrl: 'demo-welding' };
          }
          return c;
        });
      }
    }
  } catch {}
  return [
    {
      id: 'cam-1',
      name: 'LÍNEA ENSAMBLE 1',
      streamUrl: 'demo-assembly',
      snapshotUrl: 'demo-assembly',
      location: 'Planta Principal - Ensamble'
    },
    {
      id: 'cam-2',
      name: 'ESTACIÓN SOLDADURA 4',
      streamUrl: 'demo-welding',
      snapshotUrl: 'demo-welding',
      location: 'Planta Principal - Soldadura'
    }
  ];
}
function saveCameras(cams: CameraConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cams));
}

// ─── Assembly Line Simulator ──────────────────────────────────────────────────
const AssemblyLineSimulator: React.FC<{ canvasRef: React.RefObject<HTMLCanvasElement> }> = ({ canvasRef }) => {
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const parts = [
      { x: 50, y: 190, type: 'plate', status: 'PASS' },
      { x: 250, y: 190, type: 'gear', status: 'PASS' },
      { x: 450, y: 190, type: 'chassis', status: 'PASS' },
    ];

    const render = () => {
      frame++;
      const w = canvas.width = 640;
      const h = canvas.height = 360;

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const grid = 25;
      for (let x = 0; x < w; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 210, w, 24);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 216, w, 12);

      ctx.fillStyle = '#475569';
      for (let rx = 30; rx < w; rx += 70) {
        ctx.beginPath();
        ctx.arc(rx, 222, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rx, 222);
        const angle = (frame * 0.04) % (Math.PI * 2);
        ctx.lineTo(rx + Math.cos(angle) * 7, 222 + Math.sin(angle) * 7);
        ctx.stroke();
      }

      parts.forEach(p => {
        p.x += 1.8;
        if (p.x > w + 60) {
          p.x = -60;
          p.status = Math.random() > 0.08 ? 'PASS' : 'FAIL';
        }

        ctx.save();
        ctx.translate(p.x, p.y);

        if (p.type === 'plate') {
          ctx.fillStyle = '#64748b';
          ctx.fillRect(-30, -18, 60, 24);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-30, -18, 60, 24);
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.arc(-22, -12, 2.5, 0, Math.PI * 2);
          ctx.arc(22, -12, 2.5, 0, Math.PI * 2);
          ctx.arc(-22, 0, 2.5, 0, Math.PI * 2);
          ctx.arc(22, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'gear') {
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(0, -6, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = '#475569';
          ctx.save();
          ctx.rotate(frame * 0.03);
          for (let i = 0; i < 8; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-5, -24, 10, 10);
          }
          ctx.restore();
          ctx.fillStyle = '#020617';
          ctx.beginPath();
          ctx.arc(0, -6, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#334155';
          ctx.fillRect(-40, -22, 80, 28);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-40, -22, 80, 28);
          ctx.fillStyle = '#020617';
          ctx.fillRect(-25, -16, 20, 12);
          ctx.fillRect(5, -16, 20, 12);
        }

        ctx.restore();

        if (p.x > 260 && p.x < 380) {
          ctx.strokeStyle = p.status === 'PASS' ? '#10b981' : '#f43f5e';
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x - 45, p.y - 30, 90, 50);
          
          ctx.fillStyle = p.status === 'PASS' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(244, 63, 94, 0.95)';
          ctx.fillRect(p.x - 45, p.y - 50, 75, 18);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`${p.type.toUpperCase()}:${p.status}`, p.x - 41, p.y - 37);
        }
      });

      const armX = 320;
      const armY = 55;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(armX, 0);
      ctx.lineTo(armX, armY);
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.rect(armX - 35, armY, 70, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(armX, armY + 9, 5, 0, Math.PI * 2);
      ctx.fill();

      const laserScanY = 175 + Math.sin(frame * 0.08) * 40;
      const scanGrad = ctx.createLinearGradient(0, armY + 18, 0, 230);
      scanGrad.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
      scanGrad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
      ctx.fillStyle = scanGrad;
      ctx.beginPath();
      ctx.moveTo(armX - 6, armY + 18);
      ctx.lineTo(armX + 6, armY + 18);
      ctx.lineTo(armX + 130, 230);
      ctx.lineTo(armX - 130, 230);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(armX - 90, laserScanY);
      ctx.lineTo(armX + 90, laserScanY);
      ctx.stroke();

      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SYS_STAT: ACTIVE_FLOW', 15, 25);
      ctx.fillText('CAM_SOURCE: ASSEMBLY_LINE_1', 15, 38);
      ctx.fillText(`FPS: 30`, 15, 51);
      ctx.fillText('RESOLUTION: 1080p', 15, 64);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
      ctx.fillText('PROCESS: SCANNING', w - 130, 25);
      ctx.fillText('QUALITY ENGINE: ACTIVE', w - 130, 38);
      ctx.fillText('CORS STATUS: EMBEDDED', w - 130, 51);

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, w, h);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full object-cover" />;
};


// ─── Welding Simulator ────────────────────────────────────────────────────────
const WeldingSimulator: React.FC<{ canvasRef: React.RefObject<HTMLCanvasElement> }> = ({ canvasRef }) => {
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    interface Spark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      color: string;
    }
    const sparks: Spark[] = [];

    const render = () => {
      frame++;
      const w = canvas.width = 640;
      const h = canvas.height = 360;

      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(249, 115, 22, 0.06)';
      ctx.lineWidth = 1;
      const grid = 25;
      for (let x = 0; x < w; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(50, 200, 540, 45);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 200, 540, 45);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(50, 200);
      ctx.lineTo(590, 200);
      ctx.stroke();

      const weldSpeed = 1.6;
      const weldRangeX = 460;
      const weldStartX = 90;
      const cycle = (frame * weldSpeed) % (weldRangeX * 2);
      const weldX = cycle < weldRangeX ? weldStartX + cycle : weldStartX + (weldRangeX * 2 - cycle);
      const weldY = 200;

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(weldStartX, 200);
      ctx.lineTo(weldX, 200);
      ctx.stroke();

      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(weldStartX, 200);
      ctx.lineTo(Math.max(weldStartX, weldX - 120), 200);
      ctx.stroke();

      if (frame % 1 === 0) {
        for (let i = 0; i < 5; i++) {
          sparks.push({
            x: weldX,
            y: weldY,
            vx: (Math.random() - 0.5) * 7,
            vy: -Math.random() * 7 - 2,
            life: 0,
            maxLife: 25 + Math.random() * 35,
            color: Math.random() > 0.35 ? '#f97316' : '#facc15'
          });
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.16;
        s.life++;

        if (s.life >= s.maxLife) {
          sparks.splice(i, 1);
        } else {
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.save();
      ctx.translate(weldX, weldY);
      
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(35, -60);
      ctx.lineTo(0, 0);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.fillRect(-5, -12, 10, 12);

      ctx.restore();

      const arcRadius = 15 + Math.random() * 10;
      const grad = ctx.createRadialGradient(weldX, weldY, 1, weldX, weldY, arcRadius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#38bdf8');
      grad.addColorStop(0.6, 'rgba(56, 189, 248, 0.45)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(weldX, weldY, arcRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SYS_STAT: MONITORING', 15, 25);
      ctx.fillText('CAM_SOURCE: WELD_STATION_4', 15, 38);
      ctx.fillText('TEMPERATURE: 1690°C', 15, 51);
      ctx.fillText('CURRENT: 145A', 15, 64);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText('SPECTROMETRY: ACTIVE', w - 140, 25);
      ctx.fillText('ALERTS: ZERO DEFECTS', w - 140, 38);
      ctx.fillText('SHIELDING GAS: ACTIVE', w - 140, 51);

      ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(weldX - 35, weldY - 35, 70, 70);

      ctx.beginPath();
      ctx.moveTo(weldX - 12, weldY); ctx.lineTo(weldX + 12, weldY);
      ctx.moveTo(weldX, weldY - 12); ctx.lineTo(weldX, weldY + 12);
      ctx.stroke();

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, w, h);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full object-cover" />;
};


// ─── Camera Card ─────────────────────────────────────────────────────────────

const CameraCard: React.FC<{
  cam: CameraConfig;
  onDelete: (id: string) => void;
}> = ({ cam, onDelete }) => {
  const { config } = useConfig();
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [online, setOnline] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CameraResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const isDemo = cam.id === 'cam-1' || cam.id === 'cam-2' || cam.streamUrl.startsWith('demo-');

  React.useEffect(() => {
    if (isDemo) {
      setOnline(true);
    }
  }, [isDemo]);

  const captureAndAnalyze = useCallback(async () => {
    setAnalyzing(true);
    setResult(null);
    setShowResult(false);

    try {
      let base64 = '';
      if (isDemo && canvasRef.current) {
        base64 = canvasRef.current.toDataURL('image/jpeg', 0.95).replace(/^data:[^;]+;base64,/, '');
      } else {
        try {
          const res = await fetch(cam.snapshotUrl, { mode: 'cors' });
          const blob = await res.blob();
          base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).replace(/^data:[^;]+;base64,/, ''));
            reader.readAsDataURL(blob);
          });
        } catch {
          const img = imgRef.current;
          if (!img) throw new Error('Sin imagen disponible');
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 640;
          canvas.height = img.naturalHeight || 360;
          canvas.getContext('2d')!.drawImage(img, 0, 0);
          base64 = canvas.toDataURL('image/jpeg', 0.9).replace(/^data:[^;]+;base64,/, '');
        }
      }

      const prompt = `Actúa como Inspector de Calidad de ${config.companyName}. Analiza este frame en vivo de cámara de piso de planta.
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
  }, [cam, isDemo, config.companyName]);

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
      {/* Camera feed */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {isDemo ? (
          cam.id === 'cam-1' ? (
            <AssemblyLineSimulator canvasRef={canvasRef} />
          ) : (
            <WeldingSimulator canvasRef={canvasRef} />
          )
        ) : (
          <img
            ref={imgRef}
            src={cam.streamUrl}
            alt={cam.name}
            className="w-full h-full object-cover"
            onLoad={() => setOnline(true)}
            onError={() => setOnline(false)}
            crossOrigin="anonymous"
          />
        )}

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
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-400 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all disabled:opacity-40 hover:shadow-[0_0_14px_rgba(99,102,241,0.7)]"
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
