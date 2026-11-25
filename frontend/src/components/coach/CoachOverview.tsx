import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Clock } from 'lucide-react';
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { addDays, format } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { CoachAthlete, CoachOverview as Overview } from '../../types/api';
import { COLORS, tooltipProps } from '../chartTheme';
import { EmptyState } from '../States';
import { fmt1, fmtDate, fmtInt } from '../../utils/format';
import { parseLocal } from '../../utils/dates';

type SortKey =
  | 'name'
  | 'ctl'
  | 'atl'
  | 'form'
  | 'rampRate'
  | 'w0'
  | 'w1'
  | 'w2'
  | 'w3'
  | 'ctlChange28'
  | 'atlChange28'
  | 'formChange28';

function sortValue(a: CoachAthlete, k: SortKey): number | string | null {
  if (k === 'name') return a.name.toLowerCase();
  if (k.startsWith('w')) return a.weeklyLoad[Number(k.slice(1))] ?? null;
  return a[k as Exclude<SortKey, 'name' | 'w0' | 'w1' | 'w2' | 'w3'>];
}

function Delta({ v }: { v: number | null }) {
  if (v == null) return <span className="text-slate-500">–</span>;
  const s = `${v > 0 ? '+' : v < 0 ? '−' : '±'}${fmt1(Math.abs(v))}`;
  // Neutrale kleur: geen oordeel (goed/slecht) dat niet uit Intervals.icu komt.
  return <span className="text-slate-200">{s}</span>;
}

function Sparkline({ a }: { a: CoachAthlete }) {
  return (
    <div className="h-11 w-36">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={a.series} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={['auto', 'auto']} />
          <ReferenceLine y={0} stroke="#334155" />
          <Tooltip
            {...tooltipProps}
            labelFormatter={(_l, p) => (p?.[0] ? fmtDate(p[0].payload.date) : '')}
            formatter={(v, n) => [fmt1(Number(v)), n]}
          />
          <Line dataKey="ctl" name="Fitness (CTL)" stroke={COLORS.ctl} strokeWidth={1.75} dot={false} isAnimationActive={false} connectNulls />
          <Line dataKey="atl" name="Fatigue (ATL)" stroke={COLORS.atl} strokeWidth={1.25} dot={false} isAnimationActive={false} connectNulls />
          <Line dataKey="form" name="Form" stroke={COLORS.tsb} strokeWidth={1.25} dot={false} isAnimationActive={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CoachOverview({ data }: { data: Overview }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });

  const rows = useMemo(
    () =>
      [...data.athletes].sort((a, b) => {
        const av = sortValue(a, sort.key);
        const bv = sortValue(b, sort.key);
        if (av === bv) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return (av < bv ? -1 : 1) * sort.dir;
      }),
    [data.athletes, sort],
  );

  // Labels voor de 4 rollende blokken van 7 dagen (laatste eindigt op periodEnd).
  const end = parseLocal(data.periodEnd);
  const blocks = [3, 2, 1, 0].map((b) => {
    const to = addDays(end, -b * 7);
    const from = addDays(to, -6);
    return `${format(from, 'd MMM', { locale: nl })} – ${format(to, 'd MMM', { locale: nl })}`;
  });

  const Th = ({ k, children, title }: { k: SortKey; children: React.ReactNode; title?: string }) => (
    <th
      title={title}
      onClick={() => setSort((s) => (s.key === k ? { key: k, dir: (s.dir * -1) as 1 | -1 } : { key: k, dir: k === 'name' ? 1 : -1 }))}
      className={`cursor-pointer select-none whitespace-nowrap py-2 font-medium hover:text-slate-300 ${k === 'name' ? 'px-5 text-left' : 'px-2.5 text-right'}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sort.key === k && (sort.dir === -1 ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-surface-border bg-surface-raised px-4 py-2.5 text-sm text-slate-300">
        <span className="inline-flex items-center gap-2">
          <Clock size={14} className="text-accent" />
          Data opgehaald uit Intervals.icu: <strong className="font-medium text-white">{new Date(data.generatedAt).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
        </span>
        <span className="text-slate-400">
          Periode: {fmtDate(data.periodStart)} – {fmtDate(data.periodEnd)} (28 dagen)
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState label="Geen atleten ingesteld (COACH_ATHLETE_IDS)" />
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-slate-500">
                <Th k="name">Atleet</Th>
                <Th k="ctl" title="Fitness (CTL)">CTL</Th>
                <Th k="atl" title="Fatigue (ATL)">ATL</Th>
                <Th k="form" title="Form = CTL − ATL">Form</Th>
                <Th k="rampRate" title="Ramp rate (Intervals.icu)">Ramp</Th>
                {blocks.map((label, i) => (
                  <Th key={i} k={`w${i}` as SortKey} title={`Load ${label}`}>
                    <span className="flex flex-col items-end leading-tight">
                      <span>Load</span>
                      <span className="text-[10px] normal-case tracking-normal text-slate-600">{label}</span>
                    </span>
                  </Th>
                ))}
                <Th k="ctlChange28" title="Verandering CTL t.o.v. 28 dagen geleden">Δ CTL</Th>
                <Th k="atlChange28" title="Verandering ATL t.o.v. 28 dagen geleden">Δ ATL</Th>
                <Th k="formChange28" title="Verandering Form t.o.v. 28 dagen geleden">Δ Form</Th>
                <th className="px-3 py-2 text-left font-medium">28 dagen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={i} className="border-b border-surface-border/60 last:border-0 hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-5 py-2">
                    <div className="font-medium text-slate-100">{a.name}</div>
                    <div className="text-xs text-slate-500">{a.lastDataDate ? `laatste data ${fmtDate(a.lastDataDate)}` : 'geen data'}</div>
                  </td>
                  <td className="px-2.5 py-2 text-right tabular-nums text-white">{fmt1(a.ctl)}</td>
                  <td className="px-2.5 py-2 text-right tabular-nums text-slate-200">{fmt1(a.atl)}</td>
                  <td className="px-2.5 py-2 text-right tabular-nums text-slate-200">{fmt1(a.form)}</td>
                  <td className="px-2.5 py-2 text-right tabular-nums text-slate-300">{fmt1(a.rampRate)}</td>
                  {a.weeklyLoad.map((l, j) => (
                    <td key={j} className="px-2.5 py-2 text-right tabular-nums text-slate-300">
                      {fmtInt(l)}
                    </td>
                  ))}
                  <td className="px-2.5 py-2 text-right tabular-nums">
                    <Delta v={a.ctlChange28} />
                  </td>
                  <td className="px-2.5 py-2 text-right tabular-nums">
                    <Delta v={a.atlChange28} />
                  </td>
                  <td className="px-2.5 py-2 text-right tabular-nums">
                    <Delta v={a.formChange28} />
                  </td>
                  <td className="px-3 py-1">
                    <Sparkline a={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ background: COLORS.ctl }} /> Fitness (CTL)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ background: COLORS.atl }} /> Fatigue (ATL)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ background: COLORS.tsb }} /> Form (CTL − ATL)
        </span>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        Alle waarden komen uit Intervals.icu (wellness: ctl, atl, rampRate, atlLoad). Load per kolom is de som van de dagelijkse
        trainingsload over 7 dagen; de laatste kolom eindigt vandaag. Δ = huidige waarde min de waarde van 28 dagen geleden.
      </p>
    </div>
  );
}
