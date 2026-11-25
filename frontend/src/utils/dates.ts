import { addDays, format, startOfISOWeek, startOfMonth, startOfYear, subDays } from 'date-fns';

/** Intervals.icu levert lokale tijden zonder tijdzone; die als lokale tijd interpreteren. */
export function parseLocal(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export const toIsoDate = (d: Date) => format(d, 'yyyy-MM-dd');
export const dayKey = (iso: string) => iso.slice(0, 10);

export const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const weekStart = (d: Date) => startOfISOWeek(d);

export type PeriodKey = '4w' | '12w' | '6m' | '1y' | 'ytd';

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '4w', label: '4 weken' },
  { key: '12w', label: '12 weken' },
  { key: '6m', label: '6 maanden' },
  { key: 'ytd', label: 'Dit jaar' },
  { key: '1y', label: '12 maanden' },
];

/** Begindatum (inclusief) van een periode t.o.v. vandaag. */
export function periodStart(key: PeriodKey, ref = today()): Date {
  switch (key) {
    case '4w':
      return subDays(ref, 27);
    case '12w':
      return subDays(ref, 83);
    case '6m':
      return subDays(ref, 182);
    case '1y':
      return subDays(ref, 364);
    case 'ytd':
      return startOfYear(ref);
  }
}

export { addDays, startOfMonth, startOfYear, subDays };
