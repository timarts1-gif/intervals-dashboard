import type { AppConfig } from '../config/env.js';
import type { IntervalsClient } from './intervalsClient.js';
import type { IntervalsWellness } from '../types/intervals.js';
import { TtlCache } from './cache.js';

/**
 * Coachoverzicht: per gecoachte atleet CTL/ATL/Form over 28 dagen.
 *
 * Bron: wellness (velden ctl, atl, rampRate, atlLoad). atlLoad wordt in de API-spec niet
 * omschreven; getest (117 dagen) is dat het gelijk is aan de som van icu_training_load per dag.
 * Het is ook beschikbaar als activiteiten via Strava binnenkwamen (die levert /activities niet).
 */

export const WELLNESS_FIELDS = ['id', 'ctl', 'atl', 'rampRate', 'atlLoad'];
export const DAYS = 28;

/** Whitelist: exact deze velden gaan naar de browser. */
export interface CoachSeriesPoint {
  date: string;
  ctl: number | null;
  atl: number | null;
  form: number | null;
}

export interface CoachAthlete {
  name: string;
  ctl: number | null;
  atl: number | null;
  form: number | null;
  rampRate: number | null;
  /** Load per blok van 7 dagen, oudste eerst; laatste blok eindigt vandaag. */
  weeklyLoad: number[];
  ctlChange28: number | null;
  atlChange28: number | null;
  formChange28: number | null;
  /** Laatste dag met CTL-data. */
  lastDataDate: string | null;
  series: CoachSeriesPoint[];
}

export interface CoachOverview {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  athletes: CoachAthlete[];
}

const r1 = (v: number | null | undefined): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : null;

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function buildAthlete(name: string, rows: IntervalsWellness[], today: Date): CoachAthlete {
  const start = isoDate(addDays(today, -DAYS));
  const byDate = new Map(rows.map((w) => [w.id, w]));

  const series: CoachSeriesPoint[] = [];
  for (let i = DAYS; i >= 0; i--) {
    const date = isoDate(addDays(today, -i));
    const w = byDate.get(date);
    const ctl = r1(w?.ctl);
    const atl = r1(w?.atl);
    series.push({ date, ctl, atl, form: ctl !== null && atl !== null ? r1((w!.ctl as number) - (w!.atl as number)) : null });
  }

  const withCtl = rows.filter((w) => typeof w.ctl === 'number').sort((a, b) => a.id.localeCompare(b.id));
  const last = withCtl.at(-1) ?? null;
  const base = byDate.get(start) ?? null;

  const val = (w: IntervalsWellness | null, f: 'ctl' | 'atl') => (w && typeof w[f] === 'number' ? (w[f] as number) : null);
  const form = (w: IntervalsWellness | null) => {
    const c = val(w, 'ctl');
    const a = val(w, 'atl');
    return c !== null && a !== null ? c - a : null;
  };
  const diff = (a: number | null, b: number | null) => (a !== null && b !== null ? r1(a - b) : null);

  // 4 rollende blokken van 7 dagen: [-27..-21], [-20..-14], [-13..-7], [-6..0]
  const weeklyLoad = [3, 2, 1, 0].map((block) => {
    let sum = 0;
    for (let d = block * 7 + 6; d >= block * 7; d--) {
      const w = byDate.get(isoDate(addDays(today, -d)));
      sum += typeof w?.atlLoad === 'number' ? w.atlLoad : 0;
    }
    return Math.round(sum);
  });

  return {
    name,
    ctl: r1(val(last, 'ctl')),
    atl: r1(val(last, 'atl')),
    form: r1(form(last)),
    rampRate: r1(last?.rampRate),
    weeklyLoad,
    ctlChange28: diff(val(last, 'ctl'), val(base, 'ctl')),
    atlChange28: diff(val(last, 'atl'), val(base, 'atl')),
    formChange28: diff(form(last), form(base)),
    lastDataDate: last?.id ?? null,
    series,
  };
}

export function createCoachService(config: AppConfig, intervals: IntervalsClient, now: () => Date = () => new Date()) {
  const cache = new TtlCache(config.coach.cacheTtlMs);

  async function load(): Promise<CoachOverview> {
    const today = now();
    today.setHours(0, 0, 0, 0);
    const oldest = isoDate(addDays(today, -DAYS));
    const newest = isoDate(today);

    const summary = await intervals.athleteSummary();
    const names = new Map<string, string>();
    for (const row of summary) if (row.athlete_id && row.athlete_name) names.set(row.athlete_id, row.athlete_name);

    const athletes = await Promise.all(
      config.coach.athleteIds.map(async (id) => {
        const rows = await intervals.listWellnessFields(id, oldest, newest, WELLNESS_FIELDS);
        return buildAthlete(names.get(id) ?? 'Onbekende atleet', rows, today);
      }),
    );

    return { generatedAt: now().toISOString(), periodStart: oldest, periodEnd: newest, athletes };
  }

  return {
    getOverview: () => cache.getOrSet('overview', load),
    clearCache: () => cache.clear(),
  };
}

export type CoachService = ReturnType<typeof createCoachService>;
