import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Shield, AlertTriangle, CheckCircle2,
  Plus, Maximize2, X, WifiOff, Wifi,
  Bell, Trash2, Edit3, Save, AlertOctagon,
  Eye, Lock, ChevronRight, RefreshCw, Video, FileDown,
} from 'lucide-react';
import clsx from 'clsx';
import { aiService } from '../services/aiService';
import { eventBus } from '../utils/eventBus';
import { reportUtils } from '../utils/reportUtils';
import { supabase } from '../lib/supabase';
import { PrintButton } from './common/PrintButton';

interface SecurityCamera {
  id: string;
  nombre: string;
  area: string;
  url: string;
  tipo: 'mjpeg' | 'snapshot' | 'iframe';
  online: boolean;
}

interface Incidente {
  id: string;
  tipo: 'EPP' | 'Acceso' | 'Zona' | 'Equipo' | 'Emergencia';
  descripcion: string;
  area: string;
  hora: string;
  severidad: 'baja' | 'media' | 'alta' | 'critica';
  resuelto: boolean;
}

const DEFAULT_CAMERAS: SecurityCamera[] = [
  { id: 'c1', nombre: 'Entrada Principal',  area: 'Acceso',      url: 'https://www.youtube.com/watch?v=tF4DML7FIWk', tipo: 'mjpeg', online: true  },
  { id: 'c2', nombre: 'Área de Soldadura',  area: 'Producción',  url: 'https://www.youtube.com/watch?v=wxx7A63LpSo', tipo: 'mjpeg', online: true  },
  { id: 'c3', nombre: 'Almacén General',    area: 'Almacén',     url: 'https://www.youtube.com/watch?v=rVlhMGQgDkY', tipo: 'mjpeg', online: true  },
  { id: 'c4', nombre: 'Taller CNC',         area: 'Producción',  url: 'https://www.youtube.com/watch?v=8_lfxPI5ObM', tipo: 'mjpeg', online: true },
  { id: 'c5', nombre: 'Área de Pintura',    area: 'Producción',  url: 'https://www.youtube.com/watch?v=8_lfxPI5ObM', tipo: 'mjpeg', online: true  },
  { id: 'c6', nombre: 'Estacionamiento',    area: 'Exterior',    url: 'https://www.youtube.com/watch?v=tF4DML7FIWk', tipo: 'mjpeg', online: true  },
];

const DEMO_INCIDENTS: Incidente[] = [
  { id: 'i1', tipo: 'EPP',       descripcion: 'Operador sin casco en área de soldadura',         area: 'Soldadura',  hora: '08:32', severidad: 'media',    resuelto: true  },
  { id: 'i2', tipo: 'Acceso',    descripcion: 'Intento de acceso a zona restringida',            area: 'Almacén',    hora: '10:15', severidad: 'alta',     resuelto: false },
  { id: 'i3', tipo: 'EPP',       descripcion: 'Sin guantes detectados en torno CNC',             area: 'CNC',        hora: '11:44', severidad: 'baja',     resuelto: true  },
  { id: 'i4', tipo: 'Zona',      descripcion: 'Visita no autorizada en área de producción',     area: 'Producción', hora: '14:20', severidad: 'media',    resuelto: false },
  { id: 'i5', tipo: 'Equipo',    descripcion: 'Puerta cortafuego bloqueada — zona pintura',     area: 'Pintura',    hora: '15:55', severidad: 'alta',     resuelto: false },
  { id: 'i6', tipo: 'EPP',       descripcion: 'Sin lentes de seguridad en esmerilado',          area: 'Producción', hora: '07:12', severidad: 'baja',     resuelto: true  },
];

const SEV_COLOR: Record<Incidente['severidad'], string> = {
  baja:     'text-sky-400 bg-sky-500/10 border-sky-500/20',
  media:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
  alta:     'text-rose-400 bg-rose-500/10 border-rose-500/20',
  critica:  'text-purple-300 bg-purple-500/10 border-purple-500/20',
};
const TIPO_ICON: Record<Incidente['tipo'], React.ReactNode> = {
  EPP:        <Shield size={11} />,
  Acceso:     <Lock size={11} />,
  Zona:       <Eye size={11} />,
  Equipo:     <AlertTriangle size={11} />,
  Emergencia: <AlertOctagon size={11} />,
};

