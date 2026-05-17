import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
}

interface ConfigContextType {
  config: BrandConfig;
  tenantId: string | null;
  isLoading: boolean;
  isDarkMode: boolean;
  updateConfig: (newConfig: Partial<BrandConfig>) => void;
  setSelectedApi: (apiId: string) => void;
  toggleTheme: () => void;
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
  themeColorLight: '#1D4ED8'
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<BrandConfig>(defaultConfig);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode for "Agus Pro" aesthetic

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  useEffect(() => {
    // Sync theme with document class on initial load
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      
      // Apply custom colors if present
      const accent = config.themeColor || defaultConfig.themeColor;
      document.documentElement.style.setProperty('--theme-accent', accent!);
      document.documentElement.style.setProperty('--theme-card-border', hexToRgba(accent!, 0.6));
      document.documentElement.style.setProperty('--theme-glow', hexToRgba(accent!, 0.5));
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');

      // Apply custom colors if present
      const accent = config.themeColorLight || defaultConfig.themeColorLight;
      document.documentElement.style.setProperty('--theme-accent', accent!);
      document.documentElement.style.setProperty('--theme-card-border', '#CBD5E1');
      document.documentElement.style.setProperty('--theme-glow', hexToRgba(accent!, 0.12));
    }
  }, [isDarkMode, config.themeColor, config.themeColorLight]);

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
          const remoteConfig = {
            ...config,
            brandName: tenant.brand_name || config.brandName,
            systemName: tenant.system_name || config.systemName,
            slogan: tenant.slogan || config.slogan,
            selectedApi: tenant.selected_api || config.selectedApi,
            themeColor: supabaseConfig.themeColor || config.themeColor,
            themeColorLight: supabaseConfig.themeColorLight || config.themeColorLight,
            logo: supabaseConfig.logo_url || config.logo,
            logoDark: supabaseConfig.logo_url || config.logoDark,
            companyName: supabaseConfig.company_name || config.companyName,
            companyCity: supabaseConfig.company_city || config.companyCity,
            developerName: supabaseConfig.developer_name || config.developerName,
            developerUrl: supabaseConfig.developer_url || config.developerUrl,
          };
          
          setConfig(remoteConfig);
          localStorage.setItem('mcvill-config', JSON.stringify(remoteConfig));
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
      const { data: tenant } = await supabase.from('tenants').select('id, config').single();
      if (tenant) {
        const currentSupabaseConfig = tenant.config || {};
        await supabase
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
              ...(updated.logo ? { logo_url: updated.logo } : {}),
              company_name: updated.companyName,
              company_city: updated.companyCity,
              developer_name: updated.developerName,
              developer_url: updated.developerUrl,
            }
          })
          .eq('id', tenant.id);
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
      toggleTheme 
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
