import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react"
import './index.css'
import App from './App.tsx'
import { ConfigProvider } from './contexts/ConfigContext'
import { SearchProvider } from './contexts/SearchContext'
import { LanguageProvider } from './contexts/LanguageContext'

// Gracefully handle dynamic chunk loading errors (Vite Chunk Load Failures after new deployments)
window.addEventListener('error', (e) => {
  const isChunkError = e.message && (
    e.message.includes('Failed to fetch dynamically imported module') ||
    e.message.includes('Expected a JavaScript-or-Wasm module script') ||
    e.message.includes('MIME type of "text/html"')
  );
  if (isChunkError) {
    console.warn('[Global] Dynamic module fetch failed. Force-reloading to get latest assets...');
    window.location.reload();
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  if (reason && reason instanceof Error && reason.message && (
    reason.message.includes('Failed to fetch dynamically imported module') ||
    reason.message.includes('Expected a JavaScript-or-Wasm module script') ||
    reason.message.includes('MIME type of "text/html"')
  )) {
    console.warn('[Global] Dynamic module promise rejected. Force-reloading...');
    window.location.reload();
  }
});

// Initialize Sentry
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
    sendDefaultPii: true,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider>
      <LanguageProvider>
        <SearchProvider>
          <App />
        </SearchProvider>
      </LanguageProvider>
    </ConfigProvider>
  </StrictMode>,
)
