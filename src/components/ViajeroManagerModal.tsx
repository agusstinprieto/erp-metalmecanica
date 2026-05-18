import React, { useState, useEffect, useRef } from 'react';
import {
  X, Settings, Hammer, Box, Save, Plus, Trash2,
  ChevronUp, ChevronDown, XCircle, TrendingUp, TrendingDown, Minus,
  MessageSquare, Send, User, Sparkles, Camera, Loader2, Info,
  RefreshCw, Copy, Zap, ExternalLink, Calendar, Hash, Building2,
  FileText, Clock, AlertTriangle, DollarSign, MapPin, Tag, Warehouse,
  Upload, Image
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import geminiService from '../services/geminiService';
import { toast } from '../lib/dialogs';
import { ViajeroScanModal } from './ViajeroScanModal';
import { OCManagerModal } from './OCManagerModal'; // Named import
import { ViajeroQRModal } from './ViajeroQRModal';

interface ViajeroManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  viajeroId?: string;
  onSave: () => void;
  onPrint?: (id: string) => void;
  initialTab?: 'general' | 'operaciones' | 'materiales' | 'comentarios' | 'ia_visual';
}

const CENTROS_DEFAULT = ['LASER', 'DOBLEZ', 'CNC', 'SOLDADURA', 'PINTURA', 'ENSAMBLE', 'MAQUINADO', 'TORNO', 'FRESADO', 'CORTE', 'DOBLADO', 'ROLADO', 'BARRENADO', 'ROSCADO', 'PULIDO', 'GALVANIZADO'];

interface ComboBoxProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  isDark?: boolean;
  onCreate?: (v: string) => void;
}

