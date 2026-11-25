import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SettingsProvider } from './hooks/useSettings';
import { DataProvider } from './hooks/useDashboardData';
import { AuthProvider, useAuthContext } from './hooks/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { LoadingState } from './components/States';
import './index.css';

/** Dashboard pas laden na owner-login; een share-sessie gaat naar de coachpagina. */
function Gate() {
  const { state, refresh } = useAuthContext();
  if (state.status === 'loading') return <LoadingState label="Laden…" />;
  if (state.status === 'error') return <p className="p-6 text-sm text-rose-300">{state.message}</p>;
  if (state.status === 'anonymous') return <LoginScreen title="Development Dashboard" subtitle="Log in om verder te gaan" onSuccess={refresh} />;
  if (state.me.role !== 'owner') {
    window.location.replace('/share/');
    return null;
  }
  return (
    <SettingsProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </SettingsProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
