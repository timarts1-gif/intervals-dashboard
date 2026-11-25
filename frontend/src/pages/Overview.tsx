import { useMemo } from 'react';
import { subDays, subWeeks, subYears, startOfMonth, startOfYear } from 'date-fns';
import { Bike, CalendarDays, Clock, Flame, Gauge, Mountain, Route, Timer, Zap } from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDashboardData } from '../hooks/useDashboardData';
import { useSettings } from '../hooks/useSettings';
import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { Card } from '../components/Card';
import { ActivityTable } from '../components/ActivityTable';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { axisProps, COLORS, gridProps, tooltipProps } from '../components/chartTheme';
import { GROUP_ORDER, SPORT_GROUPS } from '../data/sports';
import {
  distributionByGroup,
  eftpAt,
  inRange,
  monthlyAverage,
  thin,
  totals,
  weeklyBuckets,
  wellnessAt,
} from '../utils/aggregate';
import { addDays, today, toIsoDate, weekStart } from '../utils/dates';
import { fmt1, fmt2, fmtDate, fmtHours, fmtInt, fmtKm, pctChange } from '../utils/format';

function deltaPct(cur: number, prev: number) {
  const p = pctChange(cur, prev);
  if (p == null) return null;
  return { text: `${p >= 0 ? '+' : '−'}${Math.abs(Math.round(p))}%`, positive: p >= 0 };
}

