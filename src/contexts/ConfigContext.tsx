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
  loginBackground?: string;
  themeColor?: string;
  themeColorLight?: string;
  themeName?: ThemeName;
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
  slogan: 'Industrial Intelligence Ecosystem',
  logoText: 'MCVILL ERP',
  version: 'SYSTEM OS v2.5',
  neuralQueryPlaceholder: 'CONSULTAR RED NEURAL (ÓRDENES, ACTIVOS, COSTOS)...',
  supportEmail: 'soporte@mcvill.mx',
  selectedApi: 'gemini-2.5-flash-lite',
  software_accelerator_url: 'https://mcvill-acelerador.vercel.app',
  logo: '/logo-erp.png',
  logoDark: '/logo-erp.png',
  loginBackground: '/login-bg.png',
  themeColor: '#3B82F6',
  themeColorLight: '#1D4ED8',
  themeName: 'blue' as ThemeName,
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
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profile?.tenant_id) {
            currentTenantId = profile.tenant_id;
          }
        }
        
        setTenantId(currentTenantId);

        // Step 3: Fetch from Supabase (Rule 16)
        const { data: tenant, error } = await supabase
          .from('tenants')
          .select('brand_name, system_name, slogan, selected_api, config')
          .eq('id', currentTenantId)
          .maybeSingle();
        
        if (tenant) {
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
              companyName: supabaseConfig.company_name || prev.companyName,
              companyCity: supabaseConfig.company_city || prev.companyCity,
              developerName: supabaseConfig.developer_name || prev.developerName,
              developerUrl: supabaseConfig.developer_url || prev.developerUrl,
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
              company_name: updated.companyName,
              company_city: updated.companyCity,
              developer_name: updated.developerName,
              developer_url: updated.developerUrl,
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

  // Derived logo based on theme
  const currentConfig = {
    ...config,
    logo: isDarkMode ? (config.logoDark || defaultConfig.logoDark) : (config.logo || defaultConfig.logo)
  };

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
