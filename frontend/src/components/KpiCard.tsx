import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  /** Procentuele of absolute verandering, tekst al geformatteerd. */
  delta?: { text: string; positive: boolean } | null;
}

export function KpiCard({ label, value, sub, icon: Icon, delta }: Props) {
  return (
    <div className="min-w-0 rounded-xl border border-surface-border bg-surface-card p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">{label}</span>
        <div className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent sm:grid">
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-3 text-xl font-semibold tabular-nums text-white sm:text-2xl">{value}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        {delta && (
          <span className={`flex items-center gap-0.5 font-medium ${delta.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {delta.positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {delta.text}
          </span>
        )}
        {sub && <span className="text-slate-500">{sub}</span>}
      </div>
    </div>
  );
}
