import { addDays, addMonths, differenceInCalendarDays, format, startOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Activity, WellnessDay } from '../types/api';
import { GROUP_ORDER, sportGroupOf, type SportGroup } from '../data/sports';
import { dayKey, parseLocal, toIsoDate, weekStart } from './dates';

export interface Totals {
  count: number;
  movingTime: number;
  distance: number;
  elevation: number;
  load: number;
  kilojoules: number;
}

export function totals(acts: Activity[]): Totals {
  const t: Totals = { count: 0, movingTime: 0, distance: 0, elevation: 0, load: 0, kilojoules: 0 };
  for (const a of acts) {
    t.count += 1;
    t.movingTime += a.movingTime;
    t.distance += a.distance;
    t.elevation += a.elevationGain;
    t.load += a.trainingLoad ?? 0;
    t.kilojoules += a.kilojoules ?? 0;
  }
  return t;
}

/** Activiteiten met datum in [start, end) — end exclusief. */
export function inRange(acts: Activity[], start: Date, end?: Date): Activity[] {
  const s = toIsoDate(start);
  const e = end ? toIsoDate(end) : '9999-12-31';
  return acts.filter((a) => {
    const d = dayKey(a.date);
    return d >= s && d < e;
  });
}

export interface Bucket extends Totals {
  key: string;
  label: string;
  start: Date;
  hours: number;
  hoursByGroup: Record<SportGroup, number>;
}

function emptyBucket(key: string, label: string, start: Date): Bucket {
  return {
    key,
    label,
    start,
    count: 0,
    movingTime: 0,
    distance: 0,
    elevation: 0,
    load: 0,
    kilojoules: 0,
    hours: 0,
    hoursByGroup: Object.fromEntries(GROUP_ORDER.map((g) => [g, 0])) as Record<SportGroup, number>,
  };
}

function addToBucket(b: Bucket, a: Activity) {
  b.count += 1;
  b.movingTime += a.movingTime;
  b.distance += a.distance;
  b.elevation += a.elevationGain;
  b.load += a.trainingLoad ?? 0;
  b.kilojoules += a.kilojoules ?? 0;
  b.hours = b.movingTime / 3600;
  b.hoursByGroup[sportGroupOf(a.type)] += a.movingTime / 3600;
}

/** Weekbuckets (ISO-week, maandag) vanaf `from` t/m de week van `to`, ook lege weken. */
export function weeklyBuckets(acts: Activity[], from: Date, to: Date): Bucket[] {
  const buckets = new Map<string, Bucket>();
  for (let d = weekStart(from); d <= to; d = addDays(d, 7)) {
    const key = toIsoDate(d);
    buckets.set(key, emptyBucket(key, format(d, 'd MMM', { locale: nl }), d));
  }
  for (const a of acts) {
    const b = buckets.get(toIsoDate(weekStart(parseLocal(a.date))));
    if (b) addToBucket(b, a);
  }
  return [...buckets.values()];
}

/** Maandbuckets vanaf `from` t/m de maand van `to`. */
export function monthlyBuckets(acts: Activity[], from: Date, to: Date): Bucket[] {
  const buckets = new Map<string, Bucket>();
  for (let d = startOfMonth(from); d <= to; d = addMonths(d, 1)) {
    const key = format(d, 'yyyy-MM');
    buckets.set(key, emptyBucket(key, format(d, 'MMM yy', { locale: nl }), d));
  }
  for (const a of acts) {
    const b = buckets.get(a.date.slice(0, 7));
    if (b) addToBucket(b, a);
  }
  return [...buckets.values()];
}

export function distributionByGroup(acts: Activity[]) {
  const map = new Map<SportGroup, { group: SportGroup; hours: number; count: number; load: number }>();
  for (const a of acts) {
    const g = sportGroupOf(a.type);
    const e = map.get(g) ?? { group: g, hours: 0, count: 0, load: 0 };
    e.hours += a.movingTime / 3600;
    e.count += 1;
    e.load += a.trainingLoad ?? 0;
    map.set(g, e);
  }
  return GROUP_ORDER.map((g) => map.get(g)).filter((x): x is NonNullable<typeof x> => !!x && x.hours > 0);
}

/** Totale tijd per vermogenszone (id's zoals Intervals.icu ze levert: Z1..Z7, SS). */
export function powerZoneTotals(acts: Activity[]): { id: string; secs: number }[] {
  const map = new Map<string, number>();
  for (const a of acts) for (const z of a.powerZoneTimes) map.set(z.id, (map.get(z.id) ?? 0) + z.secs);
  return [...map.entries()].map(([id, secs]) => ({ id, secs }));
}

/** Totale tijd per hartslagzone (index = zone). */
export function hrZoneTotals(acts: Activity[]): number[] {
  const out: number[] = [];
  for (const a of acts) a.hrZoneTimes.forEach((s, i) => (out[i] = (out[i] ?? 0) + s));
  return out.map((v) => v ?? 0);
}

/** Gemiddelde van een veld per maand, alleen activiteiten met een waarde. */
export function monthlyAverage(acts: Activity[], pick: (a: Activity) => number | null, from: Date, to: Date) {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const a of acts) {
    const v = pick(a);
    if (v == null) continue;
    const k = a.date.slice(0, 7);
    const e = sums.get(k) ?? { sum: 0, n: 0 };
    e.sum += v;
    e.n += 1;
    sums.set(k, e);
  }
  const out: { key: string; label: string; value: number | null; n: number }[] = [];
  for (let d = startOfMonth(from); d <= to; d = addMonths(d, 1)) {
    const key = format(d, 'yyyy-MM');
    const e = sums.get(key);
    out.push({ key, label: format(d, 'MMM yy', { locale: nl }), value: e ? e.sum / e.n : null, n: e?.n ?? 0 });
  }
  return out;
}

/** Wellness-record op of vlak vóór een datum (wellness bevat CTL/ATL per dag). */
export function wellnessAt(wellness: WellnessDay[], date: Date): WellnessDay | null {
  const key = toIsoDate(date);
  let found: WellnessDay | null = null;
  for (const w of wellness) {
    if (w.date <= key) found = w;
    else break;
  }
  return found;
}

/** Laatst bekende eFTP voor fietsen uit wellness.sportInfo, op of vóór een datum. */
export function eftpAt(wellness: WellnessDay[], date: Date, sport = 'Ride'): number | null {
  const key = toIsoDate(date);
  let v: number | null = null;
  for (const w of wellness) {
    if (w.date > key) break;
    if (w.eftpBySport[sport] != null) v = w.eftpBySport[sport];
  }
  return v;
}

export function latest<T>(rows: T[], pick: (r: T) => number | null): { row: T; value: number } | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = pick(rows[i]);
    if (v != null) return { row: rows[i], value: v };
  }
  return null;
}

/** Dunt een dagreeks uit tot maximaal ~n punten, voor snellere grafieken. */
export function thin<T>(rows: T[], n = 400): T[] {
  if (rows.length <= n) return rows;
  const step = Math.ceil(rows.length / n);
  return rows.filter((_, i) => i % step === 0 || i === rows.length - 1);
}

export const daysBetween = (a: Date, b: Date) => differenceInCalendarDays(b, a);
