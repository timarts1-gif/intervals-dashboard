import { useMemo } from 'react';
import { format, startOfYear, subYears } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Clock, Mountain, Route, TrendingUp, Zap, Gauge } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDashboardData } from '../hooks/useDashboardData';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { KpiCard } from '../components/KpiCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { axisProps, COLORS, gridProps, tooltipProps } from '../components/chartTheme';
import { eftpAt, inRange, monthlyAverage, thin, totals, wellnessAt } from '../utils/aggregate';
import { addDays, today, toIsoDate } from '../utils/dates';
import { fmt1, fmt2, fmtDate, fmtHours, fmtInt, fmtKm, pctChange } from '../utils/format';
import { isCycling } from '../data/sports';

function delta(cur: number | null, prev: number | null, unit = '', pct = true) {
  if (cur == null || prev == null) return null;
  if (pct) {
    const p = pctChange(cur, prev);
    return p == null ? null : { text: `${p >= 0 ? '+' : '−'}${Math.abs(Math.round(p))}%`, positive: p >= 0 };
  }
  const d = cur - prev;
  return { text: `${d >= 0 ? '+' : '−'}${fmt1(Math.abs(d))}${unit}`, positive: d >= 0 };
}

export function Development() {
  const { loading, error, activities, wellness, athlete, rangeStart } = useDashboardData();

  const view = useMemo(() => {
    const now = today();
    const yearAgo = subYears(now, 1);
    const ytd = totals(inRange(activities, startOfYear(now), addDays(now, 1)));
    const ytdPrev = totals(inRange(activities, startOfYear(yearAgo), addDays(yearAgo, 1)));
    const ctlNow = wellnessAt(wellness, now)?.ctl ?? null;
    const ctlPrev = wellnessAt(wellness, yearAgo)?.ctl ?? null;
    const eftpNow = eftpAt(wellness, now);
    const eftpPrev = eftpAt(wellness, yearAgo);

    // Jaar-op-jaar: uren per maand, dit jaar vs vorig jaar.
    const thisYear = now.getFullYear();
    const yoy = Array.from({ length: 12 }, (_, m) => {
      const label = format(new Date(thisYear, m, 1), 'MMM', { locale: nl });
      const cur = totals(inRange(activities, new Date(thisYear, m, 1), new Date(thisYear, m + 1, 1)));
      const prev = totals(inRange(activities, new Date(thisYear - 1, m, 1), new Date(thisYear - 1, m + 1, 1)));
      return {
        label,
        current: m <= now.getMonth() ? cur.movingTime / 3600 : null,
        previous: prev.movingTime / 3600,
      };
    });

    // FTP-ontwikkeling: eFTP uit wellness + ingestelde FTP per rit.
    const ftpByDay = new Map<string, number>();
    for (const a of activities) if (isCycling(a.type) && a.ftp) ftpByDay.set(a.date.slice(0, 10), a.ftp);
    let lastFtp: number | null = null;
    let lastEftp: number | null = null;
    const ftpSeries = thin(
      wellness.map((w) => {
        lastFtp = ftpByDay.get(w.date) ?? lastFtp;
        lastEftp = w.eftpBySport.Ride ?? lastEftp;
        return { date: w.date, eftp: lastEftp, ftp: lastFtp, wkg: lastEftp && w.weight ? lastEftp / w.weight : null };
      }),
      300,
    );

    const rides = activities.filter((a) => isCycling(a.type));
    const ef = monthlyAverage(rides, (a) => a.efficiencyFactor, rangeStart, now);
    const decoupling = monthlyAverage(rides.filter((a) => a.movingTime >= 3600), (a) => a.decoupling, rangeStart, now);
    const npMonthly = monthlyAverage(rides, (a) => a.normalizedPower, rangeStart, now);
    const trend = ef.map((m, i) => ({ label: m.label, ef: m.value, decoupling: decoupling[i]?.value ?? null, np: npMonthly[i]?.value ?? null }));

    return { ytd, ytdPrev, ctlNow, ctlPrev, eftpNow, eftpPrev, yoy, ftpSeries, trend, thisYear };
  }, [activities, wellness, rangeStart]);

  if (loading && !athlete) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const hasEftp = view.ftpSeries.some((r) => r.eftp != null || r.ftp != null);

  return (
    <div className="space-y-6">
      <PageHeader title="Development" subtitle={`Ontwikkeling op lange termijn · dit jaar vs. vorig jaar (t/m ${fmtDate(toIsoDate(today()), 'd MMM')})`} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <KpiCard label="Trainingsuren YTD" value={fmtHours(view.ytd.movingTime)} icon={Clock} delta={delta(view.ytd.movingTime, view.ytdPrev.movingTime)} sub={`vorig jaar ${fmtHours(view.ytdPrev.movingTime)}`} />
        <KpiCard label="Afstand YTD" value={fmtKm(view.ytd.distance)} icon={Route} delta={delta(view.ytd.distance, view.ytdPrev.distance)} sub={`vorig jaar ${fmtKm(view.ytdPrev.distance)}`} />
        <KpiCard label="Hoogtemeters YTD" value={`${fmtInt(view.ytd.elevation)} m`} icon={Mountain} delta={delta(view.ytd.elevation, view.ytdPrev.elevation)} sub={`vorig jaar ${fmtInt(view.ytdPrev.elevation)} m`} />
        <KpiCard label="Fitness (CTL)" value={fmt1(view.ctlNow)} icon={TrendingUp} delta={delta(view.ctlNow, view.ctlPrev, '', false)} sub={view.ctlPrev != null ? `een jaar geleden ${fmt1(view.ctlPrev)}` : undefined} />
        <KpiCard label="eFTP" value={view.eftpNow ? `${fmtInt(view.eftpNow)} W` : '–'} icon={Zap} delta={delta(view.eftpNow, view.eftpPrev, ' W', false)} sub={view.eftpPrev ? `een jaar geleden ${fmtInt(view.eftpPrev)} W` : undefined} />
        <KpiCard label="Training load YTD" value={fmtInt(view.ytd.load)} icon={Gauge} delta={delta(view.ytd.load, view.ytdPrev.load)} sub={`vorig jaar ${fmtInt(view.ytdPrev.load)}`} />
      </div>

      <Card title="FTP-ontwikkeling" subtitle="eFTP (schatting van Intervals.icu) en de FTP die bij je ritten was ingesteld">
        {!hasEftp ? (
          <EmptyState label="Geen FTP-data beschikbaar" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={view.ftpSeries}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => fmtDate(d, 'MMM yy')} minTickGap={40} />
              <YAxis yAxisId="w" {...axisProps} width={44} domain={['auto', 'auto']} />
              <YAxis yAxisId="k" orientation="right" {...axisProps} width={40} domain={['auto', 'auto']} tickFormatter={(v) => fmt1(v)} />
              <Tooltip {...tooltipProps} labelFormatter={(d) => fmtDate(d)} formatter={(v: number, n) => [n === 'W/kg' ? fmt2(v) : `${fmtInt(v)} W`, n]} />
              <Line yAxisId="w" type="monotone" dataKey="eftp" name="eFTP" stroke={COLORS.accent} strokeWidth={2} dot={false} connectNulls />
              <Line yAxisId="w" type="stepAfter" dataKey="ftp" name="Ingestelde FTP" stroke={COLORS.slate} strokeDasharray="4 3" dot={false} connectNulls />
              <Line yAxisId="k" type="monotone" dataKey="wkg" name="W/kg" stroke={COLORS.green} strokeWidth={1.5} dot={false} connectNulls />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Jaar-op-jaar volume" subtitle={`Trainingsuren per maand: ${view.thisYear} vs. ${view.thisYear - 1}`}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={view.yoy}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} width={36} tickFormatter={(v) => `${v}u`} />
            <Tooltip {...tooltipProps} formatter={(v: number, n) => [`${fmt1(v)} u`, n]} />
            <Bar dataKey="previous" name={String(view.thisYear - 1)} fill="#475569" radius={[3, 3, 0, 0]} />
            <Bar dataKey="current" name={String(view.thisYear)} fill={COLORS.accent} radius={[3, 3, 0, 0]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Aerobe efficiëntie" subtitle="Gemiddelde efficiency factor (NP / gem. HR) per maand, ritten">
          {view.trend.every((t) => t.ef == null) ? (
            <EmptyState label="Geen ritten met vermogen én hartslag" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={view.trend}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={40} domain={['auto', 'auto']} tickFormatter={(v) => fmt2(v)} />
                <Tooltip {...tooltipProps} formatter={(v: number) => [fmt2(v), 'EF']} />
                <Line type="monotone" dataKey="ef" stroke={COLORS.green} strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Aerobe decoupling" subtitle="Gemiddelde Pw:HR-decoupling per maand, ritten ≥ 1 uur (lager = stabieler)">
          {view.trend.every((t) => t.decoupling == null) ? (
            <EmptyState label="Geen decouplingdata" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={view.trend}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={40} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...tooltipProps} formatter={(v: number) => [`${fmt1(v)}%`, 'Decoupling']} />
                <Line type="monotone" dataKey="decoupling" stroke={COLORS.atl} strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card title="Gemiddelde normalized power per maand" subtitle="Ritten met vermogensmeting">
        {view.trend.every((t) => t.np == null) ? (
          <EmptyState label="Geen ritten met vermogen" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={view.trend}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={44} domain={[0, 'auto']} />
              <Tooltip {...tooltipProps} formatter={(v: number) => [`${fmtInt(v)} W`, 'Gem. NP']} />
              <Bar dataKey="np" fill={COLORS.ctl} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
