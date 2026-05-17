/**
 * logger.ts — Agus Pro Logging Utility
 * En producción (Vite build), todos los logs son no-op para evitar
 * filtración de información sensible en la consola del navegador.
 * En desarrollo, muestra los logs normalmente con prefijo de contexto.
 */

const IS_DEV = import.meta.env.DEV;

const noop = () => {};

export const logger = {
  debug:   IS_DEV ? (...args: unknown[]) => console.log('[DEBUG]', ...args)   : noop,
  info:    IS_DEV ? (...args: unknown[]) => console.log('[INFO]',  ...args)   : noop,
  warn:    IS_DEV ? (...args: unknown[]) => console.warn('[WARN]',  ...args)  : noop,
  /** Siempre activo — errores críticos deben registrarse incluso en producción */
  error:            (...args: unknown[]) => console.error('[ERROR]', ...args),
};
