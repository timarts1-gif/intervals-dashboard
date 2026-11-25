import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut, Menu, RefreshCw } from 'lucide-react';
import { useAuthContext } from '../hooks/AuthContext';
import { Sidebar } from './Sidebar';
import { useDashboardData } from '../hooks/useDashboardData';

export function Layout() {
  const [open, setOpen] = useState(false);
  const { athlete, loading, reload, loadedAt } = useDashboardData();
  const { state, logout } = useAuthContext();
  const canLogout = state.status === 'ok' && state.me.ownerAuth;

  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-border bg-surface/85 px-4 backdrop-blur sm:px-6">
          <button className="rounded p-1.5 text-slate-300 hover:bg-white/5 lg:hidden" onClick={() => setOpen(true)} aria-label="Menu openen">
            <Menu size={20} />
          </button>
          <div className="hidden text-sm text-slate-400 lg:block">
            {loadedAt ? `Bijgewerkt om ${loadedAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : ' '}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={reload}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Vernieuwen</span>
            </button>
            {canLogout && (
              <button onClick={logout} className="rounded-lg border border-surface-border p-1.5 text-slate-300 hover:bg-white/5" title="Uitloggen" aria-label="Uitloggen">
                <LogOut size={15} />
              </button>
            )}
            {athlete && (
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-700 text-xs font-semibold text-white">
                  {athlete.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <span className="hidden text-sm text-slate-300 sm:inline">{athlete.name}</span>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
