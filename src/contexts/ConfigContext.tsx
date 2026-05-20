import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type ThemeName = 'blue' | 'slate' | 'emerald' | 'carbon';

interface BrandConfig {
  brandName: string;
  systemName: string;
  companyName: string;
  companyCity: string;
  developerName: string;
  developerUrl: string;
  slogan: string;
  logoText: string;
  version: string;
  neuralQueryPlaceholder: string;
  supportEmail: string;
  selectedApi: string;
  software_accelerator_url?: string;
  logo?: string;
  logoDark?: string;
  logoIcon?: string;
  favicon?: string;
  quotationLogo?: string;
  loginBackground?: string;
  themeColor?: string;
  themeColorLight?: string;
  themeName?: ThemeName;
  salarioBaseDefault?: number;
  productividadPctAlto?: number;
  productividadPctBajo?: number;
  calidadPct?: number;
  seguridadPct?: number;
  fiveSPct?: number;
  industryType?: 'metal_mechanical' | 'automotive' | 'aerospace' | 'textile' | 'pharmaceutical' | 'electronic' | 'mining';
  cctvYoutubeUrl?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  tiktokUrl?: string;
  plantaPhotos?: string[];
  overtimeCutoffStartDay?: string;
  overtimeCutoffEndDay?: string;
  overtimePaymentDay?: string;
  overtimeStrictAccess?: boolean;
  overtimeServicesLimitTime?: string;
  overtimeRequiredAuthorizers?: string[];
  aiAssistantName?: string;
}

interface ConfigContextType {
  config: BrandConfig;
  tenantId: string | null;
  isLoading: boolean;
  isDarkMode: boolean;
  updateConfig: (newConfig: Partial<BrandConfig>) => void;
  setSelectedApi: (apiId: string) => void;
  toggleTheme: () => void;
  setThemeName: (name: ThemeName) => void;
}

const defaultConfig: BrandConfig = {
  brandName: 'MCVILL',
  systemName: 'ERP',
  companyName: 'McVill S.A. de C.V.',
  companyCity: 'Torreón, Coah., México',
  developerName: 'IA.AGUS',
  developerUrl: 'https://ia-agus.com',
  slogan: 'Lo más valioso en McVill es nuestra gente',
  logoText: 'MCVILL ERP',
  version: 'SYSTEM OS v2.5',
  neuralQueryPlaceholder: 'CONSULTAR RED NEURAL (ÓRDENES, ACTIVOS, COSTOS)...',
  supportEmail: 'soporte@mcvill.mx',
  selectedApi: 'gemini-2.5-flash-lite',
  software_accelerator_url: 'https://mcvill-acelerador.vercel.app',
  logo: '/mcvill-mcv.png',
  logoDark: '/mcvill-mcv.png',
  logoIcon: '/mcvill-logo-cyber.png',
  favicon: '/favicon.png',
  loginBackground: '/login-bg.png',
  themeColor: '#3B82F6',
  themeColorLight: '#1D4ED8',
  themeName: 'blue' as ThemeName,
  salarioBaseDefault: 4500,
  productividadPctAlto: 10,
  productividadPctBajo: 5,
  calidadPct: 3,
  seguridadPct: 2,
  fiveSPct: 1,
  industryType: 'metal_mechanical',
  cctvYoutubeUrl: 'https://www.youtube.com/embed/wxx7A63LpSo',
  websiteUrl: 'https://www.mcvill.com',
  facebookUrl: 'https://www.facebook.com/McVill.Trc',
  linkedinUrl: 'https://www.linkedin.com/company/mcvill',
  tiktokUrl: 'https://www.tiktok.com/@mcvil.trc',
  plantaPhotos: [],
  overtimeCutoffStartDay: 'martes',
  overtimeCutoffEndDay: 'lunes',
  overtimePaymentDay: 'viernes',
  overtimeStrictAccess: true,
  overtimeServicesLimitTime: '14:00',
  overtimeRequiredAuthorizers: ['supervisor', 'gerencia', 'operaciones', 'rh', 'administracion'],
  aiAssistantName: 'Mac',
};

