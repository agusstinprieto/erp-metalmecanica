import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  CheckCircle2, AlertCircle, Search, Plus, Download, Filter,
  BarChart3, Calendar, ShieldCheck, FileText, Clock, Settings,
  Trash2, Activity, X, Loader2, Zap, ClipboardCheck, AlertTriangle,
  ChevronDown, Cpu
} from 'lucide-react';
import { qualityService } from '../services/qualityService';
import { VisualIAInspection } from './VisualIAInspection';
import { useConfig } from '../contexts/ConfigContext';
import { useSearch } from '../contexts/SearchContext';
import { appConfirm, appPrompt } from '../lib/dialogs';
import { reportUtils } from '../utils/reportUtils';
import { Toast } from './common/Toast';

type Tab = 'inspections' | 'nc' | 'audits' | 'metrics' | 'cam_hub';

const emptyNCForm = {
  numero: '', tipo: 'proceso', descripcion: '', origen: 'inspeccion',
  responsable: '', area: '', severidad: 'menor',
  causa_raiz: '', accion_correctiva: '', accion_preventiva: '',
  fecha_compromiso: '', status: 'abierta'
};

const emptyAuditForm = {
  numero: '', tipo: 'proceso', alcance: '', auditor: '',
  area_auditada: '', fecha_programada: '', hallazgos: '',
  no_conformidades_encontradas: 0, resultado: 'pendiente', status: 'programada'
};

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


