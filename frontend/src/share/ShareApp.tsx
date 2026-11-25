import { LogOut, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAsync } from '../hooks/useAsync';
import { authApi as api } from '../services/authApi';
import { LoginScreen } from '../components/LoginScreen';
import { CoachOverview } from '../components/coach/CoachOverview';
import { Card } from '../components/Card';
import { LoadingState } from '../components/States';

function Overview({ onLogout }: { onLogout: () => void }) {
  const { data, loading, error } = useAsync(() => api.coach(), []);
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent">
            <Users size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Coachoverzicht</h1>
            <p className="text-sm text-slate-400">Trainingsstatus over de afgelopen 28 dagen</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5">
          <LogOut size={15} /> Uitloggen
        </button>
      </header>
      <Card>
        {loading ? <LoadingState label="Gegevens laden…" /> : error ? <p className="text-sm text-rose-300">{error}</p> : data && <CoachOverview data={data} />}
      </Card>
    </div>
  );
}

export function ShareApp() {
  const { state, refresh, logout } = useAuth();
  if (state.status === 'loading') return <LoadingState label="Laden…" />;
  if (state.status === 'error') return <p className="p-6 text-sm text-rose-300">{state.message}</p>;
  if (state.status === 'anonymous') return <LoginScreen title="Coachoverzicht" subtitle="Toegang met wachtwoord" onSuccess={refresh} />;
  return <Overview onLogout={logout} />;
}
