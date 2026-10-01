import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@dc/brand/tokens.css';
import './hub.css';
import { App } from './App';
import { ToastProvider } from './toast';
import { applyTheme } from './theme';

applyTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
