import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, Building2, User, 
  Mail, Phone, MapPin, CreditCard,
  FileText, Loader2, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../hooks/useTenant';
import { useConfig } from '../contexts/ConfigContext';

interface Cliente {
  id?: string;
  razon_social: string;
  rfc?: string;
  nombre_contacto?: string;
  email?: string;
  telefono?: string;
  ciudad?: string;
  condicion_pago?: string;
  notas?: string;
  activo?: boolean;
}

interface ClientManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newClient: any) => void;
}

const COND_PAGO_OPTS: [string, string][] = [
  ['contado','Contado'],['credito_15','Crédito 15 días'],['credito_30','Crédito 30 días'],
  ['credito_60','Crédito 60 días'],['credito_90','Crédito 90 días'],
];

const CIUDADES_MX = [
  'Monterrey','Guadalajara','Ciudad de México','Saltillo','San Luis Potosí',
  'Querétaro','Torreón','Chihuahua','Ciudad Juárez','Mexicali','Tijuana',
  'Puebla','León','Toluca','Mérida','Hermosillo',
];

export const ClientManagerModal: React.FC<ClientManagerModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const tenantId = useTenant();
  const { config } = useConfig();
  const [form, setForm] = useState<Cliente>({
    razon_social: '',
    rfc: '',
    nombre_contacto: '',
    email: '',
    telefono: '',
    ciudad: '',
    condicion_pago: 'credito_30',
    notas: '',
    activo: true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.razon_social) {
      setError('La razón social es obligatoria');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = { 
        ...form, 
        tenant_id: tenantId, 
        updated_at: new Date().toISOString() 
      };
      
      const { data, error: e } = await supabase
        .from('clientes')
        .insert(payload)
        .select()
        .single();

      if (e) throw e;
      
      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700";
  const labelCls = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 left-64 top-16 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-sm -left-64 -top-16" 
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-lg bg-[#0a0f1d] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-emerald-500/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tighter">Alta de Cliente</h2>
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Registro Express de Prospecto</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-[10px] font-bold uppercase tracking-widest">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Razón Social / Nombre *</label>
              <input 
                type="text" 
                value={form.razon_social}
                onChange={e => setForm(f => ({ ...f, razon_social: e.target.value.toUpperCase() }))}
                className={inputCls}
                placeholder={`${config.companyName.toUpperCase()}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>RFC</label>
                <input 
                  type="text" 
                  value={form.rfc || ''}
                  onChange={e => setForm(f => ({ ...f, rfc: e.target.value.toUpperCase() }))}
                  className={inputCls}
                  placeholder="XAXX010101000"
                />
              </div>
              <div>
                <label className={labelCls}>Ciudad</label>
                <select 
                  value={form.ciudad || ''}
                  onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Seleccionar...</option>
                  {CIUDADES_MX.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nombre de Contacto</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                  <input 
                    type="text" 
                    value={form.nombre_contacto || ''}
                    onChange={e => setForm(f => ({ ...f, nombre_contacto: e.target.value }))}
                    className={`${inputCls} pl-10`}
                    placeholder="Juan Pérez"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Condición de Pago</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                  <select 
                    value={form.condicion_pago || 'credito_30'}
                    onChange={e => setForm(f => ({ ...f, condicion_pago: e.target.value }))}
                    className={`${inputCls} pl-10`}
                  >
                    {COND_PAGO_OPTS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                  <input 
                    type="email" 
                    value={form.email || ''}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value.toLowerCase() }))}
                    className={`${inputCls} pl-10`}
                    placeholder="contacto@empresa.com"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                  <input 
                    type="tel" 
                    value={form.telefono || ''}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                    className={`${inputCls} pl-10`}
                    placeholder="871..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 border-t border-white/5 bg-white/[0.02] flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Registrar Cliente
          </button>
        </div>
      </motion.div>
    </div>
  );
};
