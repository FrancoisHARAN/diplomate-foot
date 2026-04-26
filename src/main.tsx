import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { PlayerSessionProvider } from './context/PlayerSessionContext';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Élément root introuvable');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <PlayerSessionProvider>
          <App />
        </PlayerSessionProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
