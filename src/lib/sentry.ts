import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || dsn === 'none') return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `erp-metalmecanica@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    tracesSampleRate: 0.1,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Strip auth headers before sending to Sentry
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['apikey'];
      }
      return event;
    },
  });
}

export function setSentryUser(id: string, role: string, tenantId?: string) {
  Sentry.setUser({ id, role, tenantId });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

// Call this when a Gemini/AI call fails
export function captureAIError(error: Error, ctx: { model?: string; module?: string; action?: string }) {
  Sentry.withScope(scope => {
    scope.setTag('error.type', 'ai_failure');
    scope.setContext('ai_context', ctx);
    Sentry.captureException(error);
  });
}

// Call this when a Supabase query fails in a critical path
export function captureDBError(error: Error, ctx: { table?: string; operation?: string }) {
  Sentry.withScope(scope => {
    scope.setTag('error.type', 'db_failure');
    scope.setContext('db_context', ctx);
    Sentry.captureException(error);
  });
}
