import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react"
import './index.css'
import App from './App.tsx'
import { ConfigProvider } from './contexts/ConfigContext'
import { SearchProvider } from './contexts/SearchContext'
import { LanguageProvider } from './contexts/LanguageContext'

// Gracefully handle dynamic chunk loading errors (Vite Chunk Load Failures after new deployments)
function forceCacheBustReload() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('t', String(Date.now()));
    window.location.replace(url.toString());
  } catch (e) {
    window.location.reload();
  }
}

function handleChunkError() {
  const reloadCount = parseInt(sessionStorage.getItem('_chunk_reload') || '0');
  if (reloadCount >= 2) {
    console.error('[Global] Chunk load failed repeatedly — not reloading again to avoid loop.');
    return;
  }
  sessionStorage.setItem('_chunk_reload', String(reloadCount + 1));
  console.warn('[Global] Dynamic module fetch failed. Reloading to get latest assets...');
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#1d4ed8;color:#fff;text-align:center;padding:10px 16px;font-family:sans-serif;font-size:13px;font-weight:600;z-index:99999;letter-spacing:.05em';
  banner.textContent = 'Nueva versión disponible — actualizando la aplicación…';
  document.body?.appendChild(banner);
  setTimeout(() => forceCacheBustReload(), 1800);
}

window.addEventListener('error', (e) => {
  const isChunkError = e.message && (
    e.message.includes('Failed to fetch dynamically imported module') ||
    e.message.includes('Expected a JavaScript-or-Wasm module script') ||
    e.message.includes('MIME type of "text/html"')
  );
  if (isChunkError) handleChunkError();
}, true);

window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  if (reason instanceof Error && (
    reason.message.includes('Failed to fetch dynamically imported module') ||
    reason.message.includes('Expected a JavaScript-or-Wasm module script') ||
    reason.message.includes('MIME type of "text/html"')
  )) handleChunkError();
});

// Vite-specific event for dynamic import preloading errors
window.addEventListener('vite:preloadError', (e) => {
  console.warn('[Global] Vite preload error detected.');
  handleChunkError();
});

// Initialize Sentry only if DSN is a valid URL (not missing or literal "none")
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && sentryDsn !== 'none' && sentryDsn.startsWith('https://')) {
  Sentry.init({
    dsn: sentryDsn,
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