export const QualityView: React.FC = () => {
  const { isDarkMode } = useConfig();
  const { searchTerm, setSearchTerm } = useSearch();

  // Inspections
  const [inspections, setInspections] = useState<any[]>([]);
  const [productionOrders, setProductionOrders] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [inspFormData, setInspFormData] = useState({
    order_id: '', status: 'passed' as 'passed' | 'failed' | 'conditional',
    details: { notes: '', checkpoints: { dimensions: true, material_quality: true, finish: true } }
  });

  // No Conformidades
  const [ncs, setNcs] = useState<any[]>([]);
  const [showNCModal, setShowNCModal] = useState(false);
  const [editingNC, setEditingNC] = useState<any>(null);
  const [ncForm, setNcForm] = useState({ ...emptyNCForm });

  // Auditorías
  const [audits, setAudits] = useState<any[]>([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [editingAudit, setEditingAudit] = useState<any>(null);
  const [auditForm, setAuditForm] = useState({ ...emptyAuditForm });

  // UI
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('inspections');
  const [showIAModal, setShowIAModal] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const CAM_STORAGE_KEY = 'mcvill_quality_feeds';
  const [activeFeeds, setActiveFeeds] = useState<{ id: string; url: string; label: string }[]>(() => {
    const defaultFeeds = [
      { id: 'cam-1', url: 'demo-assembly', label: 'LÍNEA ENSAMBLE 1' },
      { id: 'cam-2', url: 'demo-welding', label: 'ESTACIÓN SOLDADURA 4' },
      { id: 'cam-3', url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/bottles-detection.mp4', label: 'LÍNEA EMBOTELLADO (REAL)' },
    ];
    try {
      const saved = localStorage.getItem('mcvill_quality_feeds');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const upgraded = parsed.map(f => {
            if (f.url.includes('buffalotrace') || f.id === 'cam-1') {
              return { ...f, url: 'demo-assembly' };
            }
            if (f.url.includes('pendelcam') || f.url.includes('uni-heidelberg') || f.id === 'cam-2') {
              return { ...f, url: 'demo-welding' };
            }
            if (f.id === 'cam-3') {
              return { ...f, url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/bottles-detection.mp4', label: 'LÍNEA EMBOTELLADO (REAL)' };
            }
            return f;
          });
          if (!upgraded.some(f => f.id === 'cam-3')) {
            upgraded.push(defaultFeeds[2]);
          }
          return upgraded;
        }
      }
    } catch {}
    return defaultFeeds;
  });
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  
  const canvasRef1 = React.useRef<HTMLCanvasElement>(null);
  const canvasRef2 = React.useRef<HTMLCanvasElement>(null);

  const updateFeeds = (feeds: typeof activeFeeds) => {
    setActiveFeeds(feeds);
    localStorage.setItem(CAM_STORAGE_KEY, JSON.stringify(feeds));
  };

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    Promise.all([loadInspections(), loadProductionOrders(), loadNCs(), loadAudits()]);
  }, []);

  const loadInspections = async () => {
    try { setLoading(true); setInspections(await qualityService.getInspections() || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const loadProductionOrders = async () => {
    try { setProductionOrders(await qualityService.getProductionOrders() || []); } catch (e) { console.error(e); }
  };
  const loadNCs = async () => {
    try { setNcs(await qualityService.getNoConformidades() || []); } catch (e) { console.error(e); }
  };
  const loadAudits = async () => {
    try { setAudits(await qualityService.getAuditorias() || []); } catch (e) { console.error(e); }
  };

  // ── Inspections handlers ─────────────────────────────────────────────────────
  const handleEditInsp = (item: any) => {
    setEditingInspection(item);
    setInspFormData({ order_id: item.order_id, status: item.status, details: item.details || { notes: '', checkpoints: { dimensions: true, material_quality: true, finish: true } } });
    setShowModal(true);
  };
  const handleDeleteInsp = async (id: string) => {
    if (!await appConfirm('¿ELIMINAR REPORTE DE INSPECCIÓN? ESTA ACCIÓN ES PERMANENTE.')) return;
    await qualityService.deleteInspection(id);
    loadInspections();
    notify('Inspección eliminada', 'error');
  };
  const handleSaveInsp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspFormData.order_id) return;
    try {
      setIsSubmitting(true);
      if (editingInspection) { await qualityService.updateInspection(editingInspection.id, inspFormData); notify('Inspección actualizada'); }
      else { await qualityService.createInspection(inspFormData); notify('Inspección registrada'); }
      setShowModal(false); setEditingInspection(null);
      setInspFormData({ order_id: '', status: 'passed', details: { notes: '', checkpoints: { dimensions: true, material_quality: true, finish: true } } });
      loadInspections();
    } catch (e) { console.error(e); notify('Error al guardar la inspección — intenta de nuevo', 'error'); } finally { setIsSubmitting(false); }
  };

  // ── NC handlers ──────────────────────────────────────────────────────────────
  const nextNCNumber = () => `NC-${new Date().getFullYear()}-${String(ncs.length + 1).padStart(3, '0')}`;
  const openNCModal = (nc?: any) => {
    if (nc) { setEditingNC(nc); setNcForm({ ...emptyNCForm, ...nc }); }
    else { setEditingNC(null); setNcForm({ ...emptyNCForm, numero: nextNCNumber() }); }
    setShowNCModal(true);
  };
  const handleSaveNC = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingNC) { await qualityService.updateNoConformidad(editingNC.id, ncForm); notify('NC actualizada'); }
      else { await qualityService.createNoConformidad(ncForm); notify('No Conformidad creada'); }
      setShowNCModal(false); loadNCs();
    } catch (e) { console.error(e); notify('Error al guardar la No Conformidad — intenta de nuevo', 'error'); } finally { setIsSubmitting(false); }
  };
  const handleDeleteNC = async (id: string) => {
    if (!await appConfirm('¿ELIMINAR ESTA NO CONFORMIDAD?')) return;
    await qualityService.deleteNoConformidad(id);
    loadNCs(); notify('NC eliminada', 'error');
  };

  // ── Audit handlers ───────────────────────────────────────────────────────────
  const nextAuditNumber = () => `AUD-${new Date().getFullYear()}-${String(audits.length + 1).padStart(3, '0')}`;
  const openAuditModal = (audit?: any) => {
    if (audit) { setEditingAudit(audit); setAuditForm({ ...emptyAuditForm, ...audit }); }
    else { setEditingAudit(null); setAuditForm({ ...emptyAuditForm, numero: nextAuditNumber() }); }
    setShowAuditModal(true);
  };
  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingAudit) { await qualityService.updateAuditoria(editingAudit.id, auditForm); notify('Auditoría actualizada'); }
      else { await qualityService.createAuditoria(auditForm); notify('Auditoría creada'); }
      setShowAuditModal(false); loadAudits();
    } catch (e) { console.error(e); notify('Error al guardar la Auditoría — intenta de nuevo', 'error'); } finally { setIsSubmitting(false); }
  };
  const handleDeleteAudit = async (id: string) => {
    if (!await appConfirm('¿ELIMINAR ESTA AUDITORÍA?')) return;
    await qualityService.deleteAuditoria(id);
    loadAudits(); notify('Auditoría eliminada', 'error');
  };

  // ── Computed stats ───────────────────────────────────────────────────────────
  const passedCount = inspections.filter(i => i.status === 'passed').length;
  const passRate = inspections.length ? ((passedCount / inspections.length) * 100).toFixed(1) : '—';
  const openNCs = ncs.filter(n => n.status === 'abierta').length;
  const criticalNCs = ncs.filter(n => n.severidad === 'critica').length;
  const pendingAudits = audits.filter(a => a.status === 'programada').length;

  const getInspStatus = (s: string) => ({
    passed: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    failed: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    conditional: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  }[s] || 'text-slate-400 bg-slate-400/10 border-slate-400/20');

  const getNCSeverity = (s: string) => ({
    critica: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
    mayor:   'text-amber-500 bg-amber-500/10 border-amber-500/30',
    menor:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
  }[s] || 'text-slate-400 bg-slate-400/10 border-slate-400/20');

  const getNCStatus = (s: string) => ({
    abierta:      'text-rose-400 bg-rose-500/10 border-rose-500/20',
    en_proceso:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    verificacion: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    cerrada:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  }[s] || 'text-slate-400 bg-slate-400/10 border-slate-400/20');

  const getAuditStatus = (s: string) => ({
    programada:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
    en_proceso:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
    completada:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    cerrada:     'text-slate-400 bg-slate-400/10 border-slate-400/20',
  }[s] || 'text-slate-400 bg-slate-400/10 border-slate-400/20');

  const getAuditResult = (r: string) => ({
    conforme:     'text-emerald-400',
    no_conforme:  'text-rose-400',
    observado:    'text-amber-400',
    pendiente:    'text-slate-500',
  }[r] || 'text-slate-500');

  const filteredInspections = inspections.filter(i =>
    (i.production_orders?.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.production_orders?.product_name || i.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.product_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.batch_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredNCs = ncs.filter(n =>
    n.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.area?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredAudits = audits.filter(a =>
    a.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.alcance?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.area_auditada?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'inspections', label: 'Inspecciones', icon: ShieldCheck },
    { id: 'nc',          label: 'No Conformidades', icon: AlertTriangle },
    { id: 'audits',      label: 'Auditorías', icon: ClipboardCheck },
    { id: 'cam_hub',     label: 'Video Hub', icon: Activity },
    { id: 'metrics',     label: 'Six Sigma', icon: BarChart3 },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {notification && (
        <Toast message={notification.message} type={notification.type} isVisible={!!notification} onClose={() => setNotification(null)} />
      )}

      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-mcvill-accent" size={16} />
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              CALIDAD <span className="text-mcvill-accent">SGC</span>
            </h2>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest hidden md:block">
            Six Sigma · CAPA · Auditorías ISO 9001
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'inspections' && (
            <>
              <button onClick={() => setShowIAModal(true)} className="mcvill-btn-ai px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Zap size={12} className="animate-pulse" /> ANÁLISIS IA
              </button>
              <button onClick={() => { setEditingInspection(null); setShowModal(true); }} className="mcvill-btn-create px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Plus size={12} strokeWidth={3} /> NUEVA INSPECCIÓN
              </button>
            </>
          )}
          {activeTab === 'nc' && (
            <button onClick={() => openNCModal()} className="mcvill-btn-create px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Plus size={12} strokeWidth={3} /> NUEVA NC
            </button>
          )}
          {activeTab === 'audits' && (
            <button onClick={() => openAuditModal()} className="mcvill-btn-create px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Plus size={12} strokeWidth={3} /> NUEVA AUDITORÍA
            </button>
          )}
          {activeTab === 'metrics' && (
            <button onClick={() => reportUtils.exportToPDF('Reporte Six Sigma', inspections.map(i => ({ ORDEN: i.production_orders?.order_number, ESTADO: i.status, FECHA: new Date(i.created_at).toLocaleDateString() })), 'six_sigma', 'CALIDAD')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
              <Download size={12} /> EXPORTAR
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/20 shrink-0">
        {[
          { label: 'TASA ÉXITO', value: `${passRate}%`, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'NCs ABIERTAS', value: String(openNCs), icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'NCs CRÍTICAS', value: String(criticalNCs), icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'AUDITORÍAS PEND.', value: String(pendingAudits), icon: ClipboardCheck, color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10' },
        ].map((stat, i) => (
          <div key={i} className="px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 hover:bg-white/[0.04] transition-all">
            <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 shrink-0', stat.bg, stat.color)}>
              <stat.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
              <p className={clsx('text-xl font-black tracking-tighter leading-none', stat.color)}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 flex items-center gap-4 shrink-0">
        <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-[9px] font-black uppercase tracking-widest',
                activeTab === tab.id ? 'bg-mcvill-accent text-white shadow-lg shadow-mcvill-accent/20' : 'text-slate-500 hover:text-white')}>
              <tab.icon size={12} />{tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={12} />
          <input type="text" placeholder="BUSCAR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 outline-none text-[10px] font-bold text-white placeholder:text-slate-700 focus:border-mcvill-accent/50 transition-all" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/40">

        {/* ── Tab: Inspecciones ── */}
        {activeTab === 'inspections' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-white/10 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-4 py-2">Identificador</th>
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2 text-center">Fecha</th>
                <th className="px-4 py-2 text-center">Veredicto</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-32 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-mcvill-accent animate-spin" />
                    <p className="text-[10px] font-black text-slate-500 tracking-widest uppercase">Cargando registros...</p>
                  </div>
                </td></tr>
              ) : filteredInspections.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-24 text-center">
                  <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 font-black text-[11px] tracking-widest uppercase">Sin inspecciones registradas</p>
                </td></tr>
              ) : filteredInspections.map(item => (
                <tr key={item.id} className="hover:bg-blue-500/5 transition-all group">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center text-mcvill-accent">
                        <FileText size={13} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-white uppercase">{item.product_code || item.production_orders?.order_number ? `OT #${item.production_orders?.order_number}` : '—'}</p>
                        <p className="text-[8px] text-slate-600 uppercase tracking-widest">{item.batch_number || item.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-[10px] font-black text-slate-300 uppercase">{item.product_name || item.production_orders?.product_name || 'N/A'}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(item.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest uppercase', getInspStatus(item.status))}>
                      <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse', item.status === 'passed' ? 'bg-emerald-500' : item.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500')} />
                      {item.status === 'passed' ? 'CERTIFICADO' : item.status === 'failed' ? 'RECHAZADO' : 'OBSERVADO'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleEditInsp(item)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-mcvill-accent transition-all"><Settings size={12} /></button>
                      <button onClick={() => handleDeleteInsp(item.id)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Tab: No Conformidades ── */}
        {activeTab === 'nc' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-white/10 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-4 py-2">Número / Tipo</th>
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2">Responsable / Área</th>
                <th className="px-4 py-2 text-center">Severidad</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredNCs.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-24 text-center">
                  <AlertTriangle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 font-black text-[11px] tracking-widest uppercase">Sin No Conformidades registradas</p>
                  <button onClick={() => openNCModal()} className="mt-4 px-4 py-2 bg-rose-600/20 border border-rose-500/30 text-rose-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">
                    + Registrar primera NC
                  </button>
                </td></tr>
              ) : filteredNCs.map(nc => (
                <tr key={nc.id} className="hover:bg-rose-500/5 transition-all group">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                        <AlertTriangle size={13} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-white uppercase">{nc.numero}</p>
                        <p className="text-[8px] text-slate-600 uppercase tracking-widest">{nc.tipo} · {nc.origen}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 max-w-xs">
                    <p className="text-[10px] font-bold text-slate-300 truncate">{nc.descripcion}</p>
                    {nc.causa_raiz && <p className="text-[8px] text-slate-600 uppercase tracking-widest truncate">Causa: {nc.causa_raiz}</p>}
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-[10px] font-black text-slate-300 uppercase">{nc.responsable || '—'}</p>
                    <p className="text-[8px] text-slate-600 uppercase tracking-widest">{nc.area || '—'}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest uppercase', getNCSeverity(nc.severidad))}>
                      {nc.severidad}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest uppercase', getNCStatus(nc.status))}>
                      {nc.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => openNCModal(nc)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-mcvill-accent transition-all"><Settings size={12} /></button>
                      <button onClick={() => handleDeleteNC(nc.id)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Tab: Auditorías ── */}
        {activeTab === 'audits' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-white/10 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-4 py-2">Número / Tipo</th>
                <th className="px-4 py-2">Alcance / Área</th>
                <th className="px-4 py-2">Auditor</th>
                <th className="px-4 py-2 text-center">Fecha</th>
                <th className="px-4 py-2 text-center">Resultado</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAudits.length === 0 ? (
                <tr><td colSpan={7} className="px-8 py-24 text-center">
                  <ClipboardCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 font-black text-[11px] tracking-widest uppercase">Sin auditorías registradas</p>
                  <button onClick={() => openAuditModal()} className="mt-4 px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                    + Programar primera auditoría
                  </button>
                </td></tr>
              ) : filteredAudits.map(audit => (
                <tr key={audit.id} className="hover:bg-blue-500/5 transition-all group">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center text-mcvill-accent">
                        <ClipboardCheck size={13} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-white uppercase">{audit.numero}</p>
                        <p className="text-[8px] text-slate-600 uppercase tracking-widest">{audit.tipo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 max-w-xs">
                    <p className="text-[10px] font-bold text-slate-300 truncate">{audit.alcance}</p>
                    <p className="text-[8px] text-slate-600 uppercase tracking-widest">{audit.area_auditada || '—'}</p>
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-[10px] font-black text-slate-300 uppercase">{audit.auditor || '—'}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <p className="text-[10px] font-black text-slate-400">{audit.fecha_programada ? new Date(audit.fecha_programada).toLocaleDateString() : '—'}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={clsx('text-[9px] font-black uppercase tracking-widest', getAuditResult(audit.resultado))}>
                      {audit.resultado}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest uppercase', getAuditStatus(audit.status))}>
                      {audit.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => openAuditModal(audit)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-mcvill-accent transition-all"><Settings size={12} /></button>
                      <button onClick={() => handleDeleteAudit(audit.id)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Tab: Video Hub ── */}
        {activeTab === 'cam_hub' && (
          <div className="p-6 flex flex-col h-full gap-6 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
              {activeFeeds.map(feed => (
                <div key={feed.id} className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden flex flex-col group hover:border-mcvill-accent/40 transition-all">
                  <div className="px-4 py-2 bg-black/40 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{feed.label}</span>
                    </div>
                    <span className="text-[8px] font-black text-slate-500 uppercase">Live Feed · {feed.id}</span>
                  </div>
                  <div className="relative flex-1 bg-black aspect-video flex items-center justify-center overflow-hidden">
                    {feed.url ? (
                      feed.url.includes('.mp4') || feed.url.includes('raw.githubusercontent') || feed.url.startsWith('https://assets.mixkit.co') ? (
                        <video src={feed.url} autoPlay loop muted playsInline crossOrigin="anonymous" className="w-full h-full object-cover" />
                      ) : feed.id === 'cam-1' || feed.url === 'demo-assembly' ? (
                        <AssemblyLineSimulator canvasRef={canvasRef1} />
                      ) : feed.id === 'cam-2' || feed.url === 'demo-welding' ? (
                        <WeldingSimulator canvasRef={canvasRef2} />
                      ) : (
                        <img src={feed.url} className="w-full h-full object-contain" alt={feed.label} />
                      )
                    ) : (
                      <div className="text-center p-8">
                        <AlertTriangle className="text-amber-500/40 mx-auto mb-2" size={32} />
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sin señal de video</p>
                        <p className="text-[8px] text-slate-700 uppercase font-bold mt-1">Configura la URL de la cámara IP</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={async () => {
                          const url = await appPrompt('URL de la Cámara (MJPEG):', 'Configurar Cámara', feed.url);
                          if (url !== null) updateFeeds(activeFeeds.map(f => f.id === feed.id ? { ...f, url } : f));
                        }}
                        className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/20 transition-all"
                      >
                        CONFIGURAR URL
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedFeedId(feed.id);
                          setShowIAModal(true);
                        }}
                        disabled={!feed.url}
                        className="px-4 py-2 bg-mcvill-accent text-slate-950 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                      >
                        <Zap size={14} className="inline mr-1" /> ANALIZAR IA
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {/* Botón agregar cámara */}
              <button 
                onClick={async () => {
                  const label = await appPrompt('Nombre de la Estación/Cámara:', 'Nueva Estación');
                  if (label) updateFeeds([...activeFeeds, { id: `cam-${Date.now()}`, label: label.toUpperCase(), url: '' }]);
                }}
                className="bg-slate-900/40 border border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-600 hover:text-mcvill-accent hover:border-mcvill-accent/40 hover:bg-mcvill-accent/5 transition-all aspect-video"
              >
                <Plus size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest">Vincular Nueva Cámara IP</span>
              </button>
            </div>

            <div className="p-4 bg-mcvill-accent/5 border border-mcvill-accent/10 rounded-2xl">
              <div className="flex items-center gap-3">
                <Cpu className="text-mcvill-accent" size={24} />
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Quality Feeding Engine</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">El sistema permite conectar múltiples NVRs o Cámaras IP mediante streams MJPEG para monitoreo y análisis automatizado.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Six Sigma Metrics ── */}
        {activeTab === 'metrics' && (
          <div className="p-6 grid grid-cols-2 gap-6">
            {/* Distribución de veredictos */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart3 size={14} className="text-mcvill-accent" /> Distribución de Resultados</h3>
              <div className="space-y-3">
                {[
                  { label: 'CERTIFICADAS', count: inspections.filter(i => i.status === 'passed').length, total: inspections.length, color: 'bg-emerald-500' },
                  { label: 'RECHAZADAS', count: inspections.filter(i => i.status === 'failed').length, total: inspections.length, color: 'bg-rose-500' },
                  { label: 'OBSERVADAS', count: inspections.filter(i => i.status === 'conditional').length, total: inspections.length, color: 'bg-amber-500' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                      <span className="text-[9px] font-black text-white">{item.count} <span className="text-slate-600">/ {item.total}</span></span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full transition-all', item.color)} style={{ width: item.total ? `${(item.count / item.total) * 100}%` : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* NC por severidad */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={14} className="text-rose-400" /> NCs por Severidad</h3>
              <div className="space-y-3">
                {[
                  { label: 'CRÍTICAS', count: ncs.filter(n => n.severidad === 'critica').length, color: 'bg-rose-500' },
                  { label: 'MAYORES', count: ncs.filter(n => n.severidad === 'mayor').length, color: 'bg-amber-500' },
                  { label: 'MENORES', count: ncs.filter(n => n.severidad === 'menor').length, color: 'bg-mcvill-accent' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                      <span className="text-[9px] font-black text-white">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full', item.color)} style={{ width: ncs.length ? `${(item.count / ncs.length) * 100}%` : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* KPIs clave */}
            {[
              { label: 'Total Inspecciones', value: String(inspections.length), icon: ShieldCheck, color: 'text-mcvill-accent' },
              { label: 'Tasa de Éxito', value: `${passRate}%`, icon: CheckCircle2, color: 'text-emerald-400' },
              { label: 'NCs Totales', value: String(ncs.length), icon: AlertTriangle, color: 'text-rose-400' },
              { label: 'Auditorías Realizadas', value: String(audits.filter(a => a.status === 'completada' || a.status === 'cerrada').length), icon: ClipboardCheck, color: 'text-amber-400' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex items-center gap-4">
                <kpi.icon size={28} className={clsx(kpi.color, 'shrink-0')} />
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</p>
                  <p className={clsx('text-3xl font-black tracking-tighter', kpi.color)}>{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VisualIA Modal */}
      {showIAModal && (
        <VisualIAInspection 
          onClose={() => { setShowIAModal(false); setSelectedFeedId(null); }} 
          onComplete={() => { setShowIAModal(false); setSelectedFeedId(null); loadInspections(); }} 
          initialStreamUrl={activeFeeds.find(f => f.id === selectedFeedId)?.url}
        />
      )}

      {/* ── Modal: Inspección ── */}
      {showModal && (
        <div className="fixed inset-0 top-16 left-0 md:left-64 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/80">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">{editingInspection ? 'ACTUALIZAR' : 'NUEVA'} <span className="text-mcvill-accent">INSPECCIÓN</span></h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">PROTOCOLO DE CALIDAD</p>
              </div>
              <button onClick={() => { setShowModal(false); setEditingInspection(null); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-rose-500 transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveInsp} className="p-6 space-y-5">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Orden de Trabajo</label>
                <select required className="cyber-select w-full" value={inspFormData.order_id} onChange={e => setInspFormData({ ...inspFormData, order_id: e.target.value })}>
                  <option value="">SELECCIONAR ORDEN...</option>
                  {productionOrders.map(o => <option key={o.id} value={o.id}>OT #{o.order_number} — {o.product_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Veredicto</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'passed', label: 'CERTIFICAR', color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5' },
                    { id: 'failed', label: 'RECHAZAR', color: 'text-rose-500 border-rose-500/30 bg-rose-500/5' },
                    { id: 'conditional', label: 'OBSERVAR', color: 'text-amber-500 border-amber-500/30 bg-amber-500/5' },
                  ].map(opt => (
                    <button key={opt.id} type="button" onClick={() => setInspFormData({ ...inspFormData, status: opt.id as any })}
                      className={clsx('py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all', inspFormData.status === opt.id ? opt.color : 'bg-white/5 border-white/10 text-slate-500')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Notas</label>
                <textarea rows={3} className="cyber-input w-full resize-none" placeholder="HALLAZGOS..." value={inspFormData.details.notes}
                  onChange={e => setInspFormData({ ...inspFormData, details: { ...inspFormData.details, notes: e.target.value.toUpperCase() } })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-11 border border-white/10 text-slate-500 font-black uppercase tracking-widest rounded-xl text-[9px]">CANCELAR</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] h-11 bg-mcvill-accent hover:opacity-90 text-white font-black uppercase tracking-widest rounded-xl text-[9px] flex items-center justify-center gap-2 transition-all">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={15} /> {editingInspection ? 'ACTUALIZAR' : 'CONFIRMAR'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: No Conformidad ── */}
      {showNCModal && (
        <div className="fixed inset-0 top-16 left-0 md:left-64 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/80">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">{editingNC ? 'EDITAR' : 'NUEVA'} <span className="text-rose-500">NO CONFORMIDAD</span></h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{ncForm.numero || 'CAPA — ACCIÓN CORRECTIVA'}</p>
              </div>
              <button onClick={() => setShowNCModal(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-rose-500 transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveNC} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Tipo</label>
                  <select className="cyber-select w-full" value={ncForm.tipo} onChange={e => setNcForm({ ...ncForm, tipo: e.target.value })}>
                    {['proceso', 'producto', 'sistema', 'proveedor'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Severidad</label>
                  <select className="cyber-select w-full" value={ncForm.severidad} onChange={e => setNcForm({ ...ncForm, severidad: e.target.value })}>
                    {['menor', 'mayor', 'critica'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Origen</label>
                  <select className="cyber-select w-full" value={ncForm.origen} onChange={e => setNcForm({ ...ncForm, origen: e.target.value })}>
                    {['inspeccion', 'auditoria', 'cliente', 'produccion'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Estado</label>
                  <select className="cyber-select w-full" value={ncForm.status} onChange={e => setNcForm({ ...ncForm, status: e.target.value })}>
                    {['abierta', 'en_proceso', 'verificacion', 'cerrada'].map(v => <option key={v} value={v}>{v.replace('_', ' ').toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Responsable</label>
                  <input className="cyber-input w-full" placeholder="NOMBRE..." value={ncForm.responsable} onChange={e => setNcForm({ ...ncForm, responsable: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Área</label>
                  <input className="cyber-input w-full" placeholder="ÁREA..." value={ncForm.area} onChange={e => setNcForm({ ...ncForm, area: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Descripción *</label>
                <textarea required rows={2} className="cyber-input w-full resize-none" placeholder="DESCRIPCIÓN DE LA NO CONFORMIDAD..." value={ncForm.descripcion} onChange={e => setNcForm({ ...ncForm, descripcion: e.target.value })} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Causa Raíz</label>
                <textarea rows={2} className="cyber-input w-full resize-none" placeholder="ANÁLISIS DE CAUSA RAÍZ (5 PORQUÉS, ISHIKAWA...)..." value={ncForm.causa_raiz} onChange={e => setNcForm({ ...ncForm, causa_raiz: e.target.value })} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Acción Correctiva</label>
                <textarea rows={2} className="cyber-input w-full resize-none" placeholder="ACCIONES PARA ELIMINAR LA CAUSA RAÍZ..." value={ncForm.accion_correctiva} onChange={e => setNcForm({ ...ncForm, accion_correctiva: e.target.value })} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Acción Preventiva</label>
                <textarea rows={2} className="cyber-input w-full resize-none" placeholder="ACCIONES PARA PREVENIR RECURRENCIA..." value={ncForm.accion_preventiva} onChange={e => setNcForm({ ...ncForm, accion_preventiva: e.target.value })} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Fecha Compromiso</label>
                <input type="date" className="cyber-input w-full" value={ncForm.fecha_compromiso} onChange={e => setNcForm({ ...ncForm, fecha_compromiso: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-slate-900 pb-1">
                <button type="button" onClick={() => setShowNCModal(false)} className="flex-1 h-11 border border-white/10 text-slate-500 font-black uppercase tracking-widest rounded-xl text-[9px]">CANCELAR</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] h-11 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest rounded-xl text-[9px] flex items-center justify-center gap-2 transition-all">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><AlertTriangle size={15} /> {editingNC ? 'ACTUALIZAR NC' : 'REGISTRAR NC'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Auditoría ── */}
      {showAuditModal && (
        <div className="fixed inset-0 top-16 left-0 md:left-64 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/80">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">{editingAudit ? 'EDITAR' : 'PROGRAMAR'} <span className="text-mcvill-accent">AUDITORÍA</span></h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{auditForm.numero || 'ISO 9001 · AUDITORÍA INTERNA'}</p>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-rose-500 transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveAudit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Tipo</label>
                  <select className="cyber-select w-full" value={auditForm.tipo} onChange={e => setAuditForm({ ...auditForm, tipo: e.target.value })}>
                    {['proceso', 'sistema', 'producto', 'proveedor'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Estado</label>
                  <select className="cyber-select w-full" value={auditForm.status} onChange={e => setAuditForm({ ...auditForm, status: e.target.value })}>
                    {['programada', 'en_proceso', 'completada', 'cerrada'].map(v => <option key={v} value={v}>{v.replace('_', ' ').toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Alcance *</label>
                <input required className="cyber-input w-full" placeholder="EJ: PROCESO DE SOLDADURA MIG/MAG..." value={auditForm.alcance} onChange={e => setAuditForm({ ...auditForm, alcance: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Auditor</label>
                  <input className="cyber-input w-full" placeholder="NOMBRE DEL AUDITOR..." value={auditForm.auditor} onChange={e => setAuditForm({ ...auditForm, auditor: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Área Auditada</label>
                  <input className="cyber-input w-full" placeholder="EJ: PRODUCCIÓN / CALIDAD..." value={auditForm.area_auditada} onChange={e => setAuditForm({ ...auditForm, area_auditada: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Fecha Programada</label>
                  <input type="date" className="cyber-input w-full" value={auditForm.fecha_programada} onChange={e => setAuditForm({ ...auditForm, fecha_programada: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Resultado</label>
                  <select className="cyber-select w-full" value={auditForm.resultado} onChange={e => setAuditForm({ ...auditForm, resultado: e.target.value })}>
                    {['pendiente', 'conforme', 'no_conforme', 'observado'].map(v => <option key={v} value={v}>{v.replace('_', ' ').toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Hallazgos</label>
                <textarea rows={3} className="cyber-input w-full resize-none" placeholder="HALLAZGOS DURANTE LA AUDITORÍA..." value={auditForm.hallazgos} onChange={e => setAuditForm({ ...auditForm, hallazgos: e.target.value })} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">NCs Encontradas</label>
                <input type="number" min="0" className="cyber-input w-full" value={auditForm.no_conformidades_encontradas}
                  onChange={e => setAuditForm({ ...auditForm, no_conformidades_encontradas: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-slate-900 pb-1">
                <button type="button" onClick={() => setShowAuditModal(false)} className="flex-1 h-11 border border-white/10 text-slate-500 font-black uppercase tracking-widest rounded-xl text-[9px]">CANCELAR</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] h-11 bg-mcvill-accent hover:opacity-90 text-white font-black uppercase tracking-widest rounded-xl text-[9px] flex items-center justify-center gap-2 transition-all">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><ClipboardCheck size={15} /> {editingAudit ? 'ACTUALIZAR' : 'PROGRAMAR'} AUDITORÍA</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityView;
