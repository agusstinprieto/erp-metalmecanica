import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react"
import './index.css'
import App from './App.tsx'
import { ConfigProvider } from './contexts/ConfigContext'
import { SearchProvider } from './contexts/SearchContext'

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
      <SearchProvider>
        <App />
      </SearchProvider>
    </ConfigProvider>
  </StrictMode>,
)
