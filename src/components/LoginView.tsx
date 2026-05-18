import { Shield, Lock, User, Zap, Eye, EyeOff, Activity } from 'lucide-react';
import { Toast } from './common/Toast';
import { useConfig } from '../contexts/ConfigContext';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

interface LoginViewProps {
  onLogin: (role: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);
  const { config } = useConfig();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Bypass solo en desarrollo local — no llega al bundle de producción
      if (import.meta.env.DEV) {
        if ((username.trim() === 'agus' || username.trim() === 'agus@mcvill.com') && password === 'godmode22') {
          setNotification({ message: 'Acceso total habilitado', type: 'success' });
          setTimeout(() => { setLoading(false); onLogin('admin'); }, 1000);
          return;
        }
        if (username.trim() === 'demo' && password === 'demo123') {
          setNotification({ message: 'Acceso demo autorizado', type: 'success' });
          setTimeout(() => { setLoading(false); onLogin('gerencia'); }, 1000);
          return;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: username.trim(),
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        const role = data.user.user_metadata?.role || 'empleado';
        setNotification({ message: 'Acceso verificado correctamente', type: 'success' });
        setTimeout(() => onLogin(role), 1000);
      }
    } catch {
      setNotification({
        message: 'Credenciales incorrectas. Verifica tu email y contraseña.',
        type: 'error'
      });
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    setNotification({ message: 'Solicita acceso demo al administrador del sistema.', type: 'info' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden font-sans">
      {/* Cinematic Industrial Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-slow-zoom"
        style={{ backgroundImage: `url("${config.loginBackground}")` }}
      />
      
      {/* Overlays */}
      <div className="absolute inset-0 bg-mcvill-bg/40" />
      <div className="absolute inset-0 scanline opacity-10 pointer-events-none" />
      
      {/* Floating Ambient Glows - Blue */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-mcvill-accent/10 blur-[80px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-mcvill-accent/5 blur-[80px] rounded-full animate-pulse delay-1000" />

      {/* Login Card - Scaled to match Acelerador */}
      <div className="relative z-10 w-full max-w-[440px] px-5">
        <div className="glass-premium !rounded-2xl p-5 border-mcvill-accent/20 relative overflow-hidden group">
          
          {/* Internal Scanline for the card */}
          <div className="absolute inset-0 scanline opacity-[0.03] pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-mcvill-accent/20 blur-2xl rounded-full scale-150 animate-pulse" />
              <div className="relative w-16 h-16 bg-slate-950 border border-mcvill-accent/30 rounded-2xl flex items-center justify-center overflow-hidden shadow-xl group-hover:border-mcvill-accent/60 transition-all duration-700">
                <img 
                  src={config.logo} 
                  alt={`${config.brandName} Logo`} 
                  className="w-12 h-12 object-contain mix-blend-screen filter drop-shadow-[0_0_15px_rgba(var(--mcvill-accent-rgb),0.8)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black text-mcvill-text tracking-tighter uppercase">
                {config.systemName}
              </h1>
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-8 bg-mcvill-accent/20" />
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">
                  {config.brandName}
                </p>
                <div className="h-px w-8 bg-mcvill-accent/20" />
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Email</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-mcvill-accent transition-colors">
                  <User size={14} />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="cyber-input w-full pl-10 h-14 text-sm"
                  placeholder="usuario@empresa.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Clave</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-mcvill-accent transition-colors">
                  <Lock size={14} />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cyber-input w-full pl-10 pr-10 h-14 text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-mcvill-accent transition-all"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer group/check">
                <div className="relative">
                  <input 
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-4 h-4 border border-mcvill-card-border rounded-md bg-slate-950 transition-all duration-300 peer-checked:bg-mcvill-accent peer-checked:border-mcvill-accent group-hover/check:border-mcvill-accent/50 shadow-inner" />
                  <div className="absolute inset-0 flex items-center justify-center text-slate-950 scale-0 peer-checked:scale-100 transition-transform duration-300">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </div>
                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest group-hover/check:text-slate-300 transition-colors">Sesión</span>
              </label>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="mcvill-btn mcvill-btn-primary w-full h-14 text-[11px] !rounded-2xl"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" role="status" aria-label="Cargando" />
                  <span className="font-bold uppercase tracking-[0.15em]">Verificando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-slate-950" />
                  <span className="font-bold uppercase tracking-[0.15em]">Iniciar</span>
                </div>
              )}
            </button>
          </form>

          {/* Footer Decorations */}
          <div className="mt-5 pt-4 border-t border-mcvill-card-border/20 flex flex-col items-center gap-3">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                <span className="text-[6px] font-bold text-slate-600 uppercase tracking-widest">Neural Activo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield size={8} className="text-mcvill-accent/60" />
                <span className="text-[6px] font-bold text-slate-600 uppercase tracking-widest">AES-256</span>
              </div>
            </div>

            <button 
              onClick={handleDemoAccess}
              className="text-[7px] font-bold text-slate-700 hover:text-mcvill-accent uppercase tracking-[0.3em] transition-all flex items-center gap-1.5 group/demo"
            >
              <Activity size={10} className="group-hover/demo:text-mcvill-accent transition-colors" />
              Acceso Demo
            </button>

            <a
              href={config.developerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-[8px] text-slate-600 uppercase tracking-[0.4em] font-black opacity-40 hover:opacity-100 hover:text-mcvill-accent transition-all cursor-pointer"
            >
              {`Diseñado por ${config.developerName}`}
            </a>
          </div>
        </div>
      </div>

      {/* Version tag */}
      <div className="absolute bottom-5 right-6 flex flex-col items-end gap-0.5 opacity-20">
        <p className="text-[8px] font-bold text-white uppercase tracking-[0.4em]">V2.5.1</p>
        <div className="h-px w-16 bg-gradient-to-l from-white to-transparent" />
      </div>

      {notification && (
        <Toast 
          message={notification.message}
          type={notification.type}
          isVisible={!!notification}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};