export function Overview() {
  const { loading, error, activities, wellness, cyclingProfile, athlete } = useDashboardData();
  const { settings } = useSettings();

  const data = useMemo(() => {
    const now = today();
    const tomorrow = addDays(now, 1);
    const wk = weekStart(now);
    const week = totals(inRange(activities, wk, tomorrow));
    const prevWeek = totals(inRange(activities, subWeeks(wk, 1), subDays(tomorrow, 7)));
    const month = totals(inRange(activities, startOfMonth(now), tomorrow));
    const ytd = totals(inRange(activities, startOfYear(now), tomorrow));
    const ytdPrev = totals(inRange(activities, startOfYear(subYears(now, 1)), addDays(subYears(now, 1), 1)));

    const last12w = weeklyBuckets(inRange(activities, subWeeks(wk, 11), tomorrow), subWeeks(wk, 11), now);
    const distribution = distributionByGroup(inRange(activities, subDays(now, 89), tomorrow));
    const recent = [...activities].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

    const wellnessRecent = thin(wellness.filter((w) => w.date >= toIsoDate(subDays(now, 180))), 200);
    const current = wellnessAt(wellness, now);
    const eftpNow = eftpAt(wellness, now);
    const eftp4w = eftpAt(wellness, subDays(now, 28));
    const ctl4w = wellnessAt(wellness, subDays(now, 28));

    const kpiTrend = monthlyAverage(
      activities,
      (a) => a.efficiencyFactor,
      subDays(startOfMonth(now), 330),
      now,
    ).map((m, i, arr) => {
      const monthEnd = i + 1 < arr.length ? subDays(new Date(`${arr[i + 1].key}-01T00:00:00`), 1) : now;
      return {
        label: m.label,
        ef: m.value,
        ctl: wellnessAt(wellness, monthEnd)?.ctl ?? null,
        eftp: eftpAt(wellness, monthEnd),
      };
    });

    return { week, prevWeek, month, ytd, ytdPrev, last12w, distribution, recent, wellnessRecent, current, eftpNow, eftp4w, ctl4w, kpiTrend };
  }, [activities, wellness]);

  if (loading && !athlete) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const ftp = cyclingProfile?.ftp ?? null;
  const weight = athlete?.weight ?? null;
  const scopeLabel = settings.sportScope === 'cycling' ? 'fietsactiviteiten' : 'alle sporten';

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" subtitle={`Samenvatting van je training (${scopeLabel})`} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Uren deze week"
          value={fmtHours(data.week.movingTime)}
          icon={Clock}
          delta={deltaPct(data.week.movingTime, data.prevWeek.movingTime)}
          sub="vs. vorige week t/m zelfde dag"
        />
        <KpiCard label="Uren deze maand" value={fmtHours(data.month.movingTime)} icon={CalendarDays} sub={`${data.month.count} trainingen`} />
        <KpiCard
          label="Uren dit jaar"
          value={fmtHours(data.ytd.movingTime)}
          icon={Timer}
          delta={deltaPct(data.ytd.movingTime, data.ytdPrev.movingTime)}
          sub="vs. vorig jaar t/m zelfde datum"
        />
        <KpiCard
          label="Afstand dit jaar"
          value={fmtKm(data.ytd.distance)}
          icon={Route}
          delta={deltaPct(data.ytd.distance, data.ytdPrev.distance)}
          sub={`deze week ${fmtKm(data.week.distance)}`}
        />
        <KpiCard
          label="Hoogtemeters dit jaar"
          value={`${fmtInt(data.ytd.elevation)} m`}
          icon={Mountain}
          delta={deltaPct(data.ytd.elevation, data.ytdPrev.elevation)}
          sub={`deze week ${fmtInt(data.week.elevation)} m`}
        />
        <KpiCard
          label="Trainingen dit jaar"
          value={fmtInt(data.ytd.count)}
          icon={Bike}
          sub={`deze week ${data.week.count} · maand ${data.month.count}`}
        />
        <KpiCard
          label="FTP"
          value={ftp ? `${ftp} W` : '–'}
          icon={Zap}
          sub={[
            data.eftpNow ? `eFTP ${Math.round(data.eftpNow)} W` : null,
            ftp && weight ? `${fmt2(ftp / weight)} W/kg` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <KpiCard
          label="Trainingsbelasting week"
          value={fmtInt(data.week.load)}
          icon={Flame}
          delta={deltaPct(data.week.load, data.prevWeek.load)}
          sub={data.current?.ctl != null ? `Fitness (CTL) ${fmt1(data.current.ctl)}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Trainingsvolume per week" subtitle="Uren per sport, laatste 12 weken" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.last12w}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={36} tickFormatter={(v) => `${v}u`} />
              <Tooltip {...tooltipProps} formatter={(v: number, name) => [`${fmt1(v)} u`, name]} />
              {GROUP_ORDER.filter((g) => data.last12w.some((b) => b.hoursByGroup[g] > 0)).map((g) => (
                <Bar key={g} dataKey={`hoursByGroup.${g}`} name={SPORT_GROUPS[g].label} stackId="h" fill={SPORT_GROUPS[g].color} />
              ))}
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Trainingsverdeling" subtitle="Uren per sport, laatste 90 dagen">
          {data.distribution.length === 0 ? (
            <EmptyState label="Geen trainingen" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.distribution} dataKey="hours" nameKey="group" innerRadius={55} outerRadius={85} paddingAngle={data.distribution.length > 1 ? 2 : 0} stroke="none">
                    {data.distribution.map((d) => (
                      <Cell key={d.group} fill={SPORT_GROUPS[d.group].color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipProps} formatter={(v: number, _n, item) => [`${fmt1(v)} u`, SPORT_GROUPS[item.payload.group as keyof typeof SPORT_GROUPS].label]} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1.5 text-sm">
                {data.distribution.map((d) => (
                  <li key={d.group} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SPORT_GROUPS[d.group].color }} />
                      {SPORT_GROUPS[d.group].label}
                    </span>
                    <span className="tabular-nums text-slate-400">
                      {fmt1(d.hours)} u · {d.count}×
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Trainingsbelasting over tijd" subtitle="Fitness (CTL), vermoeidheid (ATL) en vorm (TSB), laatste 6 maanden">
          {data.wellnessRecent.length === 0 ? (
            <EmptyState label="Geen fitnessdata" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={data.wellnessRecent}>
                <defs>
                  <linearGradient id="ctlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.ctl} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COLORS.ctl} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => fmtDate(d, 'd MMM')} minTickGap={40} />
                <YAxis {...axisProps} width={36} />
                <Tooltip {...tooltipProps} labelFormatter={(d) => fmtDate(d)} formatter={(v: number, n) => [fmt1(v), n]} />
                <Area type="monotone" dataKey="ctl" name="Fitness (CTL)" stroke={COLORS.ctl} fill="url(#ctlFill)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="atl" name="Vermoeidheid (ATL)" stroke={COLORS.atl} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="tsb" name="Vorm (TSB)" stroke={COLORS.tsb} strokeWidth={1.5} dot={false} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Ontwikkeling prestatie-indicatoren" subtitle="Eind van elke maand: CTL en eFTP; gemiddelde efficiency factor (NP/HR)">
          <div className="mb-3 grid grid-cols-3 gap-3 text-center">
            <Indicator label="CTL" now={data.current?.ctl ?? null} before={data.ctl4w?.ctl ?? null} />
            <Indicator label="eFTP" now={data.eftpNow} before={data.eftp4w} unit=" W" />
            <Indicator label="W/kg" now={data.eftpNow && weight ? data.eftpNow / weight : null} before={data.eftp4w && weight ? data.eftp4w / weight : null} digits={2} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.kpiTrend}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis yAxisId="l" {...axisProps} width={36} />
              <YAxis yAxisId="r" orientation="right" {...axisProps} width={40} domain={['auto', 'auto']} />
              <Tooltip {...tooltipProps} formatter={(v: number, n) => [n === 'EF' ? fmt2(v) : fmt1(v), n]} />
              <Line yAxisId="l" type="monotone" dataKey="ctl" name="CTL" stroke={COLORS.ctl} strokeWidth={2} dot={false} connectNulls />
              <Line yAxisId="r" type="monotone" dataKey="eftp" name="eFTP" stroke={COLORS.accent} strokeWidth={2} dot={false} connectNulls />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-slate-500">Veranderingen t.o.v. 4 weken geleden.</p>
        </Card>
      </div>

      <Card title="Recente trainingen" subtitle="Laatste 8 activiteiten">
        <ActivityTable activities={data.recent} compact />
      </Card>

      <p className="text-xs text-slate-500">
        <Gauge size={12} className="mr-1 inline" />
        Bron: Intervals.icu. CTL/ATL/TSB en eFTP zijn de waarden die Intervals.icu zelf berekent.
      </p>
    </div>
  );
}

function Indicator({ label, now, before, unit = '', digits = 0 }: { label: string; now: number | null; before: number | null; unit?: string; digits?: number }) {
  const d = now != null && before != null ? now - before : null;
  const f = (v: number) => (digits === 2 ? fmt2(v) : digits === 1 ? fmt1(v) : fmtInt(v));
  return (
    <div className="rounded-lg bg-surface-raised px-2 py-2.5">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-white">{now != null ? `${f(now)}${unit}` : '–'}</div>
      {d != null && (
        <div className={`text-xs tabular-nums ${d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {d >= 0 ? '+' : '−'}
          {f(Math.abs(d))}
          {unit}
        </div>
      )}
    </div>
  );
}
