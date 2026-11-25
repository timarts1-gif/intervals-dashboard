import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink } from 'lucide-react';
import type { Activity } from '../types/api';
import { SPORT_GROUPS, sportGroupOf, typeLabel } from '../data/sports';
import { fmtDate, fmtDuration, fmtInt, fmtKm, fmt2 } from '../utils/format';
import { EmptyState } from './States';

type SortKey = 'date' | 'movingTime' | 'distance' | 'elevationGain' | 'trainingLoad' | 'normalizedPower' | 'avgHr';

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'date', label: 'Datum' },
  { key: 'movingTime', label: 'Duur', align: 'right' },
  { key: 'distance', label: 'Afstand', align: 'right' },
  { key: 'elevationGain', label: 'Hm', align: 'right' },
  { key: 'trainingLoad', label: 'Load', align: 'right' },
  { key: 'normalizedPower', label: 'NP', align: 'right' },
  { key: 'avgHr', label: 'Gem. HR', align: 'right' },
];

interface Props {
  activities: Activity[];
  limit?: number;
  sortable?: boolean;
  compact?: boolean;
  /** Aantal rijen per 'meer tonen'-stap; zonder waarde alles tonen. */
  pageSize?: number;
}

export function ActivityTable({ activities, limit, sortable = false, compact = false, pageSize }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 });
  const [shown, setShown] = useState(pageSize ?? Infinity);

  const rows = useMemo(() => {
    const sorted = [...activities].sort((a, b) => {
      const av = a[sort.key] ?? -Infinity;
      const bv = b[sort.key] ?? -Infinity;
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0;
    });
    return limit ? sorted.slice(0, limit) : sorted;
  }, [activities, sort, limit]);

  const visible = rows.slice(0, shown);

  if (rows.length === 0) return <EmptyState label="Geen trainingen gevonden" />;

  const toggle = (key: SortKey) =>
    sortable && setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));

  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-slate-500">
            <th className="px-5 py-2 text-left font-medium">Training</th>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                onClick={() => toggle(c.key)}
                className={`px-3 py-2 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'} ${sortable ? 'cursor-pointer select-none hover:text-slate-300' : ''}`}
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  {sortable && sort.key === c.key && (sort.dir === -1 ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                </span>
              </th>
            ))}
            {!compact && <th className="px-3 py-2 text-right font-medium">IF</th>}
            <th className="w-10 px-5 py-2" />
          </tr>
        </thead>
        <tbody>
          {visible.map((a) => {
            const group = SPORT_GROUPS[sportGroupOf(a.type)];
            return (
              <tr key={a.id} className="border-b border-surface-border/60 last:border-0 hover:bg-white/[0.02]">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: group.color }} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-100">{a.name || typeLabel(a.type)}</div>
                      <div className="text-xs text-slate-500">
                        {typeLabel(a.type)}
                        {a.race && ' · Wedstrijd'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{fmtDate(a.date, 'EEE d MMM yyyy')}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{fmtDuration(a.movingTime)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{a.distance > 0 ? fmtKm(a.distance) : '–'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{a.elevationGain > 0 ? fmtInt(a.elevationGain) : '–'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{fmtInt(a.trainingLoad)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{a.normalizedPower ? `${a.normalizedPower} W` : '–'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{fmtInt(a.avgHr)}</td>
                {!compact && <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{fmt2(a.intensityFactor)}</td>}
                <td className="px-5 py-2.5 text-right">
                  <a
                    href={`https://intervals.icu/activities/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-accent"
                    title="Openen in Intervals.icu"
                  >
                    <ExternalLink size={14} />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {visible.length < rows.length && (
        <div className="px-5 pt-4 text-center">
          <button
            onClick={() => setShown((n) => n + (pageSize ?? rows.length))}
            className="rounded-lg border border-surface-border px-4 py-1.5 text-sm text-slate-300 hover:bg-white/5"
          >
            Meer tonen ({rows.length - visible.length} resterend)
          </button>
        </div>
      )}
    </div>
  );
}
