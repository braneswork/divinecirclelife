import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@dc/brand/tokens.css';
import '@dc/ui/ui.css';
import './hub.css';
import { ToastProvider } from '@dc/ui';
import { App } from './App';
import { Gate } from './auth/Gate';
import { applyTheme } from './theme';

applyTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <Gate>
        <App />
      </Gate>
    </ToastProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
