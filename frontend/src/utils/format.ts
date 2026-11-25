import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { parseLocal } from './dates';

const nf0 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export const DASH = '–';

export const fmtInt = (v: number | null | undefined) => (v == null ? DASH : nf0.format(v));
export const fmt1 = (v: number | null | undefined) => (v == null ? DASH : nf1.format(v));
export const fmt2 = (v: number | null | undefined) => (v == null ? DASH : nf2.format(v));

/** Seconden → "3u 24m" of "42m". */
export function fmtDuration(secs: number | null | undefined): string {
  if (secs == null) return DASH;
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}u ${String(m).padStart(2, '0')}m`;
}

export const fmtHours = (secs: number) => `${fmt1(secs / 3600)} u`;
export const fmtKm = (meters: number | null | undefined) => (meters == null ? DASH : `${fmt1(meters / 1000)} km`);
export const fmtSpeed = (ms: number | null | undefined) => (ms == null ? DASH : `${fmt1(ms * 3.6)} km/u`);

/** Seconden → korte duurnotatie voor vermogensduren: 5s, 1m, 20m, 1u. */
export function fmtEffortDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return secs % 60 === 0 ? `${secs / 60}m` : `${Math.floor(secs / 60)}m${secs % 60}s`;
  const h = secs / 3600;
  return Number.isInteger(h) ? `${h}u` : `${fmt1(h)}u`;
}

export const fmtDate = (iso: string, pattern = 'd MMM yyyy') => format(parseLocal(iso), pattern, { locale: nl });

export function fmtDelta(current: number | null, previous: number | null, digits = 0): string | null {
  if (current == null || previous == null) return null;
  const d = current - previous;
  const s = digits === 0 ? nf0.format(Math.abs(d)) : nf1.format(Math.abs(d));
  return `${d >= 0 ? '+' : '−'}${s}`;
}

export function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