const ComboBox: React.FC<ComboBoxProps> = ({ value, onChange, options, placeholder, className, isDark, onCreate }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const filtered = options
    .filter(o => o.toLowerCase().includes((value || '').toLowerCase()))
    .slice(0, 12);
  const showCreate = !!onCreate && value.trim().length > 0 && !options.some(o => o.toLowerCase() === value.trim().toLowerCase());
  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative w-full group">
      <input
        className={`${className} pr-8`}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      <div 
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-slate-300 transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <ChevronDown size={14} />
      </div>
      {open && (filtered.length > 0 || showCreate) && (
        <div className={`absolute z-[200] top-full left-0 right-0 mt-0.5 rounded-xl border shadow-2xl overflow-hidden overflow-y-auto max-h-48 custom-scrollbar ${
          isDark ? 'bg-[#0c1526] border-white/15' : 'bg-white border-slate-200 shadow-slate-200/80'
        }`}>
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-[11px] font-bold transition-colors ${
                isDark ? 'text-slate-200 hover:bg-blue-500/15 hover:text-white' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              {opt}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); onCreate!(value.trim()); onChange(value.trim()); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                filtered.length > 0 ? `border-t ${isDark ? 'border-white/10' : 'border-slate-100'}` : ''
              } ${isDark ? 'text-blue-400 hover:bg-blue-500/15 hover:text-blue-300' : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'}`}
            >
              <Plus size={11} /> Dar de alta "{value.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const EMPTY_FORM = {
  id: '',
  cliente: '',
  numero_parte: '',
  descripcion: '',
  revision: '',
  cantidad_orden: 1,
  cant_fabricada: 0,
  fecha_orden: new Date().toISOString().split('T')[0],
  fecha_entrega: '',
  oc_cliente: '',
  linea: '',
  ensamble_tl: '',
  dibujo: '',
  cotizacion: '',
  horas_est_totales: 0,
  notas: '',
  estatus: 'PENDIENTE' as const,
  prioridad: 'NORMAL' as const,
  es_maestro: false,
  ensamble_padre: '',
  ensamble_padre_desc: '',
  avance_porcentaje: 0,
  motivo_rechazo: '',
  rechazado_por: '',
  fecha_rechazo: '',
  image_prompt: '',
  image_url: '',
};

export const ViajeroManagerModal: React.FC<ViajeroManagerModalProps> = ({
  isOpen,
  onClose,
  viajeroId,
  onSave,
  onPrint,
  initialTab = 'general',
}) => {
  const { isDarkMode, config } = useConfig();
  const [tab, setTab]               = useState(initialTab);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [operaciones, setOps]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [aiLoading, setAiLoading]       = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [aiCostLoading, setAiCostLoading]         = useState(false);
  const [aiMatCostLoading, setAiMatCostLoading]   = useState(false);
  const [isOCModalOpen, setIsOCModalOpen] = useState(false);
  const [comentarios, setComentarios]     = useState<any[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [qrViajero, setQrViajero]             = useState<any>(null);

  const [sendingComment, setSendingComment]   = useState(false);
  const comentariosEndRef = useRef<HTMLDivElement>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [isUploadedImage, setIsUploadedImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [materiales, setMateriales]       = useState<any[]>([]);
  const [saveError, setSaveError]         = useState<string | null>(null);
  const [ctCatalog, setCtCatalog]             = useState<string[]>([...CENTROS_DEFAULT]);
  const [opCatalog, setOpCatalog]             = useState<string[]>([]);
  const [matDescCatalog, setMatDescCatalog]   = useState<string[]>([]);
  const [matClaveCatalog, setMatClaveCatalog] = useState<string[]>([]);
  const [fullOpCatalog, setFullOpCatalog]     = useState<any[]>([]);
  const [fullMatCatalog, setFullMatCatalog]   = useState<any[]>([]);
  const [ocCatalog, setOcCatalog]             = useState<string[]>([]);
  const [fullOcCatalog, setFullOcCatalog]     = useState<any[]>([]);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    // Cargar catálogos para comboboxes
    (async () => {
      const results = await Promise.allSettled([
        supabase.from('viajero_operaciones').select('centro_trabajo, nombre_operacion'),
        supabase.from('viajero_materiales').select('descripcion, clave'),
        supabase.from('catalogo_operaciones').select('*'),
        supabase.from('catalogo_materiales').select('*'),
        supabase.from('ordenes_compra_cliente').select('*').order('created_at', { ascending: false })
      ]);
      const [opsRes, matsRes, catOpsRes, catMatsRes, ocRes] = results;
      const opsData    = opsRes.status    === 'fulfilled' ? opsRes.value.data    : [];
      const matsData   = matsRes.status   === 'fulfilled' ? matsRes.value.data   : [];
      const catOpsData = catOpsRes.status === 'fulfilled' ? catOpsRes.value.data : [];
      const catMatsData= catMatsRes.status=== 'fulfilled' ? catMatsRes.value.data: [];
      const ocData     = ocRes.status     === 'fulfilled' ? ocRes.value.data     : [];

      const dbCentros = (opsData || []).map((o: any) => o.centro_trabajo).filter(Boolean) as string[];
      const catCentros = (catOpsData || []).map((o: any) => o.centro_trabajo).filter(Boolean) as string[];
      setCtCatalog([...new Set([...CENTROS_DEFAULT, ...dbCentros, ...catCentros])]);

      const opsSet = new Set([
        ...(opsData || []).map((o: any) => o.nombre_operacion),
        ...(catOpsData || []).map((o: any) => o.nombre_operacion)
      ].filter(Boolean));
      setOpCatalog([...opsSet] as string[]);
      setFullOpCatalog(catOpsData || []);

      const matDescSet = new Set([
        ...(matsData || []).map((m: any) => m.descripcion),
        ...(catMatsData || []).map((m: any) => m.descripcion)
      ].filter(Boolean));
      setMatDescCatalog([...matDescSet] as string[]);

      const matClaveSet = new Set([
        ...(matsData || []).map((m: any) => m.clave),
        ...(catMatsData || []).map((m: any) => m.clave)
      ].filter(Boolean));
      setMatClaveCatalog([...matClaveSet] as string[]);
      setFullMatCatalog(catMatsData || []);

      const ocsArray = (ocData || []).map(o => o.numero_oc).filter(Boolean);
      setOcCatalog([...new Set(ocsArray)] as string[]);
      setFullOcCatalog(ocData || []);
    })();
    if (viajeroId) {
      loadViajero(viajeroId);
    } else {
      setForm({ ...EMPTY_FORM });
      setOps([]);
      setComentarios([]);
      setMateriales([]);
      loadNextJobId();
    }
  }, [isOpen, viajeroId]);

  const loadNextJobId = async () => {
    try {
      const { data } = await supabase.from('viajeros').select('id');
      if (data && data.length > 0) {
        const nums = data
          .map(v => { const m = v.id?.match(/\d+/); return m ? parseInt(m[0]) : null; })
          .filter((n): n is number => n !== null);
        const maxId = nums.length > 0 ? Math.max(...nums) : 1000;
        setForm(f => ({ ...f, id: `${maxId + 1}` }));
      } else {
        setForm(f => ({ ...f, id: '1001' }));
      }
    } catch (err) {
      console.error('Error calculando siguiente Job ID:', err);
    }
  };

  const loadViajero = async (id: string) => {
    setLoading(true);
    try {
      const { data } = await supabase.from('viajeros').select('*').eq('id', id).single();
      if (data) {
        setForm({
          ...EMPTY_FORM,
          ...data,
          fecha_orden:    data.fecha_orden    ? data.fecha_orden.split('T')[0]    : '',
          fecha_entrega:  data.fecha_entrega  ? data.fecha_entrega.split('T')[0]  : '',
          fecha_rechazo:  data.fecha_rechazo  ? data.fecha_rechazo.split('T')[0]  : '',
        });
      }

      const { data: ops } = await supabase
        .from('viajero_operaciones')
        .select('*')
        .eq('viajero_id', id)
        .order('orden', { ascending: true });
      setOps(ops || []);

      const { data: comments } = await supabase
        .from('viajero_comentarios')
        .select('*')
        .eq('viajero_id', id)
        .order('created_at', { ascending: true });
      setComentarios(comments || []);

      const { data: mats } = await supabase
        .from('viajero_materiales')
        .select('*')
        .eq('viajero_id', id)
        .order('created_at', { ascending: true });
      setMateriales(mats || []);
    } catch (err) {
      console.error('Error cargando viajero:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Limpiar fechas vacías → null para que PostgreSQL las acepte
      const payload = {
        ...form,
        fecha_entrega: form.fecha_entrega || null,
        fecha_rechazo: form.fecha_rechazo || null,
      };

      if (viajeroId) {
        const { error } = await supabase.from('viajeros').update(payload).eq('id', viajeroId);
        if (error) throw error;

        // Guardar operaciones existentes (incluyendo costos generados por IA)
        const existingOps = operaciones.filter(o => o.id);
        const newOps      = operaciones.filter(o => !o.id);
        if (existingOps.length > 0) {
          await Promise.all(existingOps.map(op =>
            supabase.from('viajero_operaciones').update({
              centro_trabajo:   op.centro_trabajo   || '',
              nombre_operacion: op.nombre_operacion || '',
              orden:            op.orden,
              estado:           op.estado           || 'pending',
              tiempo_estimado:  op.tiempo_estimado  || 0,
              costo_hora_mxn:   op.costo_hora_mxn   || 0,
              costo_hora_usd:   op.costo_hora_usd   || 0,
            }).eq('id', op.id)
          ));
        }
        if (newOps.length > 0) {
          await supabase.from('viajero_operaciones').insert(
            newOps.map((op, idx) => ({
              viajero_id:            viajeroId,
              centro_trabajo:        op.centro_trabajo        || '',
              nombre_operacion:      op.nombre_operacion      || op.centro_trabajo || '',
              clave_operacion:       `OP-${Date.now()}-${idx}`,
              orden:                 op.orden                 ?? (existingOps.length + idx + 1),
              estado:                op.estado                || 'pending',
              tiempo_estimado:       op.tiempo_estimado       || 0,
              tiempo_real_acumulado: 0,
              costo_hora_mxn:        op.costo_hora_mxn        || 0,
              costo_hora_usd:        op.costo_hora_usd        || 0,
            }))
          );
        }

        // Guardar materiales existentes (incluyendo costos generados por IA)
        const existingMats = materiales.filter(m => m.id);
        const newMats      = materiales.filter(m => !m.id);
        if (existingMats.length > 0) {
          await Promise.all(existingMats.map(mat =>
            supabase.from('viajero_materiales').update({
              descripcion:         mat.descripcion         || '',
              clave:               mat.clave               || '',
              cantidad:            mat.cantidad            ?? 1,
              unidad:              mat.unidad              || 'pza',
              es_recogida:         mat.es_recogida         ?? false,
              ubicacion:           mat.ubicacion           || '',
              clave_requerimiento: mat.clave_requerimiento || '',
              costo_unitario_mxn:  mat.costo_unitario_mxn  || 0,
              costo_unitario_usd:  mat.costo_unitario_usd  || 0,
            }).eq('id', mat.id)
          ));
        }
        if (newMats.length > 0) {
          await supabase.from('viajero_materiales').insert(
            newMats.map(mat => ({
              viajero_id:          viajeroId,
              descripcion:         mat.descripcion         || '',
              clave:               mat.clave               || mat.material || '',
              cantidad:            mat.cantidad            ?? 1,
              unidad:              mat.unidad              || 'pza',
              es_recogida:         mat.es_recogida         ?? false,
              ubicacion:           mat.ubicacion           || '',
              clave_requerimiento: mat.clave_requerimiento || '',
              costo_unitario_mxn:  mat.costo_unitario_mxn  || 0,
              costo_unitario_usd:  mat.costo_unitario_usd  || 0,
            }))
          );
        }
      } else {
        const { data: newViajero, error: insertError } = await supabase
          .from('viajeros').insert([payload]).select().single();
        if (insertError) throw insertError;

        if (newViajero) {
          // Insertar ops locales
          const localOps = operaciones.filter(o => !o.id);
          if (localOps.length > 0) {
            await supabase.from('viajero_operaciones').insert(
              localOps.map((op, idx) => ({
                viajero_id:            newViajero.id,
                centro_trabajo:        op.centro_trabajo || '',
                nombre_operacion:      op.nombre_operacion || op.centro_trabajo || '',
                clave_operacion:       `OP-${Date.now()}-${idx}`,
                orden:                 op.orden ?? idx + 1,
                estado:                op.estado || 'pending',
                tiempo_estimado:       op.tiempo_estimado || 0,
                tiempo_real_acumulado: 0,
                costo_hora_mxn:        op.costo_hora_mxn || 0,
                costo_hora_usd:        op.costo_hora_usd || 0,
              }))
            );
          }
          // Insertar mats locales
          const localMats = materiales.filter(m => !m.id);
          if (localMats.length > 0) {
            await supabase.from('viajero_materiales').insert(
              localMats.map(mat => ({
                viajero_id:          newViajero.id,
                descripcion:         mat.descripcion || '',
                clave:               mat.clave || mat.material || '',
                cantidad:            mat.cantidad ?? 1,
                unidad:              mat.unidad || 'pza',
                es_recogida:         mat.es_recogida ?? false,
                ubicacion:           mat.ubicacion || '',
                clave_requerimiento: mat.clave_requerimiento || '',
                costo_unitario_mxn:  mat.costo_unitario_mxn || 0,
                costo_unitario_usd:  mat.costo_unitario_usd || 0,
              }))
            );
          }
          // Insertar comentarios locales
          const localComments = comentarios.filter(c => !c.id);
          if (localComments.length > 0) {
            await supabase.from('viajero_comentarios').insert(
              localComments.map(c => ({
                viajero_id: newViajero.id,
                contenido:  c.contenido,
                autor:      c.autor || 'Usuario',
              }))
            );
          }
        }
      }
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error guardando viajero:', err);
      const msg = err?.message || err?.details || JSON.stringify(err);
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const updateOp = (opKey: string, field: string, value: any) => {
    let updatedObj: any = null;
    setOps(prev => prev.map(o => {
      if ((o.id || o._key) === opKey) {
        let updated = { ...o, [field]: value };
        // Auto-completar desde catálogo si es el nombre de la operación
        if (field === 'nombre_operacion') {
          const match = fullOpCatalog.find(c => c.nombre_operacion === value);
          if (match) {
            updated.centro_trabajo = match.centro_trabajo || updated.centro_trabajo;
            if (match.tiempo_min_base > 0) {
              updated.tiempo_estimado = match.tiempo_min_base / 60;
            }
          }
        }
        updatedObj = updated;
        return updated;
      }
      return o;
    }));

    if (updatedObj?.id) {
      // Sync all potentially changed fields
      supabase.from('viajero_operaciones').update({
        centro_trabajo: updatedObj.centro_trabajo,
        nombre_operacion: updatedObj.nombre_operacion,
        tiempo_estimado: updatedObj.tiempo_estimado,
        estado: updatedObj.estado,
        costo_hora_mxn: updatedObj.costo_hora_mxn,
        costo_hora_usd: updatedObj.costo_hora_usd
      }).eq('id', updatedObj.id).then(({ error }) => {
        if (error) console.error('Error auto-guardando operación:', error);
      });
    }
  };

  const moveOp = (index: number, direction: 'up' | 'down') => {
    const newOps = [...operaciones];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOps.length) return;

    // Swap
    [newOps[index], newOps[targetIndex]] = [newOps[targetIndex], newOps[index]];

    // Re-asignar orden
    const updatedOps = newOps.map((op, idx) => ({ ...op, orden: idx + 1 }));
    setOps(updatedOps);

    // Sync a DB si aplica
    updatedOps.forEach(op => {
      if (op.id) {
        supabase.from('viajero_operaciones').update({ orden: op.orden }).eq('id', op.id);
      }
    });
  };

  const addOp = () => {
    const newOp: any = {
      _key: `local-${Date.now()}`,
      centro_trabajo: '',
      nombre_operacion: '',
      clave_operacion: `OP-${Date.now()}`,
      orden: operaciones.length + 1,
      estado: 'pending',
      tiempo_estimado: 0,
      tiempo_real_acumulado: 0,
      costo_hora_mxn: 0,
      costo_hora_usd: 0,
    };
    setOps(prev => [...prev, newOp]);
  };

  const deleteOp = async (opKey: string) => {
    const op = operaciones.find(o => (o.id || o._key) === opKey);
    if (op?.id) await supabase.from('viajero_operaciones').delete().eq('id', opKey);
    setOps(prev => prev.filter(o => (o.id || o._key) !== opKey));
  };

  const toggleTodoRecogida = () => {
    const allRecogida = materiales.every(m => m.es_recogida);
    materiales.forEach(mat => {
      const key = mat.id || mat._key;
      updateMat(key, 'es_recogida', !allRecogida);
    });
  };

  const addMat = () => {
    const newMat: any = {
      _key: `local-${Date.now()}`,
      descripcion: '', cantidad: 1, unidad: 'pza', clave: '',
      es_recogida: false, ubicacion: '', clave_requerimiento: '',
      costo_unitario_mxn: 0, costo_unitario_usd: 0,
    };
    setMateriales(prev => [...prev, newMat]);
  };

  const deleteMat = async (matKey: string) => {
    const mat = materiales.find(m => (m.id || m._key) === matKey);
    if (mat?.id) await supabase.from('viajero_materiales').delete().eq('id', matKey);
    setMateriales(prev => prev.filter(m => (m.id || m._key) !== matKey));
  };

  const updateMat = (matKey: string, field: string, value: any) => {
    let updatedObj: any = null;
    setMateriales(prev => prev.map(m => {
      if ((m.id || m._key) === matKey) {
        let updated = { ...m, [field]: value };
        // Auto-completar desde catálogo
        if (field === 'descripcion' || field === 'clave') {
          const match = fullMatCatalog.find(c => c.descripcion === value || c.clave === value);
          if (match) {
            updated.descripcion = match.descripcion || updated.descripcion;
            updated.clave = match.clave || updated.clave;
            updated.unidad = match.unidad || updated.unidad;
            updated.costo_unitario_mxn = match.costo_unitario_mxn || updated.costo_unitario_mxn;
            updated.costo_unitario_usd = match.costo_unitario_usd || updated.costo_unitario_usd;
          }
        }
        updatedObj = updated;
        return updated;
      }
      return m;
    }));

    if (updatedObj?.id) {
      supabase.from('viajero_materiales').update({
        descripcion: updatedObj.descripcion,
        clave: updatedObj.clave,
        cantidad: updatedObj.cantidad,
        unidad: updatedObj.unidad,
        es_recogida: updatedObj.es_recogida,
        ubicacion: updatedObj.ubicacion,
        clave_requerimiento: updatedObj.clave_requerimiento,
        costo_unitario_mxn: updatedObj.costo_unitario_mxn,
        costo_unitario_usd: updatedObj.costo_unitario_usd
      }).eq('id', updatedObj.id).then(({ error }) => {
        if (error) console.error('Error auto-guardando material:', error);
      });
    }
  };

  const handleScanFill = (data: any) => {
    setForm(f => ({
      ...f,
      numero_parte:      data.numero_parte                          || f.numero_parte,
      revision:          data.revision                             || f.revision,
      descripcion:       data.descripcion                          || f.descripcion,
      cliente:           data.cliente                              || f.cliente,
      horas_est_totales: (data.horas_estimadas_total || 0) > 0 ? data.horas_estimadas_total : f.horas_est_totales,
      notas:             data.notas_tecnicas ? `${f.notas ? f.notas + '\n' : ''}${data.notas_tecnicas}` : f.notas,
    }));

    // Agregar operaciones directamente a la lista para revisión
    if (data.operaciones_sugeridas?.length) {
      const newOps = data.operaciones_sugeridas.map((ct: string, idx: number) => ({
        _key:               `ia-${Date.now()}-${idx}`,
        centro_trabajo:     ct,
        nombre_operacion:   ct,
        clave_operacion:    `OP-${Date.now()}-${idx}`,
        orden:              idx + 1,
        estado:             'pending',
        tiempo_estimado:    data.horas_por_operacion?.[ct] || 0,
        tiempo_real_acumulado: 0,
        costo_hora_mxn:     0,
        costo_hora_usd:     0,
      }));
      setOps(prev => {
        // Evitar duplicados si ya hay ops locales de IA
        const sinLocalesIA = prev.filter(o => o.id);
        return [...sinLocalesIA, ...newOps];
      });
    }

    // Agregar materiales directamente a la lista para revisión (soporta múltiples)
    const matsFromIA: any[] = data.materiales_sugeridos?.length
      ? data.materiales_sugeridos
      : data.material
      ? [{ material: data.material, descripcion: data.material, cantidad: 1, unidad: 'pza', espesor: data.espesor || '' }]
      : [];

    if (matsFromIA.length) {
      const ts = Date.now();
      const newMats = matsFromIA.map((m: any, idx: number) => ({
        _key:                `ia-mat-${ts}-${idx}`,
        descripcion:         m.descripcion || m.material,
        clave:               m.material,
        espesor:             m.espesor || '',
        cantidad:            m.cantidad ?? 1,
        unidad:              m.unidad || 'pza',
        es_recogida:         false,
        ubicacion:           '',
        clave_requerimiento: '',
        costo_unitario_mxn:  0,
        costo_unitario_usd:  0,
      }));
      setMateriales(prev => {
        const sinLocalesIA = prev.filter(m => m.id);
        return [...sinLocalesIA, ...newMats];
      });
    }

    setTab('operaciones');
  };


  const handleEnviarComentario = async () => {
    if (!nuevoComentario.trim()) return;
    if (!viajeroId) {
      setComentarios(prev => [...prev, {
        _key:       `local-${Date.now()}`,
        contenido:  nuevoComentario.trim(),
        autor:      'Usuario',
        created_at: new Date().toISOString(),
      }]);
      setNuevoComentario('');
      setTimeout(() => comentariosEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      return;
    }
    setSendingComment(true);
    try {
      const { data, error } = await supabase
        .from('viajero_comentarios')
        .insert([{ viajero_id: viajeroId, contenido: nuevoComentario.trim(), autor: 'Usuario' }])
        .select()
        .single();
      if (error) throw error;
      if (data) setComentarios(prev => [...prev, data]);
      setNuevoComentario('');
      setTimeout(() => comentariosEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err: any) {
      console.error('Error al guardar comentario:', err);
      setSaveError(`Error al guardar nota: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setSendingComment(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!form.descripcion && !form.numero_parte) return;
    setAiLoading(true);
    try {
      const input = form.descripcion || form.numero_parte;
      const prompt = `Eres experto en manufactura industrial metalmecánica para la empresa ${config.companyName} en México.
Con base en esta descripción/referencia de pieza: "${input}"

Genera un análisis técnico completo de manufactura. Responde TODO en ESPAÑOL excepto el image_prompt.
Sé específico y realista para fabricación industrial mexicana (centros de trabajo típicos: LASER, DOBLEZ, CNC, SOLDADURA, PINTURA, ENSAMBLE, MAQUINADO, TORNO, FRESADO).`;

      const schema = `{
        "numero_parte": "código sugerido P/N-XXX basado en la descripción",
        "revision": "letra de revisión sugerida (A, B, C...)",
        "descripcion": "descripción técnica profesional mejorada en español",
        "cliente": "cliente típico si aplica, o cadena vacía",
        "materiales_sugeridos": [
          { "material": "MATERIAL EN MAYÚSCULAS", "descripcion": "forma/uso del material", "cantidad": 1, "unidad": "kg", "espesor": "espesor si aplica o cadena vacía" }
        ],
        "operaciones_sugeridas": ["OPERACION1", "OPERACION2"],
        "horas_por_operacion": { "OPERACION1": 0.0, "OPERACION2": 0.0 },
        "horas_estimadas_total": 0.0,
        "notas_tecnicas": "notas técnicas, tolerancias, acabados o especificaciones relevantes",
        "image_prompt": "Industrial 3D render of [pieza], heavy metal texture, photorealistic, isometric view, 8k, cinematic lighting, factory background, highly detailed."
      }`;

      const data = await geminiService.generateStructuredData<any>(prompt, schema, { moduleName: 'viajero' });
      handleScanFill(data);
    } catch (err) {
      console.error('Error IA suggest:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiEstimarCostos = async () => {
    if (operaciones.length === 0) return;
    setAiCostLoading(true);
    try {
      const ctList = [...new Set(operaciones.map(o => o.centro_trabajo).filter(Boolean))];
      const prompt = `Eres experto en costos de manufactura industrial mexicana para la empresa ${config.companyName}.
Viajero/Pieza: "${form.descripcion || form.numero_parte || form.id}"
Centros de trabajo activos: ${ctList.length > 0 ? ctList.join(', ') : 'LASER, DOBLEZ, CNC, SOLDADURA, PINTURA, ENSAMBLE'}

Estima el costo por hora por centro de trabajo en MXN y USD (tipo de cambio aprox $17.50 MXN/USD).
Considera: mano de obra directa, overhead de maquinaria, insumos y gastos de operación. Usa valores realistas de manufactura metalmecánica en México.`;

      const schema = `{
        "centros": [
          { "centro_trabajo": "NOMBRE_CT", "costo_hora_mxn": 0, "costo_hora_usd": 0 }
        ]
      }`;

      const data = await geminiService.generateStructuredData<{
        centros: { centro_trabajo: string; costo_hora_mxn: number; costo_hora_usd: number }[];
      }>(prompt, schema, { moduleName: 'viajero' });

      if (data?.centros) {
        const rateMap: Record<string, { mxn: number; usd: number }> = {};
        data.centros.forEach(c => {
          rateMap[c.centro_trabajo] = { mxn: c.costo_hora_mxn, usd: c.costo_hora_usd };
        });

        const updated = operaciones.map(op => {
          const rates = rateMap[op.centro_trabajo];
          if (!rates) return op;
          void supabase.from('viajero_operaciones')
            .update({ costo_hora_mxn: rates.mxn, costo_hora_usd: rates.usd })
            .eq('id', op.id);
          return { ...op, costo_hora_mxn: rates.mxn, costo_hora_usd: rates.usd };
        });
        setOps(updated);
      }
    } catch (err) {
      console.error('Error IA estimar costos:', err);
    } finally {
      setAiCostLoading(false);
    }
  };

  const handleAiEstimarCostosMateriales = async () => {
    if (materiales.length === 0) return;
    setAiMatCostLoading(true);
    try {
      const matList = materiales.map(m => ({
        clave: m.clave || m.descripcion || '',
        descripcion: m.descripcion || '',
        unidad: m.unidad || 'pza',
      }));
      const prompt = `Eres experto en costos de materiales industriales para manufactura metalmecánica en México (empresa ${config.companyName}).
Viajero/Pieza: "${form.descripcion || form.numero_parte || form.id}"
Lista de materiales:
${matList.map((m, i) => `${i + 1}. ${m.clave} — ${m.descripcion} (por ${m.unidad})`).join('\n')}

Estima el costo unitario por ${[...new Set(matList.map(m => m.unidad))].join('/')} en MXN y USD (tipo de cambio ~$17.50 MXN/USD).
Usa precios actuales de mercado en México para materiales industriales metalmecánicos. Sé realista y específico por tipo de material.`;

      const schema = `{
        "materiales": [
          { "clave": "CLAVE_O_DESCRIPCION", "costo_unitario_mxn": 0, "costo_unitario_usd": 0 }
        ]
      }`;

      const data = await geminiService.generateStructuredData<{
        materiales: { clave: string; costo_unitario_mxn: number; costo_unitario_usd: number }[];
      }>(prompt, schema, { moduleName: 'viajero' });

      if (data?.materiales) {
        const rateMap: Record<string, { mxn: number; usd: number }> = {};
        data.materiales.forEach(m => {
          rateMap[m.clave] = { mxn: m.costo_unitario_mxn, usd: m.costo_unitario_usd };
        });

        const updated = materiales.map(mat => {
          const key = mat.clave || mat.descripcion || '';
          const rates = rateMap[key];
          if (!rates) return mat;
          if (mat.id) {
            void supabase.from('viajero_materiales')
              .update({ costo_unitario_mxn: rates.mxn, costo_unitario_usd: rates.usd })
              .eq('id', mat.id);
          }
          return { ...mat, costo_unitario_mxn: rates.mxn, costo_unitario_usd: rates.usd };
        });
        setMateriales(updated);
      }
    } catch (err) {
      console.error('Error IA estimar costos materiales:', err);
    } finally {
      setAiMatCostLoading(false);
    }
  };

  const generateIndustrialImage = async () => {
    if (!form.image_prompt) return;
    setAiLoading(true);
    setImageGenerating(true);
    setIsUploadedImage(false);
    try {
      const seed = Math.floor(Math.random() * 1_000_000);
      const encoded = encodeURIComponent(form.image_prompt);
      const url = `https://image.pollinations.ai/prompt/${encoded}?seed=${seed}&width=1024&height=1024&nologo=true&enhance=true`;
      await new Promise(r => setTimeout(r, 2000));
      setForm(f => ({ ...f, image_url: url }));
      toast('¡Visualización técnica generada!', 'success');
    } catch (err) {
      console.error('Error al generar imagen:', err);
      toast('No se pudo generar la visualización técnica.', 'error');
    } finally {
      setAiLoading(false);
      setImageGenerating(false);
    }
  };

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiLoading(true);
    setIsUploadedImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({ ...f, image_url: reader.result as string }));
      setAiLoading(false);
    };
    reader.onerror = () => {
      console.error('Error leyendo imagen');
      setAiLoading(false);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const TABS = [
    { id: 'general',     label: 'General',    icon: <Settings size={13} /> },
    { id: 'operaciones', label: 'Operaciones', icon: <Hammer size={13} /> },
    { id: 'materiales',  label: 'Materiales',  icon: <Box size={13} /> },
    { id: 'comentarios', label: `Notas${comentarios.length > 0 ? ` (${comentarios.length})` : ''}`, icon: <MessageSquare size={13} /> },
    { id: 'ia_visual',   label: 'IA Visual',   icon: <Sparkles size={13} /> },
  ] as const;

  // Clases compartidas
  const fieldBase = isDarkMode
    ? 'w-full bg-white/[0.06] border border-white/15 rounded-xl px-3.5 py-2.5 text-[12px] text-white font-medium outline-none focus:border-blue-500/60 focus:bg-white/[0.08] transition-all placeholder:text-slate-600'
    : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[12px] text-slate-900 font-medium outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400';

  const labelCls = 'text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5';

  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
      <div className="w-5 h-5 rounded-md bg-blue-500/15 flex items-center justify-center text-blue-400">
        {icon}
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">{title}</span>
    </div>
  );

  const ESTATUS_COLOR: Record<string, string> = {
    PENDIENTE:   'text-slate-300',
    'EN PROCESO':'text-blue-400',
    DETENIDO:    'text-amber-400',
    COMPLETADO:  'text-emerald-400',
    RECHAZADO:   'text-rose-400',
  };

  return (
    <>
    {/* Panel derecho — ocupa desde left-64 (sidebar) hasta right-0, debajo de top-16 (topbar) */}
    <div className={`fixed top-16 bottom-0 right-0 left-64 z-[60] flex flex-col overflow-hidden border-l
      ${isDarkMode ? 'bg-[#080f1e] border-white/8' : 'bg-white border-slate-200'}
    `}>

        {/* ── Header ── */}
        <div className={`
          flex items-center justify-between px-7 py-5
          border-b ${isDarkMode ? 'border-white/8 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/60'}
          shrink-0
        `}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-blue-500' : 'text-blue-600'}`}>
                {viajeroId ? 'Editar Viajero' : 'Nuevo Viajero'}
              </span>
              {form.prioridad === 'URGENTE' && (
                <span className="px-2 py-0.5 bg-red-500/15 border border-red-500/30 rounded-full text-[8px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
                  <AlertTriangle size={9} /> Urgente
                </span>
              )}
            </div>
            <h2 className={`text-xl font-black uppercase tracking-tight leading-none truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {viajeroId ? `Viajero ${viajeroId}` : 'Nuevo Viajero'}
            </h2>
            {form.cliente && (
              <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-widest truncate">
                {form.cliente}{form.numero_parte ? ` · ${form.numero_parte}` : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={() => setShowScanModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/25"
            >
              <Camera size={12} /> Escanear
            </button>
            <button
              onClick={handleAiSuggest}
              disabled={aiLoading || (!form.descripcion && !form.numero_parte)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-40 shadow-lg shadow-blue-600/25"
            >
              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              IA Sugerir
            </button>
            {viajeroId && onPrint && (
              <button
                onClick={() => onPrint(viajeroId)}
                className="px-3.5 py-2 bg-blue-600/15 border border-blue-500/30 text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600/25 transition-all"
              >
                Imprimir PDF
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className={`flex border-b ${isDarkMode ? 'border-white/8 bg-white/[0.01]' : 'border-slate-100 bg-slate-50/40'} shrink-0 overflow-x-auto`}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
                tab === t.id
                  ? t.id === 'ia_visual'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : `border-blue-500 text-blue-400 ${isDarkMode ? 'bg-blue-500/5' : 'bg-blue-50'}`
                  : `border-transparent ${isDarkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/60'}`
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 size={28} className="text-blue-500 animate-spin" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cargando datos...</p>
            </div>

          ) : tab === 'general' ? (
            <div className="p-7 space-y-7">

              {/* Sección: Identificación */}
              <div>
                {sectionTitle(<Hash size={12} />, 'Identificación del Viajero')}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}><Hash size={9} /> ID / Folio</label>
                    <input
                      className={`${fieldBase} ${isDarkMode ? 'text-blue-400 border-blue-500/20 bg-blue-500/5 focus:border-blue-500/50' : 'text-blue-600 border-blue-200 bg-blue-50/50'} font-bold`}
                      placeholder="JOB-001"
                      value={form.id}
                      onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                      disabled={!!viajeroId}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Número de Parte</label>
                    <input
                      className={fieldBase}
                      placeholder="P/N-001"
                      value={form.numero_parte}
                      onChange={e => setForm(f => ({ ...f, numero_parte: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Revisión</label>
                    <input
                      className={fieldBase}
                      placeholder="A"
                      value={form.revision}
                      onChange={e => setForm(f => ({ ...f, revision: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className={labelCls}><FileText size={9} /> Descripción del Ensamble</label>
                  <textarea
                    className={`${fieldBase} resize-none leading-relaxed`}
                    rows={3}
                    placeholder="Descripción técnica del ensamble o componente industrial..."
                    value={form.descripcion}
                    onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  />
                </div>
              </div>

              {/* Sección: Cliente y Orden */}
              <div>
                {sectionTitle(<Building2 size={12} />, 'Cliente y Orden')}
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className={labelCls}><Building2 size={9} /> Cliente</label>
                    <input
                      className={fieldBase}
                      placeholder="NOMBRE CLIENTE"
                      value={form.cliente}
                      onChange={e => setForm(f => ({ ...f, cliente: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>OC Cliente</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <ComboBox
                          options={ocCatalog}
                          value={form.oc_cliente}
                          placeholder="OC-0000"
                          onChange={val => {
                            setForm(f => {
                              const updated = { ...f, oc_cliente: val };
                              // Auto-llenado desde OC
                              const match = fullOcCatalog.find(o => o.numero_oc === val);
                              if (match) {
                                if (match.cliente_nombre) updated.cliente = match.cliente_nombre;
                                if (match.fecha_entrega_esperada) updated.fecha_entrega = match.fecha_entrega_esperada;
                                if (match.numero_parte) updated.numero_parte = match.numero_parte;
                                if (match.descripcion) updated.descripcion = match.descripcion;
                                if (match.cantidad) updated.cantidad_orden = match.cantidad;
                              }
                              return updated;
                            });
                          }}
                        />
                      </div>
                      <button
                        onClick={() => setIsOCModalOpen(true)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0 ${
                          isDarkMode ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20' : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                        }`}
                        title="Crear Nueva OC"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Cotización</label>
                    <input
                      className={fieldBase}
                      placeholder="COT-001"
                      value={form.cotizacion}
                      onChange={e => setForm(f => ({ ...f, cotizacion: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Cantidad Ordenada</label>
                    <input
                      type="number"
                      className={fieldBase}
                      value={form.cantidad_orden}
                      onFocus={e => e.target.select()}
                      onChange={e => setForm(f => ({ ...f, cantidad_orden: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Cant. Fabricada</label>
                    <input
                      type="number"
                      className={fieldBase}
                      value={form.cant_fabricada}
                      onFocus={e => e.target.select()}
                      onChange={e => setForm(f => ({ ...f, cant_fabricada: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Dibujo</label>
                    <input
                      className={fieldBase}
                      placeholder="DWG-001"
                      value={form.dibujo}
                      onChange={e => setForm(f => ({ ...f, dibujo: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}><Clock size={9} /> Horas Est. Totales</label>
                    <input
                      type="number"
                      step="0.5"
                      className={`${fieldBase} ${isDarkMode ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' : 'text-amber-600 border-amber-200 bg-amber-50/50'}`}
                      value={form.horas_est_totales}
                      onFocus={e => e.target.select()}
                      onChange={e => setForm(f => ({ ...f, horas_est_totales: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Fechas y Estado */}
              <div>
                {sectionTitle(<Calendar size={12} />, 'Fechas y Estado')}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className={labelCls}><Calendar size={9} /> Fecha de Orden</label>
                    <input
                      type="date"
                      className={fieldBase}
                      value={form.fecha_orden || ''}
                      style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                      onChange={e => setForm(f => ({ ...f, fecha_orden: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={`${labelCls} text-amber-500`}><Calendar size={9} className="text-amber-500" /> Fecha de Entrega</label>
                    <input
                      type="date"
                      className={`${fieldBase} ${isDarkMode ? 'border-amber-500/25' : 'border-amber-300'}`}
                      value={form.fecha_entrega || ''}
                      style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                      onChange={e => setForm(f => ({ ...f, fecha_entrega: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Estatus</label>
                    <select
                      className={`${fieldBase} cursor-pointer ${ESTATUS_COLOR[form.estatus] || ''}`}
                      value={form.estatus}
                      onChange={e => setForm(f => ({ ...f, estatus: e.target.value as any }))}
                      style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                    >
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="EN PROCESO">EN PROCESO</option>
                      <option value="DETENIDO">DETENIDO</option>
                      <option value="COMPLETADO">COMPLETADO</option>
                      <option value="RECHAZADO">RECHAZADO</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Prioridad</label>
                    <select
                      className={`${fieldBase} cursor-pointer font-black ${
                        form.prioridad === 'URGENTE' ? 'text-red-400' :
                        form.prioridad === 'ALTA'    ? 'text-amber-400' : ''
                      }`}
                      value={form.prioridad}
                      onChange={e => setForm(f => ({ ...f, prioridad: e.target.value as any }))}
                      style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="ALTA">ALTA</option>
                      <option value="URGENTE">URGENTE</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección: Notas */}
              <div>
                {sectionTitle(<FileText size={12} />, 'Notas e Instrucciones')}
                <textarea
                  className={`${fieldBase} resize-none leading-relaxed`}
                  rows={3}
                  placeholder="Instrucciones especiales, alertas de calidad o notas de embarque..."
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                />
              </div>

              {/* Bloque de rechazo */}
              {form.estatus === 'RECHAZADO' && (
                <div className="p-5 bg-rose-950/30 border border-rose-600/30 rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <XCircle size={14} className="text-rose-400" />
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Registro de Rechazo</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-3">
                      <label className={labelCls}>Motivo de Rechazo *</label>
                      <select
                        className={`${fieldBase} border-rose-600/30`}
                        value={form.motivo_rechazo}
                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                        onChange={e => setForm(f => ({ ...f, motivo_rechazo: e.target.value }))}
                      >
                        <option value="">— Seleccionar motivo —</option>
                        <option>Dimensión fuera de tolerancia</option>
                        <option>Soldadura defectuosa</option>
                        <option>Acabado superficial inaceptable</option>
                        <option>Material incorrecto</option>
                        <option>Fisura o grieta detectada</option>
                        <option>Error de ensamble</option>
                        <option>No cumple especificación de cliente</option>
                        <option>Daño durante proceso</option>
                        <option>Otro</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Rechazado por (operador)</label>
                      <input
                        className={`${fieldBase} border-rose-600/30`}
                        placeholder="Nombre del operador / inspector"
                        value={form.rechazado_por}
                        onChange={e => setForm(f => ({ ...f, rechazado_por: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Fecha de Rechazo</label>
                      <input
                        type="date"
                        className={`${fieldBase} border-rose-600/30`}
                        value={form.fecha_rechazo || new Date().toISOString().split('T')[0]}
                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                        onChange={e => setForm(f => ({ ...f, fecha_rechazo: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          ) : tab === 'operaciones' ? (
            <div className="p-7 space-y-4">
              {/* Header bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <Hammer size={12} className="text-blue-400" />
                  {operaciones.length} {operaciones.length === 1 ? 'Operación' : 'Operaciones'}
                  {operaciones.some(o => !o.id) && (
                    <span className="px-2 py-0.5 bg-violet-500/15 border border-violet-500/25 rounded-full text-[8px] text-violet-400">
                      {operaciones.filter(o => !o.id).length} sin guardar
                    </span>
                  )}
                </div>
                <button
                  onClick={handleAiEstimarCostos}
                  disabled={aiCostLoading || operaciones.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-40 shadow-lg shadow-emerald-600/20"
                >
                  {aiCostLoading ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />}
                  IA Estimar Costos
                </button>
              </div>


              {/* Summary panel */}
              {operaciones.length > 0 && (() => {
                const totalEst  = operaciones.reduce((s, o) => s + (o.tiempo_estimado || 0), 0);
                const totalReal = operaciones.reduce((s, o) => s + (o.tiempo_real_acumulado || 0), 0);
                const diff      = totalReal - totalEst;
                const pct       = totalEst > 0 ? Math.round(Math.abs(diff) / totalEst * 100) : 0;
                const costoMXN  = operaciones.reduce((s, o) => s + (o.tiempo_estimado || 0) * (o.costo_hora_mxn || 0), 0);
                const costoUSD  = operaciones.reduce((s, o) => s + (o.tiempo_estimado || 0) * (o.costo_hora_usd || 0), 0);
                const hasCostos = costoMXN > 0 || costoUSD > 0;
                return (
                  <div className={`grid ${hasCostos ? 'grid-cols-5' : 'grid-cols-3'} gap-3 p-4 rounded-xl border ${isDarkMode ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Estimado</p>
                      <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalEst.toFixed(1)}<span className="text-xs text-slate-500 ml-1">h</span></p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Real</p>
                      <p className={`text-xl font-black ${totalReal > totalEst ? 'text-red-400' : 'text-emerald-400'}`}>
                        {totalReal.toFixed(1)}<span className="text-xs text-slate-500 ml-1">h</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Desviación</p>
                      <p className={`text-xl font-black flex items-center justify-center gap-1 ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {diff > 0 ? <TrendingUp size={14} /> : diff < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}h
                        <span className="text-[9px] text-slate-500">({pct}%)</span>
                      </p>
                    </div>
                    {hasCostos && (
                      <>
                        <div className={`text-center border-l pl-3 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                            <DollarSign size={9} /> MXN
                          </p>
                          <p className="text-xl font-black text-emerald-400">
                            ${costoMXN.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                            <DollarSign size={9} /> USD
                          </p>
                          <p className="text-xl font-black text-blue-300">
                            ${costoUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {operaciones.length === 0 && (
                <div className={`py-12 flex flex-col items-center gap-3 rounded-xl border border-dashed ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                  <Hammer size={32} className="text-slate-600" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sin operaciones — agrega la primera</p>
                </div>
              )}

              {operaciones.map((op, idx) => {
                const opKey = op.id || op._key;
                const isLocal = !op.id;
                return (
                <div key={opKey} className={`border rounded-xl transition-all overflow-hidden ${
                  isLocal            ? `${isDarkMode ? 'bg-violet-950/20 border-violet-500/30' : 'bg-violet-50 border-violet-300'}` :
                  op.estado === 'completed'   ? `${isDarkMode ? 'bg-emerald-950/20' : 'bg-emerald-50'} border-emerald-600/25` :
                  op.estado === 'in_progress' ? `${isDarkMode ? 'bg-blue-950/20' : 'bg-blue-50'} border-blue-600/30` :
                  `${isDarkMode ? 'bg-white/[0.03]' : 'bg-slate-50'} ${isDarkMode ? 'border-white/8' : 'border-slate-200'}`
                }`}>
                  {/* Indicador IA local */}
                  {isLocal && (
                    <div className="flex items-center gap-1.5 px-3.5 pt-2 pb-1">
                      <Sparkles size={9} className="text-violet-400" />
                      <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest">Sugerido por IA — editar y guardar</span>
                    </div>
                  )}
                  {/* Main row */}
                  <div className="flex items-center gap-3 p-3.5">
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => moveOp(idx, 'up')}
                        disabled={idx === 0}
                        className={`p-1.5 rounded-lg transition-all ${idx === 0 ? 'opacity-20 cursor-not-allowed' : 'bg-white/5 hover:bg-blue-500/20 text-slate-500 hover:text-blue-400'}`}>
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={() => moveOp(idx, 'down')}
                        disabled={idx === operaciones.length - 1}
                        className={`p-1.5 rounded-lg transition-all ${idx === operaciones.length - 1 ? 'opacity-20 cursor-not-allowed' : 'bg-white/5 hover:bg-blue-500/20 text-slate-500 hover:text-blue-400'}`}>
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <span className="text-[11px] font-black text-blue-500 w-6 text-center shrink-0">{idx + 1}</span>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <ComboBox
                        className={fieldBase}
                        placeholder="Centro de Trabajo"
                        value={op.centro_trabajo || ''}
                        onChange={v => updateOp(opKey, 'centro_trabajo', v.toUpperCase())}
                        options={ctCatalog}
                        isDark={isDarkMode}
                      />
                      <ComboBox
                        className={fieldBase}
                        placeholder="Operación / Servicio"
                        value={op.nombre_operacion || ''}
                        onChange={v => updateOp(opKey, 'nombre_operacion', v)}
                        options={opCatalog}
                        isDark={isDarkMode}
                        onCreate={v => setOpCatalog(prev => [...prev, v])}
                      />
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 min-w-[90px]">
                      <select
                        className={`${fieldBase} text-[9px] py-1.5 cursor-pointer`}
                        value={op.estado || 'pending'}
                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                        onChange={e => updateOp(opKey, 'estado', e.target.value)}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="in_progress">En Proceso</option>
                        <option value="completed">Completada</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min="0" step="0.1" placeholder="0"
                          title="Tiempo estimado en horas"
                          className={`w-[58px] ${fieldBase} text-[11px] text-amber-400 py-1.5 text-center`}
                          value={op.tiempo_estimado ?? ''}
                          onChange={e => updateOp(opKey, 'tiempo_estimado', Number(e.target.value))}
                        />
                        <span className="text-[8px] font-black text-slate-600 shrink-0">h</span>
                        {op.tiempo_real_acumulado > 0 && (
                          <span className={`text-[8px] font-bold shrink-0 ${op.tiempo_real_acumulado > (op.tiempo_estimado || 0) ? 'text-red-400' : 'text-emerald-400'}`}>
                            · {op.tiempo_real_acumulado.toFixed(1)}h real
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteOp(opKey)}
                      className="p-1.5 text-slate-600 hover:text-red-400 transition-all shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {/* Cost sub-row */}
                  <div className={`flex items-center gap-2 px-4 pb-2.5 pt-1.5 border-t ${isDarkMode ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                    <DollarSign size={10} className="text-slate-600 shrink-0" />
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest shrink-0">Costo/h:</span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-emerald-600 pointer-events-none leading-none">$</span>
                      <input type="number" min="0" step="10" placeholder="MXN" title="Costo por hora en MXN"
                        className={`w-[90px] pl-5 ${fieldBase} text-[11px] text-emerald-400 py-1.5`}
                        value={op.costo_hora_mxn || ''}
                        onChange={e => updateOp(opKey, 'costo_hora_mxn', Number(e.target.value))}
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-blue-500 pointer-events-none leading-none">$</span>
                      <input type="number" min="0" step="1" placeholder="USD" title="Costo por hora en USD"
                        className={`w-[85px] pl-5 ${fieldBase} text-[11px] text-blue-400 py-1.5`}
                        value={op.costo_hora_usd || ''}
                        onChange={e => updateOp(opKey, 'costo_hora_usd', Number(e.target.value))}
                      />
                    </div>
                    {((op.costo_hora_mxn || 0) > 0 || (op.costo_hora_usd || 0) > 0) && (
                      <span className="text-[9px] text-slate-500 font-black ml-1">
                        → {(op.tiempo_estimado || 0).toFixed(1)} h
                        {(op.costo_hora_mxn || 0) > 0 && ` = $${((op.tiempo_estimado || 0) * (op.costo_hora_mxn || 0)).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN`}
                        {(op.costo_hora_usd || 0) > 0 && ` · $${((op.tiempo_estimado || 0) * (op.costo_hora_usd || 0)).toFixed(0)} USD`}
                      </span>
                    )}
                  </div>
                </div>
                );
              })}

              <button onClick={addOp}
                className={`w-full py-3.5 border border-dashed rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  isDarkMode
                    ? 'border-white/10 text-slate-500 hover:text-white hover:border-white/25 hover:bg-white/5'
                    : 'border-slate-300 text-slate-400 hover:text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <Plus size={13} /> Agregar Operación
              </button>
            </div>

          ) : tab === 'materiales' ? (
            <div className="p-7 space-y-4">

              {/* Header bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <Box size={12} className="text-blue-400" />
                  {materiales.length} {materiales.length === 1 ? 'Material' : 'Materiales'}
                  {materiales.some(m => !m.id) && (
                    <span className="px-2 py-0.5 bg-violet-500/15 border border-violet-500/25 rounded-full text-[8px] text-violet-400">
                      {materiales.filter(m => !m.id).length} sin guardar
                    </span>
                  )}
                </div>
                <button
                  onClick={handleAiEstimarCostosMateriales}
                  disabled={aiMatCostLoading || materiales.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-40 shadow-lg shadow-emerald-600/20"
                >
                  {aiMatCostLoading ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />}
                  IA Estimar Costos
                </button>
              </div>

              {/* Resumen + Marcar Todo */}
              {materiales.length > 0 && (() => {
                const totalMxn     = materiales.reduce((s, m) => s + ((m.costo_unitario_mxn || 0) * (m.cantidad || 1)), 0);
                const totalUsd     = materiales.reduce((s, m) => s + ((m.costo_unitario_usd || 0) * (m.cantidad || 1)), 0);
                const nRecogidas   = materiales.filter(m => m.es_recogida).length;
                const allRecogida  = materiales.every(m => m.es_recogida);
                return (
                  <div className="space-y-2">
                    <div className={`grid grid-cols-4 gap-3 p-4 rounded-xl border ${isDarkMode ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Materiales</p>
                        <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{materiales.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Warehouse size={9}/> Recogidas</p>
                        <p className={`text-xl font-black ${nRecogidas > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{nRecogidas}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total MXN</p>
                        <p className="text-xl font-black text-emerald-400">
                          ${totalMxn > 0 ? totalMxn.toLocaleString('es-MX', { maximumFractionDigits: 0 }) : '—'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total USD</p>
                        <p className="text-xl font-black text-blue-400">
                          ${totalUsd > 0 ? totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={toggleTodoRecogida}
                      className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${
                        allRecogida
                          ? 'bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20'
                          : isDarkMode
                            ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                            : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Warehouse size={11} />
                      {allRecogida ? 'Desmarcar todas las recogidas' : 'Marcar todo como recogida'}
                    </button>
                  </div>
                );
              })()}

              {materiales.length === 0 && (
                <div className={`py-12 flex flex-col items-center gap-3 rounded-xl border border-dashed ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                  <Box size={32} className="text-slate-600" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sin materiales — agrega el primero</p>
                </div>
              )}

              {materiales.map((mat) => {
                const matKey   = mat.id || mat._key;
                const isLocal  = !mat.id;
                const esRecog  = !!mat.es_recogida;
                return (
                <div key={matKey} className={`border rounded-xl overflow-hidden transition-all ${
                  isLocal  ? `${isDarkMode ? 'bg-violet-950/20 border-violet-500/30' : 'bg-violet-50 border-violet-300'}` :
                  esRecog  ? `${isDarkMode ? 'bg-amber-950/15 border-amber-500/25'   : 'bg-amber-50 border-amber-300'}` :
                             `${isDarkMode ? 'bg-white/[0.03] border-white/8'         : 'bg-slate-50 border-slate-200'}`
                }`}>

                  {/* ── Cabecera: badge IA + toggle recogida ── */}
                  <div className="flex items-center justify-between px-3 pt-2 pb-1">
                    <div className="flex items-center gap-1.5">
                      {isLocal && (<>
                        <Sparkles size={9} className="text-violet-400" />
                        <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest">Sugerido por IA</span>
                      </>)}
                    </div>
                    <button
                      onClick={() => updateMat(matKey, 'es_recogida', !esRecog)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                        esRecog
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          : isDarkMode
                            ? 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                            : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {/* pill toggle */}
                      <div className={`w-6 h-3 rounded-full relative transition-all ${esRecog ? 'bg-amber-500' : 'bg-slate-600'}`}>
                        <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all duration-200 ${esRecog ? 'left-3.5' : 'left-0.5'}`} />
                      </div>
                      {esRecog ? 'Recogida' : 'Directo'}
                    </button>
                  </div>

                  {/* ── Fila 1: descripcion + cantidad + unidad + eliminar ── */}
                  <div className="flex items-center gap-2 px-3 pb-2">
                    <Box size={12} className="text-slate-500 shrink-0" />
                    <div className="flex-1">
                      <ComboBox
                        className={`w-full ${fieldBase}`}
                        placeholder="Descripción del material"
                        value={mat.descripcion || ''}
                        onChange={v => updateMat(matKey, 'descripcion', v)}
                        options={matDescCatalog}
                        isDark={isDarkMode}
                      />
                    </div>
                    <input
                      type="number" min="0" step="0.1" placeholder="Cant."
                      className={`w-[70px] ${fieldBase} text-center`}
                      value={mat.cantidad ?? 1}
                      onChange={e => updateMat(matKey, 'cantidad', Number(e.target.value))}
                    />
                    <select
                      className={`w-[70px] ${fieldBase} cursor-pointer`}
                      value={mat.unidad || 'pza'}
                      style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                      onChange={e => updateMat(matKey, 'unidad', e.target.value)}
                    >
                      <option>pza</option><option>kg</option><option>m</option>
                      <option>m2</option><option>lt</option><option>ft</option><option>lote</option>
                    </select>
                    <button onClick={() => deleteMat(matKey)} className="p-1.5 text-slate-600 hover:text-red-400 transition-all shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* ── Fila 2: clave + ubicacion + clave_requerimiento ── */}
                  <div className={`flex items-center gap-2 px-3 pb-2 pt-1 border-t ${isDarkMode ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                    <div className="flex-1">
                      <ComboBox
                        className={`w-full ${fieldBase} text-[11px]`}
                        placeholder="Clave / Material (ACERO, PL-1/4...)"
                        value={mat.clave || ''}
                        onChange={v => updateMat(matKey, 'clave', v.toUpperCase())}
                        options={matClaveCatalog}
                        isDark={isDarkMode}
                      />
                    </div>
                    <div className="relative shrink-0">
                      <MapPin size={9} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
                      <input
                        className={`w-[130px] pl-6 ${fieldBase} text-[11px] ${isDarkMode ? 'border-amber-500/20 focus:border-amber-500/50' : 'border-amber-300'}`}
                        placeholder="Ubicación (A2-B)"
                        value={mat.ubicacion || ''}
                        onChange={e => updateMat(matKey, 'ubicacion', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="relative shrink-0">
                      <Tag size={9} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                      <input
                        className={`w-[120px] pl-6 ${fieldBase} text-[11px] ${isDarkMode ? 'border-blue-500/20 focus:border-blue-500/50' : 'border-blue-300'}`}
                        placeholder="REQ-XXX"
                        value={mat.clave_requerimiento || ''}
                        onChange={e => updateMat(matKey, 'clave_requerimiento', e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  {/* ── Fila 3: costos ── */}
                  <div className={`flex items-center gap-2 px-3 pb-2.5 pt-1 border-t ${isDarkMode ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                    <DollarSign size={10} className="text-slate-600 shrink-0" />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-emerald-600 pointer-events-none leading-none">$</span>
                      <input type="number" min="0" step="1" placeholder="c/u MXN" title="Costo unitario en MXN"
                        className={`w-[100px] pl-5 ${fieldBase} text-[11px] text-emerald-400 py-1.5`}
                        value={mat.costo_unitario_mxn || ''}
                        onChange={e => updateMat(matKey, 'costo_unitario_mxn', Number(e.target.value))} />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-blue-500 pointer-events-none leading-none">$</span>
                      <input type="number" min="0" step="0.01" placeholder="c/u USD" title="Costo unitario en USD"
                        className={`w-[90px] pl-5 ${fieldBase} text-[11px] text-blue-400 py-1.5`}
                        value={mat.costo_unitario_usd || ''}
                        onChange={e => updateMat(matKey, 'costo_unitario_usd', Number(e.target.value))} />
                    </div>
                    {((mat.costo_unitario_mxn || 0) > 0 || (mat.costo_unitario_usd || 0) > 0) && (
                      <span className="text-[9px] text-slate-500 font-black shrink-0">
                        = {(mat.costo_unitario_mxn || 0) > 0 ? `$${((mat.cantidad || 1) * mat.costo_unitario_mxn).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN` : ''}
                        {(mat.costo_unitario_usd || 0) > 0 ? ` · $${((mat.cantidad || 1) * mat.costo_unitario_usd).toFixed(2)} USD` : ''}
                      </span>
                    )}
                  </div>
                </div>
                );
              })}

              <button onClick={addMat}
                className={`w-full py-3.5 border border-dashed rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  isDarkMode
                    ? 'border-white/10 text-slate-500 hover:text-white hover:border-white/25 hover:bg-white/5'
                    : 'border-slate-300 text-slate-400 hover:text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <Plus size={13} /> Agregar Material
              </button>
            </div>

          ) : tab === 'comentarios' ? (
            <div className="p-7 flex flex-col min-h-[320px]">
              <div className="flex-1 space-y-3 overflow-y-auto mb-4 pr-1 custom-scrollbar">
                {comentarios.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-3 text-slate-600">
                    <MessageSquare size={36} className="text-slate-700" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Sin notas todavía</p>
                    <p className="text-[9px] text-slate-600 font-bold">Agrega el primer comentario o nota de turno</p>
                  </div>
                ) : (
                  comentarios.map(c => (
                    <div key={c.id || c._key} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <User size={12} className="text-blue-400" />
                      </div>
                      <div className={`flex-1 rounded-xl px-4 py-3 space-y-1 border ${isDarkMode ? 'bg-white/[0.04] border-white/8' : 'bg-slate-50 border-slate-200'} ${!c.id ? (isDarkMode ? '!border-amber-500/25' : '!border-amber-400/40') : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                              {c.autor || 'Usuario'}
                            </span>
                            {!c.id && (
                              <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">
                                pendiente
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-500 font-bold">
                            {new Date(c.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-[12px] font-medium leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {c.contenido}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={comentariosEndRef} />
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/5 shrink-0">
                <textarea
                  value={nuevoComentario}
                  onChange={e => setNuevoComentario(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviarComentario(); } }}
                  placeholder={viajeroId ? 'Escribe una nota de turno... (Enter para enviar)' : 'Escribe una nota... se guardará con el viajero (Enter para agregar)'}
                  rows={2}
                  className={`flex-1 rounded-xl px-4 py-3 text-[12px] font-medium outline-none transition-all resize-none ${
                    isDarkMode
                      ? 'bg-white/[0.06] border border-white/15 text-white focus:border-blue-500/60 placeholder:text-slate-600'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500 placeholder:text-slate-400'
                  }`}
                />
                <button
                  onClick={handleEnviarComentario}
                  disabled={!nuevoComentario.trim() || sendingComment}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shrink-0 self-end"
                >
                  <Send size={13} className={sendingComment ? 'animate-pulse' : ''} />
                </button>
              </div>
            </div>

          ) : tab === 'ia_visual' ? (
            <div className="p-7 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Motor de IA Visual</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">GENERACIÓN DE PROMPTS INDUSTRIALES PARA REFERENCIAS VISUALES</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Motor Listo</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Editor */}
                <div className="space-y-4">
                  <div className={`p-5 rounded-2xl space-y-4 ${isDarkMode ? 'bg-indigo-500/5 border border-indigo-500/15' : 'bg-indigo-50 border border-indigo-100'}`}>
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles size={14} /> Visual AI Prompt
                    </label>
                    <textarea
                      value={form.image_prompt || ''}
                      onChange={e => setForm(f => ({ ...f, image_prompt: e.target.value }))}
                      placeholder="Describe el ensamble técnico para generar una referencia visual HD..."
                      rows={6}
                      className={`w-full rounded-xl px-4 py-3 text-[11px] outline-none transition-all resize-none custom-scrollbar font-mono leading-relaxed ${
                        isDarkMode
                          ? 'bg-black/50 border border-white/8 text-white focus:border-indigo-500/50 placeholder:text-slate-600'
                          : 'bg-white border border-indigo-200 text-slate-900 focus:border-indigo-400 placeholder:text-slate-400'
                      }`}
                    />
                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadPhoto}
                        className="hidden"
                      />
                      <button
                        onClick={generateIndustrialImage}
                        disabled={imageGenerating || !form.image_prompt}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                      >
                        {imageGenerating ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                        {imageGenerating ? 'Generando...' : 'Generar Visualización Técnica'}
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Upload size={15} />
                        Subir Foto Real
                      </button>
                      <button
                        onClick={() => {
                          const matPrincipal = materiales[0]?.clave || '';
                          const espesor = materiales[0]?.espesor || '';
                          const desc = form.descripcion || form.numero_parte || form.id;
                          setForm(f => ({
                            ...f,
                            image_prompt: `Highly detailed industrial technical render of ${desc}${matPrincipal ? ', ' + matPrincipal + ' material' : ''}${espesor ? ', ' + espesor + ' thick' : ''}, heavy metal texture, welding marks, isometric view, photorealistic, 8k, cinematic lighting, factory blueprint background, mechanical engineering style, professional photography --v 6.0`,
                          }));
                        }}
                        className={`w-full py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all flex items-center justify-center gap-2 ${
                          isDarkMode ? 'bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200'
                        }`}
                      >
                        <Zap size={13} /> Generar Prompt desde datos del viajero
                      </button>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => form.image_url ? window.open(form.image_url, '_blank') : form.image_prompt && window.open(`https://www.google.com/search?q=${encodeURIComponent(form.image_prompt)}&tbm=isch`, '_blank')}
                          className="py-2.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-purple-500/15 transition-all flex items-center justify-center gap-1">
                          <ExternalLink size={12} /> Ver
                        </button>
                        <button onClick={() => form.image_prompt && navigator.clipboard.writeText(form.image_prompt)}
                          className="py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-blue-500/15 transition-all flex items-center justify-center gap-1">
                          <Copy size={12} /> Copiar
                        </button>
                        <button onClick={() => { setForm(f => ({ ...f, image_prompt: '', image_url: '' })); setIsUploadedImage(false); }}
                          className={`py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all flex items-center justify-center gap-1 ${isDarkMode ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 border-white/5' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'}`}>
                          <RefreshCw size={12} /> Reset
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl flex items-start gap-2.5 ${isDarkMode ? 'bg-blue-500/5 border border-blue-500/10' : 'bg-blue-50 border border-blue-100'}`}>
                    <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[9px] text-slate-400 leading-relaxed font-bold uppercase tracking-wider">
                      Este prompt genera la miniatura visual en la portada del viajero impreso.
                    </p>
                  </div>
                </div>

                {/* Preview */}
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] opacity-20 pointer-events-none rounded-3xl" />
                  <div className={`relative min-h-[340px] border rounded-2xl flex flex-col items-center justify-center p-6 overflow-hidden ${isDarkMode ? 'border-white/10 bg-slate-900/40 backdrop-blur-sm' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="absolute top-3 left-4 flex items-center gap-2">
                      <Camera size={12} className="text-indigo-400" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Preview</span>
                    </div>
                    {form.image_url ? (
                      <>
                        {imageGenerating && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl z-10 gap-3">
                            <Loader2 size={32} className="animate-spin text-indigo-400" />
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Cargando imagen...</p>
                          </div>
                        )}
                        <img
                          src={form.image_url}
                          alt={isUploadedImage ? "Foto real subida" : "Visualización Técnica"}
                          className="max-w-full max-h-[280px] object-contain rounded-xl shadow-2xl border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        {isUploadedImage && (
                          <div className="absolute top-3 left-4 flex items-center gap-1.5 px-2 py-1 bg-emerald-600/80 backdrop-blur-sm rounded-full border border-emerald-400/30">
                            <Image size={10} className="text-white" />
                            <span className="text-[7px] font-black text-white uppercase tracking-widest">Foto Real</span>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setForm(f => ({ ...f, image_url: '' }));
                            setIsUploadedImage(false);
                            toast('Imagen eliminada de la vista previa.', 'success');
                          }}
                          className="absolute top-3 right-4 p-2 rounded-xl bg-red-600/80 hover:bg-red-500 text-white transition-all shadow-lg border border-red-500/20 cursor-pointer"
                          title="Eliminar imagen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : imageGenerating ? (
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto animate-pulse">
                          <Sparkles size={36} className="text-indigo-400" />
                        </div>
                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Generando imagen — 15-30s...</p>
                      </div>
                    ) : form.image_prompt ? (
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                          <Sparkles size={28} className="text-indigo-400" />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prompt listo — presiona Generar</p>
                      </div>
                    ) : (
                      <div className="text-center space-y-3 opacity-50">
                        <Camera size={32} className="text-slate-600 mx-auto" />
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Esperando prompt...</p>
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4 flex gap-1.5">
                      <div className="px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-full border border-white/5 text-[7px] font-black text-blue-400">RTX ON</div>
                      <div className="px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-full border border-white/5 text-[7px] font-black text-purple-400">PBR</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Footer ── */}
        <div className={`flex flex-col gap-2 px-7 py-4 border-t ${isDarkMode ? 'border-white/8 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/60'} shrink-0`}>
          {saveError && (
            <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl">
              <AlertTriangle size={13} className="text-rose-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Error al guardar</p>
                <p className="text-[10px] text-rose-300 font-medium break-all">{saveError}</p>
              </div>
              <button onClick={() => setSaveError(null)} className="text-rose-500 hover:text-rose-300 shrink-0"><X size={12} /></button>
            </div>
          )}
          <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              isDarkMode ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-800'
            }`}
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
          >
            <Save size={14} className={saving ? 'animate-spin' : ''} />
            {saving ? 'Guardando...' : viajeroId ? 'Guardar Cambios' : 'Crear Viajero'}
          </button>
          </div>
        </div>
    </div>

      {isOCModalOpen && (
        <OCManagerModal
          isOpen={isOCModalOpen}
          onClose={() => {
            setIsOCModalOpen(false);
            (async () => {
              const { data } = await supabase.from('ordenes_compra_cliente').select('*').order('created_at', { ascending: false });
              if (data) {
                const ocsArray = data.map(o => o.numero_oc).filter(Boolean);
                setOcCatalog([...new Set(ocsArray)] as string[]);
                setFullOcCatalog(data || []);
              }
            })();
          }}
        />
      )}
      {qrViajero && (
        <ViajeroQRModal viajero={qrViajero} onClose={() => setQrViajero(null)} />
      )}
    {showScanModal && (
      <ViajeroScanModal
        onClose={() => setShowScanModal(false)}
        onFill={handleScanFill}
      />
    )}
    </>
  );
};