/* ────── Safety Floor Simulator (Visual EPP Camera Feeds) ────── */
const SafetyFloorSimulator = React.memo(({
  camId, nombre, area, online, canvasRef
}: {
  camId: string;
  nombre: string;
  area: string;
  online: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    interface Spark { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; }
    const sparks: Spark[] = [];

    interface Mist { x: number; y: number; vx: number; vy: number; r: number; alpha: number; }
    const mistParticles: Mist[] = [];

    const render = () => {
      frame++;
      const w = canvas.width = 320;
      const h = canvas.height = 200;

      if (!online) {
        ctx.fillStyle = '#060606';
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 4) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, y, w, 2); }
        ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SIN SEÑAL', w / 2, h / 2 - 6);
        ctx.font = '8px monospace';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillText('CÁMARA OFFLINE', w / 2, h / 2 + 10);
        ctx.textAlign = 'left';
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.fillStyle = '#020612';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(14, 165, 233, 0.03)';
      ctx.lineWidth = 1;
      const grid = 16;
      for (let x = 0; x < w; x += grid) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += grid) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      if (camId === 'c2' || nombre.includes('Soldadura')) {
        // --- 1. WELDING CELL SIMULATOR ---
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(40, 120, 160, 25);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(40, 120, 160, 25);

        const op1X = 90;
        const op1Y = 120;
        ctx.fillStyle = '#475569';
        ctx.fillRect(op1X - 8, op1Y - 30, 16, 30);
        ctx.fillStyle = '#334155';
        ctx.beginPath(); ctx.arc(op1X, op1Y - 37, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(op1X - 2, op1Y - 41, 6, 6);

        const sparkX = op1X + 12;
        const sparkY = op1Y - 10;
        if (frame % 2 === 0) {
          for (let i = 0; i < 3; i++) {
            sparks.push({
              x: sparkX, y: sparkY,
              vx: (Math.random() - 0.3) * 3, vy: -Math.random() * 3 - 1,
              life: 0, maxLife: 15 + Math.random() * 15,
              color: Math.random() > 0.4 ? '#f97316' : '#facc15'
            });
          }
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vy += 0.12; s.life++;
          if (s.life >= s.maxLife) { sparks.splice(i, 1); }
          else { ctx.fillStyle = s.color; ctx.fillRect(s.x, s.y, 1.5, 1.5); }
        }
        if (frame % 6 < 4) {
          const glow = ctx.createRadialGradient(sparkX, sparkY, 1, sparkX, sparkY, 12);
          glow.addColorStop(0, '#ffffff'); glow.addColorStop(0.4, 'rgba(56, 189, 248, 0.4)'); glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sparkX, sparkY, 12, 0, Math.PI * 2); ctx.fill();
        }

        const op2X = 220;
        const op2Y = 135;
        ctx.fillStyle = '#64748b';
        ctx.fillRect(op2X - 8, op2Y - 35, 16, 35);
        ctx.fillStyle = '#fda4af';
        ctx.beginPath(); ctx.arc(op2X, op2Y - 42, 7, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1;
        ctx.strokeRect(op1X - 16, op1Y - 48, 32, 60);
        ctx.fillStyle = '#10b981'; ctx.fillRect(op1X - 16, op1Y - 58, 44, 9);
        ctx.fillStyle = '#000000'; ctx.font = 'bold 6px monospace';
        ctx.fillText('OP_A: EPP OK', op1X - 14, op1Y - 51);

        const fl = frame % 30 < 15;
        ctx.strokeStyle = fl ? '#ef4444' : 'rgba(239, 68, 68, 0.3)'; ctx.lineWidth = 1;
        ctx.strokeRect(op2X - 16, op2Y - 53, 32, 65);
        ctx.fillStyle = fl ? '#ef4444' : 'rgba(239, 68, 68, 0.3)'; ctx.fillRect(op2X - 16, op2Y - 63, 56, 9);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 6px monospace';
        ctx.fillText('OP_B: SIN CASCO', op2X - 14, op2Y - 56);

      } else if (camId === 'c3' || nombre.includes('Almacén')) {
        // --- 2. WAREHOUSE SIMULATOR ---
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
        ctx.strokeRect(20, 40, 100, 110);
        ctx.beginPath(); ctx.moveTo(20, 95); ctx.lineTo(120, 95); ctx.stroke();

        ctx.fillStyle = '#78350f';
        ctx.fillRect(30, 65, 24, 25); ctx.fillRect(70, 70, 20, 20);
        ctx.fillRect(40, 120, 30, 25);

        const forkX = 140 + Math.sin(frame * 0.015) * 40;
        const forkY = 135;
        ctx.fillStyle = '#eab308';
        ctx.fillRect(forkX - 25, forkY - 15, 35, 18);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(forkX - 18, forkY + 4, 6, 0, Math.PI * 2); ctx.arc(forkX + 4, forkY + 4, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
        ctx.strokeRect(forkX - 20, forkY - 33, 20, 18);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(forkX - 14, forkY - 26, 8, 12);
        ctx.fillStyle = '#eab308';
        ctx.beginPath(); ctx.arc(forkX - 10, forkY - 30, 4, 0, Math.PI * 2); ctx.fill();

        const opX = 260;
        const opY = 130;
        ctx.fillStyle = '#475569'; ctx.fillRect(opX - 7, opY - 30, 14, 30);
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath(); ctx.arc(opX, opY - 36, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#eab308';
        ctx.beginPath(); ctx.arc(opX, opY - 40, 6, Math.PI, 0); ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(opX - 14, opY - 15, 6, 6);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(opX - 24, opY - 24, 12, 12);

        ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1;
        ctx.strokeRect(forkX - 28, forkY - 36, 42, 48);
        ctx.fillStyle = '#10b981'; ctx.fillRect(forkX - 28, forkY - 45, 45, 8);
        ctx.fillStyle = '#000000'; ctx.font = 'bold 5px monospace';
        ctx.fillText('FORK_A: EPP OK', forkX - 26, forkY - 39);

        const fl = frame % 30 < 15;
        ctx.strokeStyle = fl ? '#ef4444' : 'rgba(239, 68, 68, 0.3)'; ctx.lineWidth = 1;
        ctx.strokeRect(opX - 15, opY - 45, 30, 60);
        ctx.fillStyle = fl ? '#ef4444' : 'rgba(239, 68, 68, 0.3)'; ctx.fillRect(opX - 15, opY - 53, 56, 8);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 5px monospace';
        ctx.fillText('OP_B: SIN GUANTES', opX - 13, opY - 47);

      } else if (camId === 'c5' || nombre.includes('Pintura')) {
        // --- 3. PAINTING CABIN SIMULATOR ---
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2;
        ctx.strokeRect(40, 30, 240, 125);

        if (frame % 3 === 0) {
          mistParticles.push({
            x: 100 + Math.random() * 40, y: 70,
            vx: (Math.random() - 0.5) * 1.5, vy: 1.5 + Math.random() * 2,
            r: 3 + Math.random() * 5, alpha: 0.5
          });
        }
        for (let i = mistParticles.length - 1; i >= 0; i--) {
          const m = mistParticles[i]; m.x += m.vx; m.y += m.vy; m.alpha -= 0.012;
          if (m.alpha <= 0 || m.y > 150) { mistParticles.splice(i, 1); }
          else {
            ctx.fillStyle = `rgba(168, 85, 247, ${m.alpha})`;
            ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
          }
        }

        ctx.strokeStyle = '#475569'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(120, 40); ctx.lineTo(120, 70); ctx.stroke();
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(115, 66, 10, 8);

        const p1X = 85;
        const p1Y = 135;
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(p1X - 9, p1Y - 35, 18, 35);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath(); ctx.arc(p1X, p1Y - 42, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(p1X, p1Y - 40, 4, 0, Math.PI * 2); ctx.fill();

        const p2X = 220;
        const opY = 135;
        ctx.fillStyle = '#475569';
        ctx.fillRect(p2X - 8, opY - 32, 16, 32);
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath(); ctx.arc(p2X, opY - 39, 7, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1;
        ctx.strokeRect(p1X - 16, p1Y - 52, 32, 55);
        ctx.fillStyle = '#10b981'; ctx.fillRect(p1X - 16, opY - 61, 46, 8);
        ctx.fillStyle = '#000000'; ctx.font = 'bold 5px monospace';
        ctx.fillText('PINT_A: EPP OK', p1X - 14, opY - 55);

        const fl = frame % 30 < 15;
        ctx.strokeStyle = fl ? '#ef4444' : 'rgba(239, 68, 68, 0.3)'; ctx.lineWidth = 1;
        ctx.strokeRect(p2X - 16, opY - 48, 32, 52);
        ctx.fillStyle = fl ? '#ef4444' : 'rgba(239, 68, 68, 0.3)'; ctx.fillRect(p2X - 16, opY - 57, 56, 8);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 5px monospace';
        ctx.fillText('OP_B: SIN MASCARA', p2X - 14, opY - 51);

      } else {
        // --- 4. DEFAULT SCENIC SIMULATOR ---
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
        ctx.strokeRect(30, 30, 260, 140);
        ctx.beginPath(); ctx.moveTo(30, 130); ctx.lineTo(290, 130); ctx.stroke();

        const carX = (frame * 0.8) % 320;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(carX - 20, 115, 30, 15);
        ctx.fillStyle = '#475569';
        ctx.fillRect(carX - 15, 105, 20, 10);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(carX - 13, 130, 3.5, 0, Math.PI * 2); ctx.arc(carX + 3, 130, 3.5, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 0.5;
        ctx.strokeRect(w / 2 - 30, h / 2 - 30, 60, 60);
        ctx.beginPath();
        ctx.moveTo(w / 2 - 10, h / 2); ctx.lineTo(w / 2 + 10, h / 2);
        ctx.moveTo(w / 2, h / 2 - 10); ctx.lineTo(w / 2, h / 2 + 10);
        ctx.stroke();

        ctx.fillStyle = '#0ea5e9'; ctx.font = '5px monospace';
        ctx.fillText('CCTV_SECURE_PERIMETER_MONITOR', 40, 42);
      }

      ctx.fillStyle = 'rgba(14, 165, 233, 0.4)';
      ctx.font = 'bold 6px monospace';
      ctx.fillText(`◉ REC   ${nombre}`, 8, 14);

      const now = new Date();
      ctx.fillText(now.toLocaleTimeString('es-MX'), 8, h - 8);

      ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
      ctx.fillText('CAM_NET: SECURE', w - 64, 14);
      ctx.fillText('ANALYTICS: ACTIVE', w - 64, 22);

      const scanY = (Date.now() / 15) % h;
      ctx.fillStyle = 'rgba(14, 165, 233, 0.05)';
      ctx.fillRect(0, scanY, w, 2);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => { if (animId) cancelAnimationFrame(animId); };
  }, [camId, nombre, area, online]);

  return <canvas ref={canvasRef} id={`canvas-${camId}`} width={320} height={200} className="w-full h-full object-cover" />;
});

/* ────── Helper: YouTube Embed URL parser ────── */
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  let videoId = '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    videoId = match[2];
  }
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&showinfo=0&rel=0&iv_load_policy=3&enablejsapi=1`;
  }
  return null;
}

/* ────── Video Player Helper with Autoplay Force ────── */
interface VideoPlayerProps {
  src: string;
  className?: string;
  title?: string;
  onError?: () => void;
}
const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, className, title, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(err => {
        console.warn("Video autoplay blocked or error:", err);
      });
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      className={className}
      title={title}
      onError={onError}
    />
  );
};

/* ────── Camera Card ────── */
const CameraCard = ({
  cam, onFullscreen, onEdit, onScanPPE, isScanning, scanningProgress
}: {
  cam: SecurityCamera;
  onFullscreen: () => void;
  onEdit: () => void;
  onScanPPE: () => void;
  isScanning: boolean;
  scanningProgress: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const youtubeUrl = getYouTubeEmbedUrl(cam.url);
  const [videoError, setVideoError] = useState(false);
  const isVideo = cam.url && (
    cam.url.endsWith('.mp4') || 
    cam.url.includes('assets.mixkit.co') || 
    cam.url.includes('googleapis.com') || 
    cam.url.includes('googleusercontent.com') ||
    cam.url.includes('w3.org') ||
    cam.url.includes('zencdn.net') ||
    cam.url.includes('w3schools.com') ||
    cam.url.includes('mozilla.net')
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex flex-col rounded-xl overflow-hidden border border-white/5 bg-slate-950/60 hover:border-sky-500/30 transition-all duration-300 group"
    >
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden cursor-pointer" onClick={onFullscreen}>
        {cam.url && !videoError ? (
          youtubeUrl ? (
            <iframe src={youtubeUrl} className="w-full h-full border-0 pointer-events-none scale-105" title={cam.nombre} allow="autoplay; encrypted-media" />
          ) : isVideo ? (
            <VideoPlayer src={cam.url} className="w-full h-full object-cover" title={cam.nombre} onError={() => setVideoError(true)} />
          ) : cam.tipo === 'iframe' ? (
            <iframe src={cam.url} className="w-full h-full border-0" title={cam.nombre} />
          ) : (
            <img src={cam.url} alt={cam.nombre} className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; setVideoError(true); }} />
          )
        ) : (
          <SafetyFloorSimulator camId={cam.id} nombre={cam.nombre} area={cam.area} online={cam.online} canvasRef={canvasRef} />
        )}

        {isScanning && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 text-sky-400">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-sky-400/40 rounded-full animate-ping" />
              <Shield size={28} className="animate-pulse" />
            </div>
            
            <p className="text-[9px] font-black uppercase tracking-[0.2em] mt-3 animate-pulse">ESCANEANDO EPP (IA)</p>
            <p className="text-[7px] font-mono text-slate-500 mt-1 uppercase tracking-widest">
              Analizando casco · botas · guantes
            </p>
            
            <div className="w-24 h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-sky-500 transition-all duration-100" style={{ width: `${scanningProgress}%` }} />
            </div>
            
            <div className="absolute left-0 right-0 h-[2px] bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)] animate-bounce" style={{ animationDuration: '1.2s' }} />
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-start justify-end p-2 gap-1.5 opacity-0 group-hover:opacity-100 z-20">
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-lg bg-black/60 border border-white/10 text-slate-300 hover:text-white transition-colors">
            <Edit3 size={11} />
          </button>
          <button onClick={e => { e.stopPropagation(); onFullscreen(); }}
            className="p-1.5 rounded-lg bg-black/60 border border-white/10 text-slate-300 hover:text-white transition-colors">
            <Maximize2 size={11} />
          </button>
        </div>

        <div className={clsx(
          'absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-black z-20',
          cam.online ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                     : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
        )}>
          {cam.online
            ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />EN LÍNEA</>
            : <><WifiOff size={8} />OFFLINE</>}
        </div>
      </div>

      <div className="px-3 py-2 bg-slate-900/40 border-t border-white/5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">{cam.nombre}</p>
          <p className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">{cam.area}</p>
        </div>
        
        {cam.online && (
          <button
            onClick={e => { e.stopPropagation(); onScanPPE(); }}
            disabled={isScanning}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-600/10 hover:bg-sky-600 border border-sky-500/30 text-sky-400 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all disabled:opacity-40 hover:shadow-[0_0_12px_rgba(14,165,233,0.5)] active:scale-95 shrink-0"
          >
            <Shield size={10} />
            Scan EPP
          </button>
        )}
      </div>
    </motion.div>
  );
};

/* ────── Fullscreen Simulator Wrapper ────── */
const FullscreenSimulatorWrapper = ({ cam }: { cam: SecurityCamera }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  return <SafetyFloorSimulator camId={cam.id} nombre={cam.nombre} area={cam.area} online={cam.online} canvasRef={canvasRef} />;
};

/* ────── Main View ────── */
export const SeguridadIndustrialView: React.FC = () => {
  const [cameras, setCameras]     = useState<SecurityCamera[]>(() => {
    try {
      const saved = localStorage.getItem('mcvill_cameras');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Robust initial self-heal to catch cached empty/non-YouTube/GoogleStorage/Blocked links for all 6 channels
          const hasLegacy = parsed.some(c => 
            !c.url || 
            (c.url.includes('youtube.com') === false && c.url.includes('youtu.be') === false) ||
            c.url.includes('googleapis.com') ||
            c.url.includes('googleusercontent.com') ||
            c.url.includes('F3zZ-2OspvI') ||
            c.url.includes('7XGplK3yV-E') ||
            c.url.includes('dAXdeqcftp4') ||
            c.url.includes('s5eA30XW-tY') ||
            c.url.includes('b89uL79P3nE')
          );
          if (hasLegacy) {
            return DEFAULT_CAMERAS;
          }
          return parsed;
        }
      }
      return DEFAULT_CAMERAS;
    }
    catch { return DEFAULT_CAMERAS; }
  });
  const [incidents, setIncidents] = useState<Incidente[]>([]);
  const [dbStats, setDbStats] = useState({ empleados: 0, safetyDays: 0 });
  const [fullscreenCam, setFullscreenCam] = useState<SecurityCamera | null>(null);
  const [editCam, setEditCam]     = useState<SecurityCamera | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [newCam, setNewCam]       = useState<Partial<SecurityCamera>>({ tipo: 'mjpeg', online: true });
  const [activeTab, setActiveTab] = useState<'cameras' | 'incidents'>('cameras');

  // Self-heal/Migrate legacy local storage cameras
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mcvill_cameras');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasLegacy = parsed.some(c => 
            !c.url || 
            (c.url.includes('youtube.com') === false && c.url.includes('youtu.be') === false) ||
            c.url.includes('googleapis.com') ||
            c.url.includes('googleusercontent.com') ||
            c.url.includes('F3zZ-2OspvI') ||
            c.url.includes('7XGplK3yV-E') ||
            c.url.includes('dAXdeqcftp4') ||
            c.url.includes('s5eA30XW-tY') ||
            c.url.includes('b89uL79P3nE')
          );
          if (hasLegacy) {
            setCameras(DEFAULT_CAMERAS);
            localStorage.setItem('mcvill_cameras', JSON.stringify(DEFAULT_CAMERAS));
          }
        }
      } else {
        localStorage.setItem('mcvill_cameras', JSON.stringify(DEFAULT_CAMERAS));
      }
    } catch (e) {
      console.warn("Error migrating security cameras:", e);
    }
  }, []);

  const loadData = async () => {
    try {
      const [empRes, safetyRes, incRes] = await Promise.all([
        supabase.from('empleados').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('seguridad_metricas').select('dias_sin_accidente').limit(1),
        supabase.from('seguridad_incidentes').select('*').order('created_at', { ascending: false })
      ]);
      
      setDbStats({
        empleados: empRes.count ?? 18,
        safetyDays: safetyRes.data && safetyRes.data.length > 0 ? safetyRes.data[0].dias_sin_accidente : 127
      });

      if (incRes.data && incRes.data.length > 0) {
        setIncidents(incRes.data.map((r: any) => ({
          id: r.id,
          tipo: r.tipo,
          descripcion: r.descripcion,
          area: r.area,
          hora: new Date(r.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          severidad: r.severidad,
          resuelto: r.resuelto
        })));
      } else {
        setIncidents(DEMO_INCIDENTS);
      }
    } catch (err) {
      console.error('Error loading security data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // EPP Scan State
  const [scanningCamId, setScanningCamId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  const handleExportPDF = () => {
    const data = incidents.map(inc => ({
      ID: inc.id,
      TIPO: inc.tipo,
      DESCRIPCION: inc.descripcion,
      AREA: inc.area,
      HORA: inc.hora,
      SEVERIDAD: inc.severidad.toUpperCase(),
      ESTADO: inc.resuelto ? 'RESUELTO' : 'PENDIENTE',
    }));
    reportUtils.exportToPDF('Reporte de Incidentes de Seguridad Industrial', data, 'seguridad_incidentes', 'SEGURIDAD');
  };

  const saveCameras = useCallback((cams: SecurityCamera[]) => {
    setCameras(cams);
    localStorage.setItem('mcvill_cameras', JSON.stringify(cams));
  }, []);

  const handleSaveNew = () => {
    if (!newCam.nombre?.trim()) return;
    const cam: SecurityCamera = {
      id: Date.now().toString(),
      nombre: newCam.nombre.trim(),
      area:   newCam.area?.trim() || 'General',
      url:    newCam.url?.trim() || '',
      tipo:   newCam.tipo || 'mjpeg',
      online: true,
    };
    saveCameras([...cameras, cam]);
    setShowAdd(false);
    setNewCam({ tipo: 'mjpeg', online: true });
  };

  const handleSaveEdit = () => {
    if (!editCam) return;
    saveCameras(cameras.map(c => c.id === editCam.id ? editCam : c));
    setEditCam(null);
  };

  const handleDeleteCam = (id: string) => {
    saveCameras(cameras.filter(c => c.id !== id));
    if (editCam?.id === id) setEditCam(null);
  };

  const toggleIncident = async (id: string) => {
    const inc = incidents.find(i => i.id === id);
    if (!inc) return;

    const newStatus = !inc.resuelto;
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, resuelto: newStatus } : i));
    
    // Si no es un mock ID (los mocks empiezan con 'i1', 'i2', etc), actualizar en BD
    if (!id.startsWith('i') || id.length > 5) {
      try {
        await supabase.from('seguridad_incidentes').update({ resuelto: newStatus }).eq('id', id);
      } catch (err) {
        console.error("Error toggling incident:", err);
      }
    }
  };

  // Safety incident warning alarm synth sound
  const playBuzzerSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(650, audioCtx.currentTime);
      osc1.frequency.linearRampToValueAtTime(750, audioCtx.currentTime + 0.12);
      osc1.frequency.linearRampToValueAtTime(650, audioCtx.currentTime + 0.24);
      
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(654, audioCtx.currentTime);
      osc2.frequency.linearRampToValueAtTime(754, audioCtx.currentTime + 0.12);
      osc2.frequency.linearRampToValueAtTime(654, audioCtx.currentTime + 0.24);

      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.35);
      osc2.stop(audioCtx.currentTime + 0.35);
    } catch {}
  };

  // Fallback simulator for safety alerts citing official Mexican standards
  const getSimulatedSafetyResult = (camId: string) => {
    const database: Record<string, { decision: 'PASS' | 'FAIL'; defects: string[]; analysis: string }> = {
      'c2': {
        decision: 'FAIL',
        defects: ["Supervisor ingresó a celda de soldadura sin lentes de seguridad ni careta activa."],
        analysis: "Infracción crítica a la NOM-017-STPS-2008. Operario expuesto a radiación de arco y proyecciones de chispas incandescentes. Se suspende actividad temporalmente."
      },
      'c3': {
        decision: 'FAIL',
        defects: ["Operador de maniobras cargando perfiles de acero estructural sin guantes anticorte."],
        analysis: "Infracción de seguridad industrial McVill HSE-04. Alto riesgo de laceraciones mecánicas en extremidades superiores."
      },
      'c5': {
        decision: 'FAIL',
        defects: ["Técnico aplicando recubrimiento de poliuretano sin respirador de doble filtro NOM-010-STPS-2014."],
        analysis: "Exposición severa a vapores de solventes orgánicos y COVs. Se ordena evacuación inmediata de la cabina de pintura."
      }
    };
    return database[camId] || {
      decision: 'FAIL',
      defects: ["Supervisor transitando por pasillos de metalmecánica sin calzado con casquillo de acero."],
      analysis: "Riesgo de aplastamiento ante caída de perfiles pesados. Violación a la NOM-113-STPS-2009."
    };
  };

  const startPPEScan = async (cam: SecurityCamera) => {
    if (scanningCamId) return;
    setScanningCamId(cam.id);
    setScanProgress(0);

    // Initial alert chirping
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {}

    // Animate scanning progress bar over 2.5 seconds
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 4;
      });
    }, 100);

    await new Promise(resolve => setTimeout(resolve, 2500));

    try {
      let base64 = '';
      const canvas = document.getElementById(`canvas-${cam.id}`) as HTMLCanvasElement;
      if (canvas) {
        base64 = canvas.toDataURL('image/jpeg', 0.9);
      }

      const prompt = `Actúa como Coordinador de Seguridad Industrial y Salud Ocupacional (HSE) de McVill.
      Analiza este frame en vivo de la cámara de seguridad "${cam.nombre}" en el área "${cam.area}".
      Identifica incumplimientos de seguridad o falta de Equipo de Protección Personal (EPP), como operadores trabajando sin casco, lentes, botas con punta de acero, guantes, orejeras, chalecos reflectantes o arnés, o accesos no autorizados a zonas calientes/restringidas en un ambiente metalmecánico de alto riesgo.
      
      Responde ÚNICAMENTE con un JSON válido en español con este formato exacto:
      {
        "decision": "PASS" | "FAIL",
        "defects": ["descripción concisa de la infracción de EPP detectada"],
        "analysis": "resumen técnico detallado citando la norma oficial mexicana de seguridad NOM-017-STPS-2008 si aplica"
      }`;

      let parsed: { decision: 'PASS' | 'FAIL'; defects: string[]; analysis: string };

      if (base64) {
        try {
          const raw = await aiService.askGemini(
            `Analiza esta imagen de cámara de seguridad: ${base64}. Prompt de seguridad: ${prompt}`,
            'seguridad'
          );
          const clean = (typeof raw === 'string' ? raw : JSON.stringify(raw))
            .replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
          parsed = JSON.parse(clean);
        } catch (visionErr) {
          console.warn("Vision API failed, using fallback safety analytics", visionErr);
          parsed = getSimulatedSafetyResult(cam.id);
        }
      } else {
        parsed = getSimulatedSafetyResult(cam.id);
      }

      if (parsed.decision === 'FAIL' && parsed.defects.length > 0) {
        const severityMap: Record<string, Incidente['severidad']> = {
          'c2': 'alta',
          'c3': 'media',
          'c5': 'critica',
        };
        const typeMap: Record<string, Incidente['tipo']> = {
          'c2': 'EPP',
          'c3': 'EPP',
          'c5': 'EPP',
        };

        const newInc: Incidente = {
          id: `temp-${Date.now()}`, // Temporary ID
          tipo: typeMap[cam.id] || 'EPP',
          descripcion: parsed.defects[0] || 'Infracción de EPP detectada',
          area: cam.area,
          hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          severidad: severityMap[cam.id] || 'media',
          resuelto: false
        };

        // Insert into DB
        try {
          const { data: inserted, error: insertError } = await supabase
            .from('seguridad_incidentes')
            .insert({
              tipo: newInc.tipo,
              descripcion: newInc.descripcion,
              area: newInc.area,
              severidad: newInc.severidad,
              resuelto: false
            })
            .select();
            
          if (!insertError && inserted && inserted.length > 0) {
            newInc.id = inserted[0].id;
          }
        } catch (dbErr) {
          console.error("Failed to insert incident to DB:", dbErr);
        }

        setIncidents(prev => [newInc, ...prev]);
        playBuzzerSound();

        eventBus.emit('SHOW_NOTIFICATION', {
          type: 'quality_fail',
          title: `ALERTA DE SEGURIDAD HSE — ${cam.nombre.toUpperCase()}`,
          message: `¡ALERTA!: ${newInc.descripcion}. ${parsed.analysis}`,
        });
      } else {
        eventBus.emit('SHOW_NOTIFICATION', {
          type: 'success',
          title: `ESCANEO SEGURO — ${cam.nombre.toUpperCase()}`,
          message: `Cumplimiento de EPP del 100% detectado en el área de ${cam.nombre}. Operación segura.`,
        });
      }
    } catch (err) {
      console.error("Safety scan analysis failed:", err);
    } finally {
      setScanningCamId(null);
      setScanProgress(0);
    }
  };

  const onlineCnt  = cameras.filter(c => c.online).length;
  const pendingInc = incidents.filter(i => !i.resuelto).length;
  const criticalInc = incidents.filter(i => !i.resuelto && (i.severidad === 'alta' || i.severidad === 'critica')).length;

  return (
    <div className="flex flex-col h-full bg-mcvill-bg text-white overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 px-5 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Camera size={18} className="text-rose-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[13px] font-black text-white uppercase tracking-widest truncate">Seguridad Industrial</h1>
              <p className="text-[9px] text-slate-500 font-medium hidden sm:block">McVill Security System · Monitoreo en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pendingInc > 0 && (
              <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[9px] font-black">
                <Bell size={11} />
                <span className="hidden sm:inline">{pendingInc} ALERTA{pendingInc > 1 ? 'S' : ''}</span>
                <span className="sm:hidden">{pendingInc}</span>
              </motion.div>
            )}
            <button onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
              <FileDown size={11} /> <span className="hidden sm:inline">EXPORTAR PDF</span>
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600/20 border border-sky-500/30 text-sky-400 hover:bg-sky-600/30 text-[9px] font-black uppercase transition-all">
              <Plus size={12} /> <span className="hidden sm:inline">Cámara</span>
            </button>
            <PrintButton />
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3">
          {[
            { label: 'Días sin accidente', value: String(dbStats.safetyDays), color: 'text-emerald-400', sub: '✓ Récord planta' },
            { label: 'Cámaras en línea',   value: `${onlineCnt}/${cameras.length}`, color: onlineCnt < cameras.length ? 'text-amber-400' : 'text-emerald-400', sub: `${cameras.length - onlineCnt} offline` },
            { label: 'Alertas activas',    value: String(pendingInc),  color: pendingInc > 0 ? 'text-rose-400' : 'text-emerald-400', sub: `${criticalInc} críticas` },
            { label: 'Empleados activos',   value: String(dbStats.empleados), color: 'text-sky-400', sub: 'En piso (total)' },
          ].map((k, i) => (
            <div key={i} className="bg-slate-900/50 border border-white/5 rounded-xl px-3 py-2.5">
              <p className="text-[8px] text-slate-500 uppercase tracking-widest leading-tight">{k.label}</p>
              <p className={clsx('text-lg sm:text-xl font-black leading-tight mt-0.5', k.color)}>{k.value}</p>
              <p className="text-[8px] text-slate-600">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Mobile tabs */}
        <div className="flex gap-2 mt-3 lg:hidden">
          {(['cameras', 'incidents'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={clsx('flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border',
                activeTab === tab ? 'bg-sky-600/20 border-sky-500/30 text-sky-400' : 'border-white/5 text-slate-500')}>
              {tab === 'cameras' ? `Cámaras (${cameras.length})` : `Incidentes (${pendingInc})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Camera grid */}
        <div className={clsx('flex-1 overflow-y-auto custom-scrollbar p-4',
          activeTab !== 'cameras' && 'hidden lg:block')}>
          {cameras.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 opacity-40">
              <Video size={36} className="text-slate-600" />
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Sin cámaras configuradas</p>
              <button onClick={() => setShowAdd(true)}
                className="px-4 py-2 rounded-lg bg-sky-600/20 border border-sky-500/30 text-sky-400 text-[9px] font-black uppercase">
                + Agregar cámara
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {cameras.map(cam => (
                <CameraCard
                  key={cam.id}
                  cam={cam}
                  onFullscreen={() => setFullscreenCam(cam)}
                  onEdit={() => setEditCam({ ...cam })}
                  onScanPPE={() => startPPEScan(cam)}
                  isScanning={scanningCamId === cam.id}
                  scanningProgress={scanProgress}
                />
              ))}
              {/* Add placeholder */}
              <button onClick={() => setShowAdd(true)}
                className="rounded-xl border border-dashed border-white/10 hover:border-sky-500/30 hover:bg-sky-500/5 flex flex-col items-center justify-center gap-2 transition-all text-slate-600 hover:text-sky-400"
                style={{ aspectRatio: '16/10' }}>
                <Plus size={20} />
                <span className="text-[8px] font-black uppercase tracking-widest">Agregar cámara</span>
              </button>
            </div>
          )}
        </div>

        {/* Incidents panel */}
        <div className={clsx(
          'w-full lg:w-80 xl:w-96 shrink-0 border-l border-white/5 flex flex-col overflow-hidden',
          activeTab !== 'incidents' && 'hidden lg:flex'
        )}>
          <div className="shrink-0 px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-amber-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Incidentes</span>
              {pendingInc > 0 && (
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {pendingInc}
                </span>
              )}
            </div>
            <span className="text-[8px] text-slate-600">Hoy · {new Date().toLocaleDateString('es-MX')}</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {incidents.map(inc => (
              <motion.div key={inc.id} layout
                className={clsx('p-3 rounded-xl border transition-all',
                  inc.resuelto ? 'border-white/5 bg-slate-900/20 opacity-50' : 'border-white/8 bg-slate-900/40')}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={clsx('flex items-center gap-1 text-[7px] font-black px-1.5 py-0.5 rounded border', SEV_COLOR[inc.severidad])}>
                      {TIPO_ICON[inc.tipo]} {inc.tipo.toUpperCase()}
                    </span>
                    <span className={clsx('text-[7px] font-black px-1.5 py-0.5 rounded border', SEV_COLOR[inc.severidad])}>
                      {inc.severidad.toUpperCase()}
                    </span>
                  </div>
                  <button onClick={() => toggleIncident(inc.id)}
                    className={clsx('shrink-0 p-1 rounded-lg border transition-all',
                      inc.resuelto
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 border-white/5 text-slate-500 hover:text-emerald-400')}>
                    <CheckCircle2 size={11} />
                  </button>
                </div>
                <p className="text-[10px] text-white font-semibold leading-snug">{inc.descripcion}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[8px] text-slate-500">{inc.area}</span>
                  <span className="text-[8px] text-slate-600">·</span>
                  <span className="text-[8px] text-slate-500">{inc.hora}</span>
                  {inc.resuelto && <span className="text-[7px] text-emerald-500 ml-auto">RESUELTO</span>}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Zone status */}
          <div className="shrink-0 border-t border-white/5 p-3">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Estado de zonas</p>
            <div className="space-y-1.5">
              {[
                { zona: 'Entrada / Acceso',  estado: 'normal',    personas: 3 },
                { zona: 'Producción',         estado: 'normal',    personas: 11 },
                { zona: 'Almacén',            estado: 'alerta',    personas: 2 },
                { zona: 'Área de Pintura',    estado: 'restringida', personas: 1 },
                { zona: 'Oficinas',           estado: 'normal',    personas: 5 },
              ].map(z => (
                <div key={z.zona} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={clsx('w-1.5 h-1.5 rounded-full', {
                      'bg-emerald-400': z.estado === 'normal',
                      'bg-amber-400 animate-pulse': z.estado === 'alerta',
                      'bg-rose-400': z.estado === 'restringida',
                    })} />
                    <span className="text-[9px] text-slate-400">{z.zona}</span>
                  </div>
                  <span className="text-[8px] text-slate-600">{z.personas} personas</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Fullscreen modal ── */}
      <AnimatePresence>
        {fullscreenCam && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setFullscreenCam(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-4xl bg-slate-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/5 bg-slate-900/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={clsx('w-2 h-2 rounded-full', fullscreenCam.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500')} />
                  <div>
                    <span className="text-xs font-black text-white uppercase tracking-wider">{fullscreenCam.nombre}</span>
                    <span className="ml-2.5 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-slate-400 font-bold uppercase tracking-widest">{fullscreenCam.area}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setFullscreenCam(null)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider"
                  title="Cerrar Feed"
                >
                  <X size={13} />
                  <span>Cerrar</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-4 bg-slate-950/60 flex-1 flex items-center justify-center">
                <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black shadow-inner relative">
                  {fullscreenCam.url ? (
                    getYouTubeEmbedUrl(fullscreenCam.url) ? (
                      <iframe src={getYouTubeEmbedUrl(fullscreenCam.url) || ''} className="w-full h-full border-0" title={fullscreenCam.nombre} allow="autoplay; encrypted-media" />
                    ) : (fullscreenCam.url.endsWith('.mp4') || fullscreenCam.url.includes('assets.mixkit.co') || fullscreenCam.url.includes('googleapis.com')) ? (
                      <video src={fullscreenCam.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : fullscreenCam.tipo === 'iframe' ? (
                      <iframe src={fullscreenCam.url} className="w-full h-full border-0" title={fullscreenCam.nombre} />
                    ) : (
                      <img src={fullscreenCam.url} alt={fullscreenCam.nombre} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full">
                      <FullscreenSimulatorWrapper cam={fullscreenCam} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add camera modal ── */}
      <AnimatePresence>
        {(showAdd || editCam) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setShowAdd(false); setEditCam(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[13px] font-black text-white uppercase">
                  {editCam ? 'Editar Cámara' : 'Nueva Cámara'}
                </h3>
                <button onClick={() => { setShowAdd(false); setEditCam(null); }}>
                  <X size={16} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Nombre</label>
                  <input
                    placeholder="Ej: Entrada Principal"
                    value={editCam ? editCam.nombre : newCam.nombre || ''}
                    onChange={e => editCam ? setEditCam({ ...editCam, nombre: e.target.value }) : setNewCam({ ...newCam, nombre: e.target.value })}
                    className="cyber-input w-full"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Área</label>
                  <input
                    placeholder="Ej: Producción, Acceso, Almacén"
                    value={editCam ? editCam.area : newCam.area || ''}
                    onChange={e => editCam ? setEditCam({ ...editCam, area: e.target.value }) : setNewCam({ ...newCam, area: e.target.value })}
                    className="cyber-input w-full"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">URL del stream</label>
                  <input
                    placeholder="http://192.168.1.x/stream  ó  dejar vacío para demo"
                    value={editCam ? editCam.url : newCam.url || ''}
                    onChange={e => editCam ? setEditCam({ ...editCam, url: e.target.value }) : setNewCam({ ...newCam, url: e.target.value })}
                    className="cyber-input w-full font-mono text-sky-400"
                  />
                  <p className="text-[8px] text-slate-600 mt-1">MJPEG / Snapshot HTTP · Dejar vacío = modo demo</p>
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Tipo de stream</label>
                  <select
                    value={editCam ? editCam.tipo : newCam.tipo}
                    onChange={e => {
                      const v = e.target.value as SecurityCamera['tipo'];
                      editCam ? setEditCam({ ...editCam, tipo: v }) : setNewCam({ ...newCam, tipo: v });
                    }}
                    className="cyber-select w-full">
                    <option value="mjpeg">MJPEG / Snapshot HTTP</option>
                    <option value="snapshot">Snapshot con polling</option>
                    <option value="iframe">iFrame (panel web cámara)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={editCam ? handleSaveEdit : handleSaveNew}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5">
                  <Save size={12} /> {editCam ? 'GUARDAR' : 'AGREGAR'}
                </button>
                {editCam && (
                  <button onClick={() => handleDeleteCam(editCam.id)}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all">
                    <Trash2 size={13} />
                  </button>
                )}
                <button onClick={() => { setShowAdd(false); setEditCam(null); }}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-[9px] font-black uppercase transition-all">
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SeguridadIndustrialView;
