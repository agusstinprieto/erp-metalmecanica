import { useConfig } from '../contexts/ConfigContext';

/**
 * Hook to retrieve the current tenant ID from the configuration context.
 * Falls back to 'mcvill' if no tenant is set.
 */
export const useTenant = () => {
  const { tenantId } = useConfig();
  return tenantId || 'mcvill';
};
