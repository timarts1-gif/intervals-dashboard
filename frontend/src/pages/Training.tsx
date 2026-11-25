import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDashboardData } from '../hooks/useDashboardData';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Segmented } from '../components/Segmented';
import { ActivityTable } from '../components/ActivityTable';
import { ZoneChart } from '../components/ZoneChart';
import { ErrorState, LoadingState } from '../components/States';
import { axisProps, COLORS, gridProps, tooltipProps } from '../components/chartTheme';
import { GROUP_ORDER, SPORT_GROUPS, typeLabel } from '../data/sports';
import { daysBetween, inRange, monthlyBuckets, totals, weeklyBuckets } from '../utils/aggregate';
import { addDays, PERIODS, periodStart, today, type PeriodKey } from '../utils/dates';
import { fmt1, fmtDuration, fmtHours, fmtInt, fmtKm } from '../utils/format';
import { hrZoneRows, powerZoneRows } from '../utils/zones';

export function Training() {
  const { loading, error, activities, cyclingProfile, athlete } = useDashboardData();
  const [period, setPeriod] = useState<PeriodKey>('12w');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');

  const view = useMemo(() => {
    const now = today();
    const start = periodStart(period, now);
    const acts = inRange(activities, start, addDays(now, 1));
    const useMonths = period === '1y' || period === 'ytd' || period === '6m';
    const buckets = useMonths ? monthlyBuckets(acts, start, now) : weeklyBuckets(acts, start, now);
    const types = [...new Set(acts.map((a) => a.type))].sort();
    const weeks = (daysBetween(start, now) + 1) / 7;
    return { acts, buckets, useMonths, types, weeks, t: totals(acts) };
  }, [activities, period]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return view.acts.filter((a) => (type === 'all' || a.type === type) && (!q || a.name.toLowerCase().includes(q)));
  }, [view.acts, query, type]);

  if (loading && !athlete) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const avgPerWeek = view.t.movingTime / view.weeks;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training"
        subtitle="Volume, intensiteitsverdeling en alle trainingen"
        actions={<Segmented options={PERIODS} value={period} onChange={setPeriod} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Trainingstijd" value={fmtHours(view.t.movingTime)} />
        <Stat label="Gem. per week" value={fmtHours(avgPerWeek)} />
        <Stat label="Afstand" value={fmtKm(view.t.distance)} />
        <Stat label="Hoogtemeters" value={`${fmtInt(view.t.elevation)} m`} />
        <Stat label="Training load" value={fmtInt(view.t.load)} sub={`${view.t.count} trainingen`} />
      </div>

      <Card title={`Volume per ${view.useMonths ? 'maand' : 'week'}`} subtitle="Uren per sport en totale training load">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={view.buckets}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis yAxisId="h" {...axisProps} width={36} tickFormatter={(v) => `${v}u`} />
            <YAxis yAxisId="l" orientation="right" {...axisProps} width={40} />
            <Tooltip {...tooltipProps} formatter={(v: number, n) => [n === 'Load' ? fmtInt(v) : `${fmt1(v)} u`, n]} />
            {GROUP_ORDER.filter((g) => view.buckets.some((b) => b.hoursByGroup[g] > 0)).map((g) => (
              <Bar key={g} yAxisId="h" dataKey={`hoursByGroup.${g}`} name={SPORT_GROUPS[g].label} stackId="h" fill={SPORT_GROUPS[g].color} />
            ))}
            <Line yAxisId="l" type="monotone" dataKey="load" name="Load" stroke={COLORS.ctl} strokeWidth={2} dot={false} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Tijd in vermogenszones" subtitle="Op basis van de zones in je Intervals.icu-instellingen">
          <ZoneChart rows={powerZoneRows(view.acts, cyclingProfile, true)} />
        </Card>
        <Card title="Tijd in hartslagzones" subtitle="Op basis van de zones in je Intervals.icu-instellingen">
          <ZoneChart rows={hrZoneRows(view.acts, cyclingProfile)} />
        </Card>
      </div>

      <Card title="Afstand en hoogtemeters" subtitle={`Per ${view.useMonths ? 'maand' : 'week'}`}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={view.buckets.map((b) => ({ ...b, km: b.distance / 1000 }))}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis yAxisId="km" {...axisProps} width={44} />
            <YAxis yAxisId="m" orientation="right" {...axisProps} width={48} />
            <Tooltip {...tooltipProps} formatter={(v: number, n) => [n === 'Afstand' ? `${fmt1(v)} km` : `${fmtInt(v)} m`, n]} />
            <Bar yAxisId="km" dataKey="km" name="Afstand" fill={COLORS.accent} radius={[3, 3, 0, 0]} />
            <Bar yAxisId="m" dataKey="elevation" name="Hoogtemeters" fill={COLORS.violet} radius={[3, 3, 0, 0]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card
        title="Trainingen"
        subtitle={`${filtered.length} van ${view.acts.length} in deze periode · totaal ${fmtDuration(filtered.reduce((s, a) => s + a.movingTime, 0))}`}
        action={
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Zoek op naam"
                className="w-44 rounded-lg border border-surface-border bg-surface-raised py-1.5 pl-8 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-accent focus:outline-none"
              />
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-slate-200 focus:border-accent focus:outline-none"
            >
              <option value="all">Alle types</option>
              {view.types.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <ActivityTable activities={filtered} sortable pageSize={25} />
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-semibold tabular-nums text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