const THEME_PALETTES: Record<ThemeName, {
  dark:  { accent: string; bg: string; border: string; glow: string; shadow: string; shadowLg: string };
  light: { accent: string; bg: string; border: string; glow: string; shadow: string; shadowLg: string };
}> = {
  blue: {
    dark:  { accent: '#4FA5FF', bg: '#020617', border: 'rgba(79,165,255,0.2)',   glow: 'rgba(79,165,255,0.5)',  shadow: '0 0 20px rgba(79,165,255,0.1)',   shadowLg: '0 0 40px rgba(79,165,255,0.2)'  },
    light: { accent: '#1D4ED8', bg: '#F0F4F8', border: '#BFDBFE',                glow: 'rgba(29,78,216,0.12)',  shadow: '0 1px 4px rgba(15,23,42,0.10), 0 4px 16px rgba(15,23,42,0.06)', shadowLg: '0 4px 16px rgba(15,23,42,0.12), 0 12px 32px rgba(15,23,42,0.08)' },
  },
  slate: {
    dark:  { accent: '#94A3B8', bg: '#0F172A', border: 'rgba(148,163,184,0.2)',  glow: 'rgba(148,163,184,0.4)', shadow: '0 0 20px rgba(148,163,184,0.08)', shadowLg: '0 0 40px rgba(148,163,184,0.15)' },
    light: { accent: '#475569', bg: '#F8FAFC', border: '#CBD5E1',                glow: 'rgba(71,85,105,0.12)',  shadow: '0 1px 4px rgba(15,23,42,0.10), 0 4px 16px rgba(15,23,42,0.06)', shadowLg: '0 4px 16px rgba(15,23,42,0.12), 0 12px 32px rgba(15,23,42,0.08)' },
  },
  emerald: {
    dark:  { accent: '#34D399', bg: '#020617', border: 'rgba(52,211,153,0.2)',   glow: 'rgba(52,211,153,0.5)',  shadow: '0 0 20px rgba(52,211,153,0.1)',   shadowLg: '0 0 40px rgba(52,211,153,0.2)'  },
    light: { accent: '#059669', bg: '#F0FDF9', border: '#A7F3D0',                glow: 'rgba(5,150,105,0.12)',  shadow: '0 1px 4px rgba(15,23,42,0.10), 0 4px 16px rgba(15,23,42,0.06)', shadowLg: '0 4px 16px rgba(15,23,42,0.12), 0 12px 32px rgba(15,23,42,0.08)' },
  },
  carbon: {
    dark:  { accent: '#FF6B00', bg: '#0A0A0A', border: 'rgba(255,107,0,0.25)',   glow: 'rgba(255,107,0,0.5)',   shadow: '0 0 20px rgba(255,107,0,0.12)',   shadowLg: '0 0 40px rgba(255,107,0,0.22)'  },
    light: { accent: '#C2410C', bg: '#FAFAF9', border: '#FED7AA',                glow: 'rgba(194,65,12,0.12)',  shadow: '0 1px 4px rgba(15,23,42,0.10), 0 4px 16px rgba(15,23,42,0.06)', shadowLg: '0 4px 16px rgba(15,23,42,0.12), 0 12px 32px rgba(15,23,42,0.08)' },
  },
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<BrandConfig>(defaultConfig);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode for "Agus Pro" aesthetic

  useEffect(() => {
    const faviconUrl = config.favicon || config.logoIcon || config.logo;
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [config.favicon, config.logoIcon, config.logo]);

  useEffect(() => {
    const palette = THEME_PALETTES[config.themeName ?? 'blue'];
    const mode = isDarkMode ? palette.dark : palette.light;

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    document.documentElement.setAttribute('data-theme', config.themeName ?? 'blue');
    document.documentElement.style.setProperty('--theme-bg', mode.bg);
    document.documentElement.style.setProperty('--theme-accent', mode.accent);
    document.documentElement.style.setProperty('--theme-card-border', mode.border);
    document.documentElement.style.setProperty('--theme-glow', mode.glow);
    document.documentElement.style.setProperty('--theme-shadow', mode.shadow);
    document.documentElement.style.setProperty('--theme-shadow-lg', mode.shadowLg);
  }, [isDarkMode, config.themeName]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // Step 1: Check Local Storage first
        const savedConfig = localStorage.getItem('mcvill-config');
        if (savedConfig) {
          setConfig(prev => ({ ...prev, ...JSON.parse(savedConfig) }));
        }

        const savedTheme = localStorage.getItem('mcvill-theme');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        }

        const savedThemeName = localStorage.getItem('mcvill-theme-name') as ThemeName | null;
        if (savedThemeName && ['blue', 'slate', 'emerald', 'carbon'].includes(savedThemeName)) {
          setConfig(prev => ({ ...prev, themeName: savedThemeName }));
        }

        // Step 2: Get authenticated user's tenant_id
        const { data: { user } } = await supabase.auth.getUser();
        let currentTenantId = 'mcvill'; // Default fallback

        if (user) {
          try {
            let { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            
            if (!profile) {
              console.warn('Self-healing profiles: Profile missing in public.profiles. Attempting automatic creation...');
              const rawRole = user.user_metadata?.role || user.email?.split('@')[0] || 'sistemas';
              const validRoles = ['ceo', 'gerente', 'rh', 'sistemas', 'contabilidad', 'supervisor', 'ingenieria', 'calidad', 'operaciones'];
              const resolvedRole = validRoles.includes(rawRole.toLowerCase()) ? rawRole.toLowerCase() : 'sistemas';

              const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: user.id,
                  tenant_id: 'c89d6183-5f66-48dd-8b66-2b8b6b993e61', // Tenant principal de McVill
                  full_name: user.user_metadata?.full_name || 'Admin Sistemas',
                  email: user.email,
                  role: resolvedRole
                })
                .select()
                .maybeSingle();

              if (!insertError && newProfile) {
                profile = newProfile;
                console.log('Self-healing profiles: Profile created successfully:', newProfile);
              } else {
                console.error('Self-healing profiles: Error creating profile:', insertError);
              }
            }

            if (profile?.tenant_id) {
              currentTenantId = profile.tenant_id;
            }
          } catch (err) {
            console.error('Self-healing profiles: Fatal exception:', err);
          }
        }

        // Step 3: Fetch from Supabase (Rule 16)
        let tenantQuery = supabase.from('tenants').select('id, brand_name, system_name, slogan, selected_api, config');
        if (currentTenantId && currentTenantId.includes('-')) {
          tenantQuery = tenantQuery.eq('id', currentTenantId);
        } else {
          tenantQuery = tenantQuery.eq('slug', currentTenantId);
        }

        const { data: tenant, error } = await tenantQuery.maybeSingle();
        
        if (tenant) {
          setTenantId(tenant.id);
          localStorage.setItem('mcvill-tenant-id', tenant.id);
          const supabaseConfig = tenant.config || {};
          // Merge on top of whatever localStorage already restored (prev), not the stale closure value
          setConfig(prev => {
            const merged = {
              ...prev,
              brandName: tenant.brand_name || prev.brandName,
              systemName: tenant.system_name || prev.systemName,
              slogan: tenant.slogan || prev.slogan,
              selectedApi: tenant.selected_api || prev.selectedApi,
              themeColor: supabaseConfig.themeColor || prev.themeColor,
              themeColorLight: supabaseConfig.themeColorLight || prev.themeColorLight,
              themeName: (supabaseConfig.themeName as ThemeName) || prev.themeName,
              logo: supabaseConfig.logo_url || prev.logo,
              logoDark: supabaseConfig.logo_url || prev.logoDark,
              logoIcon: supabaseConfig.logo_icon_url || prev.logoIcon,
              favicon: supabaseConfig.favicon_url || prev.favicon,
              quotationLogo: supabaseConfig.quotation_logo_url || prev.quotationLogo,
              companyName: supabaseConfig.company_name || prev.companyName,
              companyCity: supabaseConfig.company_city || prev.companyCity,
              developerName: supabaseConfig.developer_name || prev.developerName,
              developerUrl: supabaseConfig.developer_url || prev.developerUrl,
              salarioBaseDefault: supabaseConfig.salarioBaseDefault !== undefined ? supabaseConfig.salarioBaseDefault : prev.salarioBaseDefault,
              productividadPctAlto: supabaseConfig.productividadPctAlto !== undefined ? supabaseConfig.productividadPctAlto : prev.productividadPctAlto,
              productividadPctBajo: supabaseConfig.productividadPctBajo !== undefined ? supabaseConfig.productividadPctBajo : prev.productividadPctBajo,
              calidadPct: supabaseConfig.calidadPct !== undefined ? supabaseConfig.calidadPct : prev.calidadPct,
              seguridadPct: supabaseConfig.seguridadPct !== undefined ? supabaseConfig.seguridadPct : prev.seguridadPct,
              fiveSPct: supabaseConfig.fiveSPct !== undefined ? supabaseConfig.fiveSPct : prev.fiveSPct,
              industryType: supabaseConfig.industryType !== undefined ? supabaseConfig.industryType : prev.industryType,
              cctvYoutubeUrl: supabaseConfig.cctvYoutubeUrl || prev.cctvYoutubeUrl,
              websiteUrl: supabaseConfig.websiteUrl || prev.websiteUrl,
              facebookUrl: supabaseConfig.facebookUrl || prev.facebookUrl,
              linkedinUrl: supabaseConfig.linkedinUrl || prev.linkedinUrl,
              tiktokUrl: supabaseConfig.tiktokUrl || prev.tiktokUrl,
              plantaPhotos: supabaseConfig.plantaPhotos !== undefined ? supabaseConfig.plantaPhotos : prev.plantaPhotos,
              overtimeCutoffStartDay: supabaseConfig.overtimeCutoffStartDay !== undefined ? supabaseConfig.overtimeCutoffStartDay : prev.overtimeCutoffStartDay,
              overtimeCutoffEndDay: supabaseConfig.overtimeCutoffEndDay !== undefined ? supabaseConfig.overtimeCutoffEndDay : prev.overtimeCutoffEndDay,
              overtimePaymentDay: supabaseConfig.overtimePaymentDay !== undefined ? supabaseConfig.overtimePaymentDay : prev.overtimePaymentDay,
              overtimeStrictAccess: supabaseConfig.overtimeStrictAccess !== undefined ? supabaseConfig.overtimeStrictAccess : prev.overtimeStrictAccess,
              overtimeServicesLimitTime: supabaseConfig.overtimeServicesLimitTime !== undefined ? supabaseConfig.overtimeServicesLimitTime : prev.overtimeServicesLimitTime,
              overtimeRequiredAuthorizers: supabaseConfig.overtimeRequiredAuthorizers !== undefined ? supabaseConfig.overtimeRequiredAuthorizers : prev.overtimeRequiredAuthorizers,
              aiAssistantName: supabaseConfig.ai_assistant_name || prev.aiAssistantName || 'Mac',
            };
            localStorage.setItem('mcvill-config', JSON.stringify(merged));
            return merged;
          });
        } else if (error) {
          console.warn('Supabase config fetch failed, using local/defaults:', error.message);
        }

        
      } catch (error) {
        console.error('Error loading config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const updateConfig = async (newConfig: Partial<BrandConfig>) => {
    const updated = { ...config, ...newConfig };
    
    // Optimistic update
    setConfig(updated);
    localStorage.setItem('mcvill-config', JSON.stringify(updated));

    // Persist to Supabase
    try {
      const { data: tenant } = await supabase.from('tenants').select('id, config').eq('id', tenantId ?? 'mcvill').maybeSingle();
      if (tenant) {
        const currentSupabaseConfig = tenant.config || {};
        const { error: updateErr } = await supabase
          .from('tenants')
          .update({
            brand_name: updated.brandName,
            system_name: updated.systemName,
            slogan: updated.slogan,
            selected_api: updated.selectedApi,
            config: {
              ...currentSupabaseConfig,
              themeColor: updated.themeColor,
              themeColorLight: updated.themeColorLight,
              themeName: updated.themeName,
              ...(updated.logo ? { logo_url: updated.logo } : {}),
              ...(updated.quotationLogo !== undefined ? { quotation_logo_url: updated.quotationLogo } : {}),
              company_name: updated.companyName,
              company_city: updated.companyCity,
              developer_name: updated.developerName,
              developer_url: updated.developerUrl,
              salarioBaseDefault: updated.salarioBaseDefault,
              productividadPctAlto: updated.productividadPctAlto,
              productividadPctBajo: updated.productividadPctBajo,
              calidadPct: updated.calidadPct,
              seguridadPct: updated.seguridadPct,
              fiveSPct: updated.fiveSPct,
              industryType: updated.industryType,
              cctvYoutubeUrl: updated.cctvYoutubeUrl,
              websiteUrl: updated.websiteUrl,
              facebookUrl: updated.facebookUrl,
              linkedinUrl: updated.linkedinUrl,
              tiktokUrl: updated.tiktokUrl,
              plantaPhotos: updated.plantaPhotos,
              overtimeCutoffStartDay: updated.overtimeCutoffStartDay,
              overtimeCutoffEndDay: updated.overtimeCutoffEndDay,
              overtimePaymentDay: updated.overtimePaymentDay,
              overtimeStrictAccess: updated.overtimeStrictAccess,
              overtimeServicesLimitTime: updated.overtimeServicesLimitTime,
              overtimeRequiredAuthorizers: updated.overtimeRequiredAuthorizers,
              ai_assistant_name: updated.aiAssistantName,
            }
          })
          .eq('id', tenant.id);
        if (updateErr) console.error('Error persisting config update:', updateErr.message);
      }
    } catch (error) {
      console.error('Error persisting config to Supabase:', error);
    }
  };

  const setSelectedApi = (apiId: string) => {
    updateConfig({ selectedApi: apiId });
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('mcvill-theme', newMode ? 'dark' : 'light');
  };

  const setThemeName = (name: ThemeName) => {
    localStorage.setItem('mcvill-theme-name', name);
    updateConfig({ themeName: name });
  };

  // Derived logo based on theme; quotationLogo falls back to company logo
  const currentConfig = {
    ...config,
    logo: isDarkMode ? (config.logoDark || defaultConfig.logoDark) : (config.logo || defaultConfig.logo),
    quotationLogo: config.quotationLogo || (isDarkMode ? (config.logoDark || defaultConfig.logoDark) : (config.logo || defaultConfig.logo)),
  };

  useEffect(() => {
    // Zero Hardcoding: Update browser tab title dynamically
    document.title = `ERP IA | ${currentConfig.companyName}`;
    
    // Zero Hardcoding: Update favicon dynamically
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = currentConfig.logo || '/favicon.ico';
  }, [currentConfig.brandName, currentConfig.systemName, currentConfig.logo]);

  return (
    <ConfigContext.Provider value={{
      config: currentConfig,
      tenantId,
      isLoading,
      isDarkMode,
      updateConfig,
      setSelectedApi,
      toggleTheme,
      setThemeName,
    }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
