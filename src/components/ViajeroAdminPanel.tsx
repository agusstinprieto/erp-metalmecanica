import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, MoreVertical, Edit,
  Trash2, Printer, Layers, Box, Settings,
  RefreshCw, ChevronRight, FileText, Sparkles,
  ExternalLink, Hammer, Database, Calendar,
  User, Check, X, ChevronUp, ChevronDown, ChevronsUpDown, Copy, QrCode,
  LayoutGrid, List, ImageOff, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { tenantService } from '../services/tenantService';
import type { TenantConfig } from '../services/tenantService';
import { useConfig } from '../contexts/ConfigContext';
import { useCyberModal } from '../hooks/useCyberModal';
import { eventBus } from '../utils/eventBus';
import { ViajeroManagerModal } from './ViajeroManagerModal';
import { CatalogManagerModal } from './CatalogManagerModal';
import { OCManagerModal } from './OCManagerModal';
import { ViajeroQRModal } from './ViajeroQRModal';
import { CyberModal } from './common/CyberModal';

const BRIDGE_URL = (import.meta as any).env?.VITE_BRIDGE_URL || 'http://localhost:5005';

const fmtDate = (iso: string | null) => {
  if (!iso) return 'S/F';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};


export const ViajeroAdminPanel: React.FC<{ 
  onPrint?: (data: { id?: string, ids?: string[], autoPrint?: boolean }) => void; 
  onBack?: () => void; 
  onSelect?: (id: string) => void;
  onToggleTV?: () => void;
}> = ({ onPrint, onBack, onSelect, onToggleTV }) => {
  const { isDarkMode, config } = useConfig();
  const [viajeros, setViajeros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros Avanzados
  const [selectedCTs, setSelectedCTs] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [availableCTs, setAvailableCTs] = useState<string[]>(['LASER', 'DOBLEZ', 'CNC', 'SOLDADURA', 'PINTURA', 'ENSAMBLE']);
  const [availableClients, setAvailableClients] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedViajero, setSelectedViajero] = useState<string | null>(null);
  const [activeTabForModal, setActiveTabForModal] = useState<'general' | 'operaciones' | 'materiales'>('general');
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isOCModalOpen, setIsOCModalOpen] = useState(false);
  const [catalogType, setCatalogType] = useState<'operaciones' | 'materiales'>('operaciones');
  const [qrViajero, setQrViajero] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'lista' | 'tarjetas'>('lista');

  // Ordenamiento
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({
    key: 'id',
    direction: null
  });

  // Motor PDF: QuestPDF (Community) o MigraDoc (MIT, sin costo)
  const [pdfEngine, setPdfEngine] = useState<'questpdf' | 'migradoc'>('questpdf');

  // Paginación
  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  
  const { modal, showConfirm, showSuccess, showError, showAlert, hideModal } = useCyberModal();

  const resetAllFilters = () => {
    setDateRange({ start: '', end: '' });
    setSearchTerm('');
    setSelectedCTs([]);
    setSelectedClients([]);
    setSortConfig({ key: 'id', direction: null });
  };

  const setQuickFilter = (type: 'hoy' | 'semana' | 'mes' | 'todo') => {
    const today = new Date();
    const start = new Date();
    
    switch(type) {
      case 'hoy':
        break;
      case 'semana':
        start.setDate(today.getDate() - 7);
        break;
      case 'mes':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'todo':
        setDateRange({ start: '', end: '' });
        return;
    }
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchViajeros();
    fetchFilterData();
    loadTenantConfig();
  }, []);

  const loadTenantConfig = async () => {
    try {
      const cfg = await tenantService.getConfig();
      setTenantConfig(cfg);
    } catch (err) {
      console.error('Error loading tenant config:', err);
    }
  };

  const fetchFilterData = async () => {
    try {
      // Obtener clientes únicos
      const { data: clients } = await supabase.from('viajeros').select('cliente');
      if (clients) {
        const uniqueClients = Array.from(new Set(clients.map(c => c.cliente).filter(Boolean)));
        setAvailableClients(uniqueClients as string[]);
      }

      // Obtener CTs únicos de las operaciones
      const { data: cts } = await supabase.from('viajero_operaciones').select('centro_trabajo');
      if (cts) {
        const uniqueCTs = Array.from(new Set(cts.map(c => c.centro_trabajo).filter(Boolean)));
        setAvailableCTs(prev => Array.from(new Set([...prev, ...uniqueCTs as string[]])));
      }
    } catch (err) {
      console.error('Error fetching filter data:', err);
    }
  };

  const fetchViajeros = async () => {
    setLoading(true);
    try {
      let query = supabase.from('viajeros').select('*');
      
      if (dateRange.start) {
        query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      }
      if (dateRange.end) {
        query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      }
      if (selectedClients.length > 0) {
        query = query.in('cliente', selectedClients);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Filtrado por CT (esto requiere un join o filtrado en memoria si es complejo)
      let finalData = data || [];
      if (selectedCTs.length > 0) {
        // Obtenemos los IDs de viajeros que tienen esas operaciones
        const { data: opData } = await supabase
          .from('viajero_operaciones')
          .select('viajero_id')
          .in('centro_trabajo', selectedCTs);
        
        const validIds = new Set(opData?.map(o => o.viajero_id));
        finalData = finalData.filter(v => validIds.has(v.id));
      }

      setViajeros(finalData);
    } catch (err) {
      console.error('Error al cargar viajeros:', err);
      showError('Error', 'No se pudieron cargar los viajeros.');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchViajeros();
  }, [dateRange, selectedCTs, selectedClients]);

  const handleOpenEditor = (id: string | null, tab: 'general' | 'operaciones' | 'materiales' = 'general') => {
    setSelectedViajero(id);
    setActiveTabForModal(tab);
    setModalOpen(true);
  };

  const handleClone = (id: string) => {
    showConfirm(
      'Clonar Viajero',
      `¿Crear una copia del Viajero ${id}? Se copiará la ruta de operaciones y el BOM completo. El nuevo viajero quedará en estado PENDIENTE.`,
      async () => {
        try {
          // Fetch viajero header + operaciones + materiales en queries separadas
          const [
            { data: original, error: fetchError },
            { data: ops },
            { data: mats },
          ] = await Promise.all([
            supabase.from('viajeros').select('*').eq('id', id).single(),
            supabase.from('viajero_operaciones').select('*').eq('viajero_id', id).order('orden_operacion', { ascending: true }),
            supabase.from('viajero_materiales').select('*').eq('viajero_id', id),
          ]);

          if (fetchError || !original) throw fetchError || new Error('No encontrado');

          const newId = `${id}-C${Date.now().toString(36).slice(-4).toUpperCase()}`;

          const { data: newViajero, error: insertError } = await supabase
            .from('viajeros')
            .insert({
              id:                   newId,
              cliente:              original.cliente              || '',
              numero_parte:         original.numero_parte         || '',
              descripcion:          original.descripcion          || '',
              revision:             original.revision             || '',
              cantidad_orden:       original.cantidad_orden       || 1,
              cant_fabricada:       0,
              fecha_orden:          new Date().toISOString().split('T')[0],
              fecha_entrega:        original.fecha_entrega        || null,
              oc_cliente:           original.oc_cliente           || '',
              linea:                original.linea                || '',
              ensamble_tl:          original.ensamble_tl          || null,
              dibujo:               original.dibujo               || '',
              cotizacion:           original.cotizacion           || '',
              horas_est_totales:    original.horas_est_totales    || 0,
              notas:                original.notas                || '',
              estatus:              'PENDIENTE',
              prioridad:            original.prioridad            || 'NORMAL',
              es_maestro:           original.es_maestro           ?? false,
              is_master:            original.is_master            ?? false,
              ensamble_padre:       original.ensamble_padre       || null,
              ensamble_padre_desc:  original.ensamble_padre_desc  || null,
              image_prompt:         original.image_prompt         || null,
              image_url:            original.image_url            || null,
              avance_porcentaje:    0,
              motivo_rechazo:       null,
              rechazado_por:        null,
              fecha_rechazo:        null,
            })
            .select('id')
            .single();

          if (insertError || !newViajero) throw insertError || new Error('Error al crear copia');

          if (ops && ops.length > 0) {
            const clonedOps = ops.map(({ id: _oid, viajero_id: _vid, created_at: _ca, updated_at: _ua, ...op }: any) => ({
              ...op,
              viajero_id: newViajero.id,
            }));
            const { error: opsErr } = await supabase.from('viajero_operaciones').insert(clonedOps);
            if (opsErr) console.error('Error clonando operaciones:', opsErr);
          }

          if (mats && mats.length > 0) {
            const clonedMats = mats.map(({ id: _mid, viajero_id: _vid, created_at: _ca, updated_at: _ua, ...mat }: any) => ({
              ...mat,
              viajero_id: newViajero.id,
            }));
            const { error: matsErr } = await supabase.from('viajero_materiales').insert(clonedMats);
            if (matsErr) console.error('Error clonando materiales:', matsErr);
          }

          const opsCount  = ops?.length  || 0;
          const matsCount = mats?.length || 0;
          showSuccess('Viajero Clonado', `Copia creada: ${newViajero.id} · ${opsCount} ops · ${matsCount} materiales`);
          fetchViajeros();
        } catch (err: any) {
          showError('Error al Clonar', err.message || 'No se pudo crear la copia.');
        }
      },
      { confirmText: 'CLONAR', cancelText: 'CANCELAR' }
    );
  };

  const handleDelete = (id: string) => {
    showConfirm(
      'Eliminar Registro',
      `¿Estás seguro de eliminar el Viajero ${id}? Esta acción es irreversible y eliminará todos los datos asociados.`,
      async () => {
        try {
          const { error } = await supabase.from('viajeros').delete().eq('id', id);
          if (error) throw error;
          showError('Eliminado', `Viajero ${id} eliminado correctamente.`);
          fetchViajeros();
        } catch (err) {
          showError('Error', 'No se pudo eliminar el registro.');
        }
      },
      { confirmText: 'ELIMINAR AHORA', cancelText: 'CANCELAR' }
    );
  };

  const filteredViajeros = viajeros.filter(v => {
    const q = searchTerm.toLowerCase();
    return (
      (v.numero_parte || '').toLowerCase().includes(q) ||
      (v.cliente || '').toLowerCase().includes(q) ||
      (v.id || '').toString().toLowerCase().includes(q) ||
      (v.descripcion || '').toLowerCase().includes(q) ||
      (v.revision || '').toLowerCase().includes(q) ||
      (v.oc_cliente || '').toLowerCase().includes(q)
    );
  });

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key, direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key || !sortConfig.direction) return <ChevronsUpDown size={12} className="text-slate-700 opacity-30 group-hover/th:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={12} className="text-blue-400" /> 
      : <ChevronDown size={12} className="text-blue-400" />;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredViajeros, sortConfig]);

  const sortedViajeros = React.useMemo(() => {
    if (!sortConfig.direction || !sortConfig.key) return filteredViajeros;

    return [...filteredViajeros].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const result = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [filteredViajeros, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedViajeros.length / PAGE_SIZE));
  const paginatedViajeros = sortedViajeros.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredViajeros.length && filteredViajeros.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredViajeros.map(v => v.id)));
    }
  };

  const generatePDF = async (ids: string[], pdfWindow: Window | null, token?: string) => {
    if (ids.length === 0) return;

    setIsGenerating(true);

    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (tenantConfig?.sql_connection_string) {
        headers['X-SQL-Connection'] = tenantConfig.sql_connection_string;
      }

      const base = pdfEngine === 'migradoc'
        ? `${BRIDGE_URL}/api/reports/viajero/migra/print-selected`
        : `${BRIDGE_URL}/api/reports/viajero/print-selected`;
      const endpoint = token ? `${base}?token=${token}` : base;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobIds: ids }),
        signal: AbortSignal.timeout(300000),
      });

      if (!res.ok) {
        if (pdfWindow) pdfWindow.close();
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText}`);
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        if (pdfWindow) pdfWindow.close();
        throw new Error("El servidor devolvió un PDF vacío.");
      }

      const fileURL = URL.createObjectURL(blob);
      if (pdfWindow) {
        pdfWindow.location.href = fileURL;
      } else {
        window.open(fileURL, '_blank');
      }
      
    } catch (e: any) {
      console.error("❌ Error en generación directa:", e);
      if (pdfWindow) pdfWindow.close();
      const isLocalhost = BRIDGE_URL.includes('localhost');
      const hint = isLocalhost
        ? 'El servicio de impresión PDF no está corriendo. Ejecuta start-report-service.ps1 en tu computadora (puerto 5005).'
        : `No se pudo conectar con el servicio de impresión (${BRIDGE_URL}).`;
      showError('Error de Impresión', hint);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchPrint = () => {
    if (selectedIds.size === 0) {
      showAlert('Selección Vacía', 'Selecciona al menos un viajero para imprimir.', 'info');
      return;
    }

    const ids = Array.from(selectedIds);
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write(`
        <html>
        <head>
          <title>Generando PDF - ${config.brandName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body {
              background: radial-gradient(circle at center, #0a1120 0%, #050914 100%);
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: 'Inter', sans-serif;
              margin: 0;
              overflow: hidden;
            }
            .timer-circle {
              position: relative;
              width: 200px;
              height: 200px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 4px solid rgba(255, 255, 255, 0.05);
              border-radius: 50%;
              margin-bottom: 32px;
            }
            .timer-circle::after {
              content: '';
              position: absolute;
              inset: -4px;
              border: 4px solid #00a3ff;
              border-radius: 50%;
              border-top-color: transparent;
              animation: spin 2s linear infinite;
              box-shadow: 0 0 15px rgba(0, 163, 255, 0.5);
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            #counter { font-size: 72px; font-weight: 900; letter-spacing: -2px; line-height: 1; text-shadow: 0 0 20px rgba(0, 163, 255, 0.6); }
            .label { font-size: 10px; font-weight: 900; color: #00a3ff; text-transform: uppercase; letter-spacing: 4px; margin-top: 5px; }
            h2 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 5px; margin: 0 0 8px; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            p { color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0; }
            .progress-bar-wrap { width: 280px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 99px; margin-top: 24px; overflow: hidden; }
            .progress-bar-fill { height: 100%; background: #00a3ff; border-radius: 99px; width: 0%; transition: width 0.4s ease; box-shadow: 0 0 8px rgba(0,163,255,0.6); }
            #progress-text { font-size: 13px; font-weight: 900; color: #fff; margin-top: 12px; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="timer-circle">
            <div id="counter">0</div>
            <div class="label">segundos</div>
          </div>
          <h2>Generando PDF</h2>
          <p>${ids.length} Viajeros Industriales</p>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" id="progress-bar"></div></div>
          <div id="progress-text">0 / ${ids.length}</div>
          <script>
            const TOTAL = ${ids.length};
            const TOKEN = '${token}';
            const BRIDGE = '${BRIDGE_URL}';

            let secs = 0;
            const counterEl = document.getElementById('counter');
            setInterval(() => { secs++; counterEl.innerText = secs; }, 1000);

            async function poll() {
              try {
                const r = await fetch(BRIDGE + '/api/progress/' + TOKEN);
                if (!r.ok) return;
                const d = await r.json();
                const done = d.done || 0;
                const total = d.total || TOTAL;
                document.getElementById('progress-text').innerText = done + ' / ' + total;
                document.getElementById('progress-bar').style.width = (total > 0 ? (done / total * 100) : 0) + '%';
              } catch(e) {}
            }
            const pollTimer = setInterval(poll, 500);
          </script>
        </body>
        </html>
      `);
      pdfWindow.document.close();
    }

    generatePDF(ids, pdfWindow, token);
  };

  const handleSinglePrint = (id: string) => {
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write(`
        <html>
        <head>
          <title>Generando PDF - ${config.brandName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body {
              background: radial-gradient(circle at center, #0a1120 0%, #050914 100%);
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: 'Inter', sans-serif;
              margin: 0;
              overflow: hidden;
            }
            .timer-circle {
              position: relative;
              width: 200px;
              height: 200px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 4px solid rgba(255, 255, 255, 0.05);
              border-radius: 50%;
              margin-bottom: 40px;
            }
            .timer-circle::after {
              content: '';
              position: absolute;
              inset: -4px;
              border: 4px solid #00a3ff;
              border-radius: 50%;
              border-top-color: transparent;
              animation: spin 2s linear infinite;
              box-shadow: 0 0 15px rgba(0, 163, 255, 0.5);
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            #counter { font-size: 72px; font-weight: 900; letter-spacing: -2px; line-height: 1; text-shadow: 0 0 20px rgba(0, 163, 255, 0.6); }
            .label { font-size: 10px; font-weight: 900; color: #00a3ff; text-transform: uppercase; letter-spacing: 4px; margin-top: 5px; }
            h2 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 5px; margin: 0; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            p { color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="timer-circle">
            <div id="counter">0</div>
            <div class="label">segundos</div>
          </div>
          <h2>Generando PDF</h2>
          <p>Procesando Viajero Industrial ${id}</p>
          <script>
            let count = 0;
            const counterEl = document.getElementById('counter');
            counterEl.innerText = count;
            const timer = setInterval(() => {
              count++;
              counterEl.innerText = count;
            }, 1000);
          </script>
        </body>
        </html>
      `);
      pdfWindow.document.close();
    }
    generatePDF([id], pdfWindow);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#020617] text-slate-200' : 'bg-slate-50 text-slate-800'} -m-8 p-4 sm:p-5`}>
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header — una sola fila con back opcional */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shrink-0"
              >
                ← Volver
              </button>
            )}
            <div className="p-1.5 bg-blue-600/20 rounded-lg border border-blue-500/30 shrink-0">
              <Settings className="text-blue-400" size={14} />
            </div>
            <h1 className="text-base font-black uppercase tracking-tighter text-white leading-none flex items-center gap-2 truncate">
              Viajeros <span className="text-blue-500">Inteligentes</span>
              <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded tracking-[0.2em] font-black hidden sm:inline">{config.developerName}</span>
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { setCatalogType('operaciones'); setIsCatalogModalOpen(true); }}
              className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg transition-all group"
              title="Catálogo de Operaciones"
            >
              <Database size={13} className="text-blue-400 group-hover:scale-110" />
            </button>
            <button
              onClick={() => { setCatalogType('materiales'); setIsCatalogModalOpen(true); }}
              className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg transition-all group"
              title="Catálogo BOM"
            >
              <Box size={13} className="text-emerald-400 group-hover:scale-110" />
            </button>
            <button
              onClick={() => setIsOCModalOpen(true)}
              className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg transition-all group"
              title="Órdenes de Compra Clientes"
            >
              <FileText size={13} className="text-indigo-400 group-hover:scale-110" />
            </button>
            <div className="w-px h-4 bg-white/10 mx-0.5" />
            {/* Toggle vista lista / tarjetas */}
            <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('lista')}
                className={`p-1.5 rounded transition-all ${viewMode === 'lista' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                title="Vista lista"
              >
                <List size={13} />
              </button>
              <button
                onClick={() => setViewMode('tarjetas')}
                className={`p-1.5 rounded transition-all ${viewMode === 'tarjetas' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                title="Vista tarjetas"
              >
                <LayoutGrid size={13} />
              </button>
            </div>
            <div className="w-px h-4 bg-white/10 mx-0.5" />
            <button
              onClick={fetchViajeros}
              className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-slate-400"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onToggleTV}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-blue-500/50 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
              title="Activar Monitor de Piso (TV)"
            >
              <Zap size={14} className="text-blue-500" /> Monitor TV
            </button>

            <button
              onClick={() => eventBus.emit('CHAT_ASK', { prompt: '¿Cómo puedo optimizar la producción hoy?' })}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-indigo-600/10"
              title="Consultar Inteligencia Artificial"
            >
              <Sparkles size={14} /> Consultar IA
            </button>
            
            <button
              onClick={() => handleOpenEditor(null)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <Plus size={13} /> Nuevo
            </button>
          </div>
        </div>

        {/* Control Bar Compacta */}
        <div className="flex flex-col md:flex-row gap-2 py-2">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            <input 
              type="text" 
              placeholder="BUSCAR JOB, PARTE, CLIENTE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/5 rounded-lg py-2.5 pl-10 pr-10 text-[10px] font-bold focus:border-blue-500/40 outline-none transition-all placeholder:text-slate-700 text-white shadow-inner"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                title="Limpiar búsqueda"
              >
                <X size={10} /> LIMPIAR
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setSearchTerm('');
                setDateRange({ start: '', end: '' });
                setSelectedCTs([]);
                setSelectedClients([]);
              }}
              className="px-4 flex items-center gap-2 bg-white/5 border border-white/10 text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all h-[38px]"
              title="Resetear todos los filtros"
            >
              <RefreshCw size={14} /> Reset
            </button>
            <button 
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className={`px-4 flex items-center gap-2 border rounded-lg text-[9px] font-black uppercase tracking-widest transition-all h-[38px] ${
                isFilterVisible ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Filter size={14} /> {isFilterVisible ? 'Ocultar' : 'Filtros'}
            </button>
            {/* Toggle motor PDF */}
            <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5 h-[38px]" title="Motor de generación PDF">
              <button
                onClick={() => setPdfEngine('questpdf')}
                className={`px-3 rounded text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${
                  pdfEngine === 'questpdf'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="QuestPDF — motor por defecto (Community License)"
              >
                Quest
              </button>
              <button
                onClick={() => setPdfEngine('migradoc')}
                className={`px-3 rounded text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${
                  pdfEngine === 'migradoc'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="MigraDoc / PDFsharp — MIT, sin costo de licencia"
              >
                Migra
              </button>
            </div>

            <button
              onClick={handleBatchPrint}
              disabled={selectedIds.size === 0}
              className={`px-6 disabled:opacity-20 disabled:grayscale rounded-lg text-[9px] font-black uppercase tracking-widest text-white transition-all active:scale-95 flex items-center justify-center gap-2 h-[38px] min-w-[150px] shadow-lg ${
                pdfEngine === 'migradoc'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
              }`}
            >
              <Printer size={14} /> Imprimir ({selectedIds.size})
            </button>
          </div>
        </div>

          <AnimatePresence>
            {isFilterVisible && (
              <motion.div 
                initial={{ height: 0, opacity: 0, y: -10 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -10 }}
                className="overflow-hidden"
              >
                <div className="p-8 bg-slate-900/50 border border-white/10 rounded-[30px] backdrop-blur-xl grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Selector CT */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Hammer size={12} /> Centros de Trabajo
                      </span>
                      {selectedCTs.length > 0 && (
                        <button onClick={() => setSelectedCTs([])} className="text-[8px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest">Limpiar</button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                      {availableCTs.map(ct => (
                        <button
                          key={ct}
                          onClick={() => {
                            setSelectedCTs(prev => prev.includes(ct) ? prev.filter(c => c !== ct) : [...prev, ct]);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                            selectedCTs.includes(ct) 
                              ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20' 
                              : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {ct}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector Clientes */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <User size={12} /> Clientes
                      </span>
                      {selectedClients.length > 0 && (
                        <button onClick={() => setSelectedClients([])} className="text-[8px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest">Limpiar</button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                      {availableClients.length > 0 ? availableClients.map(client => (
                        <button
                          key={client}
                          onClick={() => {
                            setSelectedClients(prev => prev.includes(client) ? prev.filter(c => c !== client) : [...prev, client]);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                            selectedClients.includes(client) 
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
                              : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {client}
                        </button>
                      )) : (
                        <span className="text-[9px] font-bold text-slate-700 uppercase italic">Sin clientes registrados</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Barra de Filtros Rápidos y Fechas (Compacta) */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-slate-900/40 border border-white/5 rounded-xl backdrop-blur-md">
            <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
              {[
                { id: 'hoy', label: 'Hoy' },
                { id: 'semana', label: 'Semana' },
                { id: 'mes', label: 'Mes' },
                { id: 'todo', label: 'Todo' }
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setQuickFilter(btn.id as any)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all active:scale-95"
                >
                  {btn.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-600 ml-1" />
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                onClick={(e) => {
                  try {
                    (e.currentTarget as any).showPicker();
                  } catch (err) {
                    console.log('Picker not supported');
                  }
                }}
                className="w-32 bg-[#020617] border border-blue-900/40 rounded-lg px-3 py-1.5 text-[10px] text-slate-200 outline-none focus:border-blue-500/60 cursor-pointer"
                style={{ colorScheme: 'dark' }}
              />
              <span className="text-slate-700 font-bold text-[10px]">TO</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                onClick={(e) => {
                  try {
                    (e.currentTarget as any).showPicker();
                  } catch (err) {
                    console.log('Picker not supported');
                  }
                }}
                className="w-32 bg-[#020617] border border-blue-900/40 rounded-lg px-3 py-1.5 text-[10px] text-slate-200 outline-none focus:border-blue-500/60 cursor-pointer"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {(dateRange.start || dateRange.end || searchTerm || selectedCTs.length > 0 || selectedClients.length > 0) && (
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-all active:scale-95 ml-auto"
              >
                <X size={10} />
                Reset filtros
              </button>
            )}
          </div>


        {/* ── Vista Tarjetas ─────────────────────────────────────────── */}
        {viewMode === 'tarjetas' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-24">
            {filteredViajeros.map(viajero => {
              const isSelected = selectedIds.has(viajero.id);
              const statusColor: Record<string, string> = {
                'COMPLETADO':  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                'EN PROCESO':  'bg-blue-500/15 text-blue-400 border-blue-500/30',
                'PENDIENTE':   'bg-slate-500/15 text-slate-400 border-slate-500/30',
                'RECHAZADO':   'bg-rose-500/15 text-rose-400 border-rose-500/30',
                'DETENIDO':    'bg-amber-500/15 text-amber-400 border-amber-500/30',
              };
              const sc = statusColor[viajero.estatus] || statusColor['PENDIENTE'];
              return (
                <div
                  key={viajero.id}
                  onClick={() => toggleSelect(viajero.id)}
                  className={`relative rounded-2xl border overflow-hidden cursor-pointer transition-all group
                    ${isSelected
                      ? 'border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                      : 'border-white/8 hover:border-white/20'
                    } bg-slate-900/50 backdrop-blur-xl`}
                >
                  {/* Imagen */}
                  <div className="relative h-36 bg-slate-800/60 overflow-hidden">
                    {viajero.image_url ? (
                      <img
                        src={viajero.image_url}
                        alt={viajero.numero_parte}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { 
                          (e.target as HTMLImageElement).style.display = 'none';
                          // Show placeholder behind? Or just let it be.
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-700">
                        <ImageOff size={24} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Sin imagen</span>
                      </div>
                    )}
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                    {/* Checkbox */}
                    <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                      ${isSelected ? 'bg-blue-600 border-blue-500' : 'bg-black/40 border-white/30'}`}>
                      {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                    {/* Status badge */}
                    <span className={`absolute top-2 right-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${sc}`}>
                      {viajero.estatus}
                    </span>
                    {/* Progress bar */}
                    {viajero.avance_porcentaje > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${viajero.avance_porcentaje}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white font-black text-[11px] uppercase tracking-tight truncate leading-tight">
                          {viajero.numero_parte || '—'}
                          {viajero.revision && <span className="text-blue-400 ml-1">R{viajero.revision}</span>}
                        </p>
                        <p className="text-[9px] text-slate-500 font-black">{viajero.id}</p>
                      </div>
                      <span className="text-[9px] font-black text-slate-400 shrink-0 bg-black/30 px-1.5 py-0.5 rounded-lg border border-white/5">
                        ×{viajero.cantidad_orden || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-black rounded border border-emerald-500/20 uppercase truncate max-w-[120px]">
                        {viajero.cliente || 'S/C'}
                      </span>
                      {viajero.operacion_actual && (
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest truncate max-w-[80px]">
                          {viajero.operacion_actual}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSinglePrint(viajero.id); }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        <Printer size={10} /> Print
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenEditor(viajero.id); }}
                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500 border border-blue-500/20 text-blue-400 hover:text-white rounded-lg transition-all"
                        title="Editar Viajero"
                      >
                        <Edit size={11} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setQrViajero(viajero); }}
                        className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-lg transition-all"
                      >
                        <QrCode size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredViajeros.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-700 text-[10px] font-black uppercase tracking-widest">
                Sin viajeros
              </div>
            )}
          </div>
        )}

        {/* Tabla de Viajeros */}
        {viewMode === 'lista' && (
        <>
        <div className="bg-slate-900/30 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-3 py-2 w-8">
                    <button
                      onClick={toggleSelectAll}
                      className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                        selectedIds.size === filteredViajeros.length && filteredViajeros.length > 0
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-white/20 bg-black/40 hover:border-white/40'
                      }`}
                    >
                      {selectedIds.size === filteredViajeros.length && filteredViajeros.length > 0 && <Check size={11} strokeWidth={4} />}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-left">ID / Folio</th>
                  <th className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-left">Pieza / Rev / Cliente</th>
                  <th className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Cant.</th>
                  <th className="px-3 py-2 cursor-pointer group/th" onClick={() => handleSort('notas')}>
                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover/th:text-white transition-colors">
                      Notas {getSortIcon('notas')}
                    </div>
                  </th>
                  <th className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Workflow</th>
                  <th className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence>
                  {paginatedViajeros.map((viajero) => (
                    <motion.tr 
                      key={viajero.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`hover:bg-blue-600/5 transition-all group ${selectedIds.has(viajero.id) ? 'bg-blue-600/10' : ''}`}
                    >
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => toggleSelect(viajero.id)}
                          className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                            selectedIds.has(viajero.id)
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'border-white/20 bg-black/40 group-hover:border-white/40'
                          }`}
                        >
                          {selectedIds.has(viajero.id) && <Check size={11} strokeWidth={4} />}
                        </button>
                      </td>
                      <td 
                        className="px-4 py-1.5 cursor-pointer"
                        onClick={() => onSelect && onSelect(viajero.id)}
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSinglePrint(viajero.id); }}
                            className="w-7 h-7 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all flex items-center justify-center shadow-md shadow-blue-600/20 border border-blue-400/50 shrink-0"
                            title="Imprimir Viajero"
                          >
                            <Printer size={12} />
                          </button>
                          <div className="flex flex-col min-w-0 group-hover:translate-x-1 transition-transform">
                            <span className="text-white font-black text-[12px] tracking-tighter leading-none">{viajero.id}</span>
                            <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{fmtDate(viajero.created_at)}</span>
                          </div>
                        </div>
                      </td>
                      <td 
                        className="px-3 py-1.5 cursor-pointer"
                        onClick={() => onSelect && onSelect(viajero.id)}
                      >
                        <div className="flex flex-col gap-0.5 group-hover:translate-x-1 transition-transform">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-black text-[11px] uppercase tracking-tight leading-tight">{viajero.numero_parte}</span>
                            {viajero.revision && (
                              <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-1 py-px rounded border border-blue-500/20">
                                R{viajero.revision}
                              </span>
                            )}
                          </div>
                          <span className="px-1.5 py-px bg-emerald-500/10 text-emerald-400 text-[8px] font-black rounded border border-emerald-500/20 uppercase w-fit">
                            {viajero.cliente || 'S/C'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span className="inline-block px-2.5 py-0.5 bg-black/40 border border-white/5 rounded-lg text-[11px] font-black text-slate-300">
                          {viajero.cantidad_orden || 0}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="max-w-[160px] truncate group/note relative cursor-help">
                          <span className="text-[9px] text-slate-500 italic leading-tight">
                            {viajero.notas || 'Sin notas'}
                          </span>
                          {viajero.notas && (
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover/note:block z-50 p-3 bg-slate-900 border border-white/10 rounded-xl shadow-2xl text-[10px] text-slate-300 min-w-[200px] backdrop-blur-xl">
                              {viajero.notas}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEditor(viajero.id, 'operaciones'); }}
                            className="flex flex-col items-center gap-0.5 px-2 py-1 bg-blue-500/5 hover:bg-blue-500/20 rounded-lg transition-all group/btn"
                          >
                            <Hammer size={13} className="text-blue-500 group-hover/btn:scale-110 transition-transform" />
                            <span className="text-[7px] font-black text-slate-500 group-hover/btn:text-blue-400 uppercase tracking-widest">Ops</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEditor(viajero.id, 'materiales'); }}
                            className="flex flex-col items-center gap-0.5 px-2 py-1 bg-emerald-500/5 hover:bg-emerald-500/20 rounded-lg transition-all group/btn"
                          >
                            <Box size={13} className="text-emerald-500 group-hover/btn:scale-110 transition-transform" />
                            <span className="text-[7px] font-black text-slate-500 group-hover/btn:text-emerald-400 uppercase tracking-widest">BOM</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <button
                            onClick={() => handleSinglePrint(viajero.id)}
                            className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                            title="Imprimir ahora"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            onClick={() => setQrViajero(viajero)}
                            className="p-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white rounded-lg transition-all"
                            title="Ver código QR"
                          >
                            <QrCode size={14} />
                          </button>
                          <button
                            onClick={() => handleClone(viajero.id)}
                            className="p-1.5 bg-violet-500/10 text-violet-400 hover:bg-violet-500 hover:text-white rounded-lg transition-all"
                            title="Clonar viajero"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEditor(viajero.id, 'general'); }}
                            className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                            title="Editar Viajero"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(viajero.id); }}
                            className="p-1.5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            title="Ver Detalle Producción"
                          >
                            <ExternalLink size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(viajero.id); }}
                            className="p-1.5 bg-red-500/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {loading && (
              <div className="py-32 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />
                  <RefreshCw className="text-blue-500 animate-spin relative" size={48} />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">Sincronizando con Supabase...</span>
              </div>
            )}

            {!loading && filteredViajeros.length === 0 && (
              <div className="py-32 text-center">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                  <Sparkles className="text-slate-600" size={40} />
                </div>
                <h3 className="text-white font-black uppercase tracking-tighter text-xl mb-2">Sin Resultados</h3>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest max-w-xs mx-auto">Ajusta los filtros o busca otro término para encontrar viajeros inteligentes.</p>
              </div>
            )}
          </div>
        </div>

        {/* Paginación */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-3">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedViajeros.length)} de {sortedViajeros.length} viajeros
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronDown size={12} className="rotate-90" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) => p === '...'
                  ? <span key={`e${idx}`} className="px-1 text-slate-600 text-[9px] font-black">…</span>
                  : <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-7 h-7 rounded-lg text-[9px] font-black uppercase transition-all ${currentPage === p ? 'bg-blue-600 border border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                    >
                      {p}
                    </button>
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronDown size={12} className="-rotate-90" />
              </button>
            </div>
          </div>
        )}
        </>
        )}

        {/* Barra de Acciones Inferior (IA.AGUS Style) */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-8 left-[calc(50%+8rem)] -translate-x-1/2 z-[60] w-full max-w-4xl px-6"
            >
              <div className={`${isDarkMode ? 'bg-[#0f172a]/95' : 'bg-white/95'} backdrop-blur-2xl border border-white/10 rounded-[30px] p-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-white/20`}>
                <div className="flex items-center gap-3">
                  <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">
                      {selectedIds.size} SELECCIONADOS
                    </button>
                    <button 
                      onClick={() => setSelectedIds(new Set(filteredViajeros.map(v => v.id)))}
                      className="px-6 py-2 text-slate-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      TODOS ({filteredViajeros.length})
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedIds(new Set())}
                    className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={handleBatchPrint}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-3 group active:scale-95"
                  >
                    <Printer size={16} className="group-hover:rotate-12 transition-transform" /> 
                    IMPRIMIR VIAJEROS
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{`Sistema Activo • ${config.brandName} 2026`}</span>
          </div>
          <div className="flex gap-8">
            <span className="flex items-center gap-2"><Database size={12} className="text-blue-500" /> {viajeros.length} Total</span>
            <span className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> {selectedIds.size} Seleccionados</span>
          </div>
        </div>
      </div>

      {/* Modales */}
      {modalOpen && (
        <ViajeroManagerModal 
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            fetchViajeros();
          }}
          viajeroId={selectedViajero || undefined}
          onSave={() => fetchViajeros()}
          onPrint={handleSinglePrint}
          initialTab={activeTabForModal}
        />
      )}

      {isCatalogModalOpen && (
        <CatalogManagerModal 
          isOpen={isCatalogModalOpen}
          onClose={() => setIsCatalogModalOpen(false)}
          type={catalogType}
        />
      )}

      {isOCModalOpen && (
        <OCManagerModal
          isOpen={isOCModalOpen}
          onClose={() => setIsOCModalOpen(false)}
        />
      )}

      <CyberModal {...modal} onClose={hideModal} />

      {qrViajero && (
        <ViajeroQRModal viajero={qrViajero} onClose={() => setQrViajero(null)} />
      )}
    </div>
  );
};
