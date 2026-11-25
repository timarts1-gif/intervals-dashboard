import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAsync } from '../hooks/useAsync';
import { api } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Segmented } from '../components/Segmented';
import { ZoneChart } from '../components/ZoneChart';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { axisProps, COLORS, gridProps, tooltipProps } from '../components/chartTheme';
import { inRange } from '../utils/aggregate';
import { addDays, PERIODS, periodStart, today, type PeriodKey } from '../utils/dates';
import { fmt2, fmtDate, fmtEffortDuration, fmtInt } from '../utils/format';
import { powerZoneRows } from '../utils/zones';
import { isCycling } from '../data/sports';
import type { PowerCurve, PowerCurvePoint } from '../types/api';

const KEY_DURATIONS = [5, 15, 30, 60, 120, 300, 480, 1200, 1800, 3600];
const CURVE_COLORS = [COLORS.accent, COLORS.ctl, COLORS.violet, COLORS.green];

/** Reduceert een curve (vaak een punt per seconde) tot ~120 log-verdeelde punten. */
function downsample(points: PowerCurvePoint[], n = 120): PowerCurvePoint[] {
  const valid = points.filter((p) => p.watts != null && p.secs > 0);
  if (valid.length <= n) return valid;
  const max = valid[valid.length - 1].secs;
  const out: PowerCurvePoint[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = Math.exp((Math.log(max) * i) / (n - 1));
    while (j < valid.length - 1 && valid[j].secs < target) j++;
    if (out[out.length - 1] !== valid[j]) out.push(valid[j]);
  }
  return out;
}

function pointAt(curve: PowerCurve, secs: number): PowerCurvePoint | null {
  return curve.points.find((p) => p.secs === secs && p.watts != null) ?? null;
}

