import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { startOfYear, subYears } from 'date-fns';
import { api } from '../services/api';
import type { Activity, Athlete, SportProfile, WellnessDay } from '../types/api';
import { isCycling } from '../data/sports';
import { today, toIsoDate } from '../utils/dates';
import { useSettings } from './useSettings';

interface DataState {
  loading: boolean;
  error: string | null;
  athlete: Athlete | null;
  /** Alle opgehaalde activiteiten, ongeacht sport. */
  allActivities: Activity[];
  /** Activiteiten binnen de gekozen sportscope (instellingen). */
  activities: Activity[];
  wellness: WellnessDay[];
  /** Sportinstellingen voor fietsen (FTP, zones). */
  cyclingProfile: SportProfile | null;
  rangeStart: Date;
  /** Activiteiten die de API niet levert (via Strava geïmporteerd). */
  unavailableCount: number;
  loadedAt: Date | null;
  reload: () => void;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [allActivities, setActivities] = useState<Activity[]>([]);
  const [wellness, setWellness] = useState<WellnessDay[]>([]);
  const [unavailableCount, setUnavailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);

  const rangeStart = useMemo(
    () => startOfYear(subYears(today(), settings.historyYears)),
    [settings.historyYears],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const oldest = toIsoDate(rangeStart);
    const newest = toIsoDate(today());
    Promise.all([api.athlete(), api.activities(oldest, newest), api.wellness(oldest, newest)])
      .then(([a, acts, w]) => {
        if (cancelled) return;
        setAthlete(a);
        setActivities(acts.activities);
        setUnavailable(acts.unavailable);
        setWellness(w);
        setLoadedAt(new Date());
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [rangeStart, nonce]);

  const activities = useMemo(
    () => (settings.sportScope === 'cycling' ? allActivities.filter((a) => isCycling(a.type)) : allActivities),
    [allActivities, settings.sportScope],
  );

  const cyclingProfile = useMemo(
    () => athlete?.sports.find((s) => s.types.includes('Ride')) ?? athlete?.sports.find((s) => s.types.some(isCycling)) ?? null,
    [athlete],
  );

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const value: DataState = {
    loading,
    error,
    athlete,
    allActivities,
    activities,
    wellness,
    cyclingProfile,
    rangeStart,
    unavailableCount,
    loadedAt,
    reload,
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDashboardData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDashboardData buiten DataProvider');
  return ctx;
}
