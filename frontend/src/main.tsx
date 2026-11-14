import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { AppErrorBoundary } from './shared/ui/AppErrorBoundary';
import './styles.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>
  );
}