export function PowerAnalysis() {
  const { loading, error, activities, cyclingProfile, athlete } = useDashboardData();
  const curves = useAsync(() => api.powerCurves('Ride'), []);
  const [period, setPeriod] = useState<PeriodKey>('12w');

  const weight = athlete?.weight ?? null;
  const ftp = cyclingProfile?.ftp ?? null;

  const chart = useMemo(() => {
    if (!curves.data?.length) return null;
    const merged = new Map<number, Record<string, number>>();
    curves.data.forEach((c, ci) => {
      for (const p of downsample(c.points)) {
        const row = merged.get(p.secs) ?? { secs: p.secs };
        row[`c${ci}`] = p.watts as number;
        merged.set(p.secs, row);
      }
    });
    return [...merged.values()].sort((a, b) => a.secs - b.secs);
  }, [curves.data]);

  const rides = useMemo(() => {
    const now = today();
    return inRange(activities.filter((a) => isCycling(a.type)), periodStart(period, now), addDays(now, 1));
  }, [activities, period]);

  const scatter = rides
    .filter((a) => a.normalizedPower != null && a.intensityFactor != null)
    .map((a) => ({ date: a.date, name: a.name, np: a.normalizedPower, if: a.intensityFactor, mins: a.movingTime / 60 }));

  if (loading && !athlete) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const main = curves.data?.[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader title="Power Analysis" subtitle="Vermogenscurve, beste prestaties en intensiteit van je ritten" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Mini label="FTP (instelling)" value={ftp ? `${ftp} W` : '–'} sub={ftp && weight ? `${fmt2(ftp / weight)} W/kg` : undefined} />
        <Mini label="W′ (instelling)" value={cyclingProfile?.wPrime ? `${fmtInt(cyclingProfile.wPrime / 1000)} kJ` : '–'} />
        <Mini label="Pmax (instelling)" value={cyclingProfile?.pMax ? `${cyclingProfile.pMax} W` : '–'} />
        <Mini label="Gewicht" value={weight ? `${fmt2(weight)} kg` : '–'} />
      </div>

      <Card title="Vermogenscurve" subtitle={main ? `${main.label}${main.start ? ` · ${fmtDate(main.start)} – ${main.end ? fmtDate(main.end) : 'nu'}` : ''}` : 'Beste gemiddelde vermogen per duur (fietsen)'}>
        {curves.loading ? (
          <LoadingState label="Vermogenscurve laden…" />
        ) : curves.error ? (
          <ErrorState message={curves.error} />
        ) : !chart?.length ? (
          <EmptyState label="Geen vermogensdata gevonden" />
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chart}>
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="secs"
                type="number"
                scale="log"
                domain={['dataMin', 'dataMax']}
                ticks={[1, 5, 15, 30, 60, 120, 300, 600, 1200, 3600, 7200, 14400].filter((t) => t <= (chart.at(-1)?.secs ?? 0))}
                tickFormatter={fmtEffortDuration}
                {...axisProps}
              />
              <YAxis {...axisProps} width={44} tickFormatter={(v) => `${v}`} />
              <Tooltip {...tooltipProps} labelFormatter={(s) => fmtEffortDuration(Number(s))} formatter={(v: number, n) => [`${fmtInt(v)} W${weight ? ` · ${fmt2(v / weight)} W/kg` : ''}`, n]} />
              {curves.data!.map((c, i) => (
                <Line key={c.id} dataKey={`c${i}`} name={c.label} stroke={CURVE_COLORS[i % CURVE_COLORS.length]} strokeWidth={2} dot={false} connectNulls />
              ))}
              {curves.data!.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card title="Beste prestaties" subtitle="Uit de vermogenscurve" className="xl:col-span-2">
          {!main ? (
            <EmptyState label="Geen curve" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 text-left font-medium">Duur</th>
                  <th className="py-2 text-right font-medium">Watt</th>
                  <th className="py-2 text-right font-medium">W/kg</th>
                  <th className="py-2 text-right font-medium">% FTP</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {KEY_DURATIONS.map((d) => {
                  const p = pointAt(main, d);
                  if (!p) return null;
                  const wkg = p.wkg ?? (weight ? (p.watts as number) / weight : null);
                  return (
                    <tr key={d} className="border-b border-surface-border/60 last:border-0">
                      <td className="py-2 text-slate-300">{fmtEffortDuration(d)}</td>
                      <td className="py-2 text-right font-medium tabular-nums text-white">{fmtInt(p.watts)} W</td>
                      <td className="py-2 text-right tabular-nums text-slate-300">{fmt2(wkg)}</td>
                      <td className="py-2 text-right tabular-nums text-slate-400">{ftp ? `${fmtInt(((p.watts as number) / ftp) * 100)}%` : '–'}</td>
                      <td className="py-2 text-right">
                        {p.activityId && (
                          <a href={`https://intervals.icu/activities/${p.activityId}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-accent" title="Activiteit openen">
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card
          title="Intensiteit per rit"
          subtitle="Normalized power vs. intensity factor; grootte = duur"
          className="xl:col-span-3"
          action={<Segmented options={PERIODS} value={period} onChange={setPeriod} />}
        >
          {scatter.length === 0 ? (
            <EmptyState label="Geen ritten met vermogen in deze periode" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 8, right: 8 }}>
                <CartesianGrid {...gridProps} vertical />
                <XAxis type="number" dataKey="if" name="IF" domain={['auto', 'auto']} {...axisProps} tickFormatter={(v) => fmt2(v)} />
                <YAxis type="number" dataKey="np" name="NP" unit=" W" domain={['auto', 'auto']} {...axisProps} width={56} />
                <ZAxis type="number" dataKey="mins" range={[20, 220]} name="Duur" />
                <Tooltip
                  {...tooltipProps}
                  content={({ payload }) => {
                    const d = payload?.[0]?.payload;
                    if (!d) return null;
                    return (
                      <div style={tooltipProps.contentStyle}>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-slate-400">{fmtDate(d.date)}</div>
                        <div>NP {d.np} W · IF {fmt2(d.if)} · {fmtInt(d.mins)} min</div>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatter} fill={COLORS.accent} fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card title="Tijd in vermogenszones" subtitle={`Ritten in de geselecteerde periode (${PERIODS.find((p) => p.key === period)?.label})`}>
        <ZoneChart rows={powerZoneRows(rides, cyclingProfile, true)} height={260} />
      </Card>
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-semibold tabular-nums text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
