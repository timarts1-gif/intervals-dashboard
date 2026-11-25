import { NavLink } from 'react-router-dom';
import { Activity, BarChart3, Gauge, LayoutDashboard, Settings, TrendingUp, Users, Zap, X } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/training', label: 'Training', icon: Activity },
  { to: '/performance', label: 'Performance', icon: Gauge },
  { to: '/power', label: 'Power Analysis', icon: Zap },
  { to: '/development', label: 'Development', icon: TrendingUp },
  { to: '/coach', label: 'Coach', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/60 lg:hidden ${open ? 'block' : 'hidden'}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-surface-border bg-surface-raised transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent">
              <BarChart3 className="h-4.5 w-4.5 text-white" size={18} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">Development</div>
              <div className="text-xs text-slate-400">Dashboard</div>
            </div>
          </div>
          <button className="rounded p-1 text-slate-400 hover:text-white lg:hidden" onClick={onClose} aria-label="Menu sluiten">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent/15 text-accent' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-surface-border px-5 py-4 text-xs text-slate-500">
          Data: <a className="hover:text-slate-300" href="https://intervals.icu" target="_blank" rel="noreferrer">Intervals.icu</a>
        </div>
      </aside>
    </>
  );
}
