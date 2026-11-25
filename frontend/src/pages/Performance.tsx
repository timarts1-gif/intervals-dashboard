import { useMemo, useState } from 'react';
import { Activity as ActivityIcon, Battery, Flame, Gauge, HeartPulse, Moon, Scale, TrendingUp } from 'lucide-react';
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDashboardData } from '../hooks/useDashboardData';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { KpiCard } from '../components/KpiCard';
import { Segmented } from '../components/Segmented';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { axisProps, COLORS, gridProps, tooltipProps } from '../components/chartTheme';
import { latest, thin } from '../utils/aggregate';
import { addDays, dayKey, PERIODS, periodStart, today, toIsoDate, type PeriodKey } from '../utils/dates';
import { fmt1, fmtDate, fmtInt } from '../utils/format';
import type { WellnessDay } from '../types/api';

function avgLast(rows: WellnessDay[], pick: (w: WellnessDay) => number | null, days: number): number | null {
  const from = toIsoDate(addDays(today(), -days + 1));
  const vals = rows.filter((r) => r.date >= from).map(pick).filter((v): v is number => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function Performance() {
  const { loading, error, wellness, activities, athlete } = useDashboardData();
  const [period, setPeriod] = useState<PeriodKey>('6m');

  const view = useMemo(() => {
    const now = today();
    const from = toIsoDate(periodStart(period, now));
    const rows = wellness.filter((w) => w.date >= from);

    const loadByDay = new Map<string, number>();
    for (const a of activities) {
      const k = dayKey(a.date);
      if (k >= from) loadByDay.set(k, (loadByDay.get(k) ?? 0) + (a.trainingLoad ?? 0));
    }
    const daily = rows.map((w) => ({ ...w, load: loadByDay.get(w.date) ?? 0, sleepH: w.sleepSecs != null ? w.sleepSecs / 3600 : null }));
    return {
      rows: thin(daily, 400),
      hasHr: rows.some((r) => r.restingHr != null || r.hrv != null),
      hasWeight: rows.some((r) => r.weight != null),
      hasSleep: rows.some((r) => r.sleepSecs != null),
      current: latest(wellness, (w) => w.ctl),
    };
  }, [wellness, activities, period]);

  if (loading && !athlete) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const cur = view.current?.row ?? null;
  const rhr7 = avgLast(wellness, (w) => w.restingHr, 7);
  const rhr28 = avgLast(wellness, (w) => w.restingHr, 28);
  const hrv7 = avgLast(wellness, (w) => w.hrv, 7);
  const hrv28 = avgLast(wellness, (w) => w.hrv, 28);
  const weight = latest(wellness, (w) => w.weight);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        subtitle="Fitness, vermoeidheid, vorm en herstel"
        actions={<Segmented options={PERIODS} value={period} onChange={setPeriod} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Fitness (CTL)" value={fmt1(cur?.ctl)} icon={TrendingUp} sub="42-daags gewogen gemiddelde load" />
        <KpiCard label="Vermoeidheid (ATL)" value={fmt1(cur?.atl)} icon={Flame} sub="7-daags gewogen gemiddelde load" />
        <KpiCard label="Vorm (TSB)" value={fmt1(cur?.tsb)} icon={Battery} sub="CTL − ATL" />
        <KpiCard label="Ramp rate" value={fmt1(cur?.rampRate)} icon={Gauge} sub="CTL-verandering per week" />
        <KpiCard
          label="Rusthartslag"
          value={rhr7 != null ? `${fmtInt(rhr7)} bpm` : '–'}
          icon={HeartPulse}
          sub={rhr28 != null ? `7d gem. · 28d: ${fmtInt(rhr28)} bpm` : '7-daags gemiddelde'}
        />
        <KpiCard label="HRV" value={hrv7 != null ? `${fmtInt(hrv7)} ms` : '–'} icon={ActivityIcon} sub={hrv28 != null ? `7d gem. · 28d: ${fmtInt(hrv28)} ms` : '7-daags gemiddelde'} />
        <KpiCard label="Gewicht" value={weight ? `${fmt1(weight.value)} kg` : athlete?.weight ? `${fmt1(athlete.weight)} kg` : '–'} icon={Scale} sub={weight ? `gemeten ${fmtDate(weight.row.date)}` : 'uit profiel'} />
        <KpiCard label="Slaap" value={avgLast(wellness, (w) => w.sleepSecs, 7) != null ? `${fmt1(avgLast(wellness, (w) => w.sleepSecs, 7)! / 3600)} u` : '–'} icon={Moon} sub="7-daags gemiddelde" />
      </div>

      <Card title="Fitness, vermoeidheid en vorm" subtitle="Dagwaarden zoals berekend door Intervals.icu (alle sporten); balken = dagelijkse load van de geselecteerde sporten">
        {view.rows.length === 0 ? (
          <EmptyState label="Geen fitnessdata in deze periode" />
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={view.rows}>
              <defs>
                <linearGradient id="perfCtl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.ctl} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.ctl} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => fmtDate(d, 'd MMM')} minTickGap={40} />
              <YAxis yAxisId="f" {...axisProps} width={36} />
              <YAxis yAxisId="l" orientation="right" {...axisProps} width={36} />
              <Tooltip {...tooltipProps} labelFormatter={(d) => fmtDate(d, 'EEEE d MMM yyyy')} formatter={(v: number, n) => [fmt1(v), n]} />
              <ReferenceLine yAxisId="f" y={0} stroke="#475569" />
              <Bar yAxisId="l" dataKey="load" name="Load" fill="#334155" />
              <Area yAxisId="f" type="monotone" dataKey="ctl" name="Fitness (CTL)" stroke={COLORS.ctl} fill="url(#perfCtl)" strokeWidth={2} dot={false} />
              <Line yAxisId="f" type="monotone" dataKey="atl" name="Vermoeidheid (ATL)" stroke={COLORS.atl} strokeWidth={1.5} dot={false} />
              <Line yAxisId="f" type="monotone" dataKey="tsb" name="Vorm (TSB)" stroke={COLORS.tsb} strokeWidth={1.5} dot={false} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Ramp rate" subtitle="Wekelijkse verandering van CTL">
          {view.rows.length === 0 ? (
            <EmptyState label="Geen data" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={view.rows}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => fmtDate(d, 'd MMM')} minTickGap={40} />
                <YAxis {...axisProps} width={36} />
                <Tooltip {...tooltipProps} labelFormatter={(d) => fmtDate(d)} formatter={(v: number) => [fmt1(v), 'Ramp rate']} />
                <ReferenceLine y={0} stroke="#475569" />
                <Bar dataKey="rampRate" fill={COLORS.green} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Herstel" subtitle="Rusthartslag en HRV (uit wellness)">
          {!view.hasHr ? (
            <EmptyState label="Geen rusthartslag- of HRV-data in Intervals.icu" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={view.rows}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => fmtDate(d, 'd MMM')} minTickGap={40} />
                <YAxis yAxisId="hr" {...axisProps} width={36} domain={['auto', 'auto']} />
                <YAxis yAxisId="hrv" orientation="right" {...axisProps} width={36} domain={['auto', 'auto']} />
                <Tooltip {...tooltipProps} labelFormatter={(d) => fmtDate(d)} formatter={(v: number, n) => [fmtInt(v), n]} />
                <Line yAxisId="hr" type="monotone" dataKey="restingHr" name="Rusthartslag" stroke={COLORS.atl} dot={false} connectNulls />
                <Line yAxisId="hrv" type="monotone" dataKey="hrv" name="HRV" stroke={COLORS.green} dot={false} connectNulls />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {view.hasWeight && (
          <Card title="Gewicht" subtitle="kg">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={view.rows}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => fmtDate(d, 'd MMM')} minTickGap={40} />
                <YAxis {...axisProps} width={40} domain={['auto', 'auto']} tickFormatter={(v) => fmt1(v)} />
                <Tooltip {...tooltipProps} labelFormatter={(d) => fmtDate(d)} formatter={(v: number) => [`${fmt1(v)} kg`, 'Gewicht']} />
                <Line type="monotone" dataKey="weight" stroke={COLORS.violet} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {view.hasSleep && (
          <Card title="Slaap" subtitle="uren per nacht">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={view.rows}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => fmtDate(d, 'd MMM')} minTickGap={40} />
                <YAxis {...axisProps} width={36} />
                <Tooltip {...tooltipProps} labelFormatter={(d) => fmtDate(d)} formatter={(v: number) => [`${fmt1(v)} u`, 'Slaap']} />
                <Bar dataKey="sleepH" fill={COLORS.ctl} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  );
}
