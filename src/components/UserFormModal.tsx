import React, { useState } from 'react';
import { X, Shield, Mail, Lock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { userService } from '../services/userService';
import type { CreateUserParams } from '../services/userService';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  initialData?: any;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSuccess, tenantId, initialData }) => {
  const [formData, setFormData] = React.useState<Partial<CreateUserParams>>({
    role: 'empleado',
    tenant_id: tenantId,
    ...initialData
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ role: 'empleado', tenant_id: tenantId });
    }
  }, [initialData, tenantId]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.email || !formData.full_name || !formData.role) {
        throw new Error('Por favor completa todos los campos obligatorios.');
      }

      if (initialData?.id) {
        await userService.updateUser(initialData.id, {
          full_name: formData.full_name,
          role: formData.role as any,
          email: formData.email,
          phone: formData.phone,
          tenant_id: tenantId
        });
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
          setSuccess(false);
          setFormData({ role: 'empleado', tenant_id: tenantId });
        }, 2000);
      } else {
        const { password } = await userService.createUser({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role as any,
          phone: formData.phone,
          tenant_id: tenantId
        });
        
        setGeneratedPassword(password);
        setSuccess(true);
        // NO cerramos el modal automáticamente para que puedan copiar la contraseña
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onSuccess();
    onClose();
    setSuccess(false);
    setError(null);
    setGeneratedPassword(null);
    setFormData({ role: 'empleado', tenant_id: tenantId });
  };

  return (
    <div className="fixed inset-0 lg:left-64 top-16 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[var(--mcvill-card)] border border-mcvill-card-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-mcvill-card-border bg-[var(--mcvill-card-header)]">
          <h2 className="text-lg font-black text-[var(--mcvill-text)] flex items-center gap-2 tracking-tight uppercase">
            <Shield className="w-5 h-5 text-blue-500" />
            GESTIÓN DE USUARIOS
          </h2>
          <button onClick={handleClose} className="text-slate-500 hover:text-[var(--mcvill-text)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && generatedPassword && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-4">
              <p className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> ¡USUARIO CREADO EXITOSAMENTE!
              </p>
              <p className="text-sm text-white mb-1"><span className="text-slate-400 mr-2">Email:</span> {formData.email}</p>
              <p className="text-sm text-white"><span className="text-slate-400 mr-2">Clave Temporal:</span> <code className="bg-black/30 px-2 py-1 rounded-2xl text-emerald-300 select-all">{generatedPassword}</code></p>
              <p className="text-[10px] text-emerald-500/70 mt-3 uppercase tracking-wider">Copia y entrega estas credenciales al nuevo usuario. Podrá cambiar su clave en Configuración.</p>
            </div>
          )}

          {success && !generatedPassword && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Usuario actualizado con éxito.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nombre Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                required
                className="cyber-input w-full pl-10"
                placeholder="Ej. Juan Pérez"
                value={formData.full_name || ''}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="email" 
                required
                disabled={!!initialData}
                className="cyber-input w-full pl-10 disabled:opacity-50"
                placeholder="usuario@empresa.com"
                value={formData.email || ''}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Teléfono</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                className="cyber-input w-full pl-10"
                placeholder="+52 55..."
                value={formData.phone || ''}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Rol de Acceso</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select 
                className="cyber-select w-full pl-10 appearance-none"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as any})}
              >
                <option value="ceo">CEO / Dirección</option>
                <option value="gerencia">Gerencia General</option>
                <option value="finanzas">Finanzas y Contabilidad</option>
                <option value="rh">Recursos Humanos</option>
                <option value="operaciones">Operaciones / Logística</option>
                <option value="ventas">Ventas y Comercial</option>
                <option value="compras">Compras y Adquisiciones</option>
                <option value="almacen">Inventario y Almacén</option>
                <option value="sistemas">Sistemas / TI</option>
                <option value="ingenieria">Ingeniería / Desarrollo</option>
                <option value="calidad">Control de Calidad</option>
                <option value="auditoria">Auditoría / Compliance</option>
                <option value="soporte">Soporte al Cliente</option>
                <option value="marketing">Marketing</option>
                <option value="seguridad">Seguridad</option>
                <option value="empleado">Empleado Operativo</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading || success}
              className="mcvill-btn mcvill-btn-primary w-full h-11 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div role="status" aria-label="Cargando" className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{initialData ? 'ACTUALIZAR ACCESO' : 'CREAR ACCESO'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
