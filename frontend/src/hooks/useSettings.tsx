import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type SportScope = 'cycling' | 'all';

export interface Settings {
  /** Welke activiteiten meetellen in KPI's en grafieken. */
  sportScope: SportScope;
  /** Hoeveel kalenderjaren terug data wordt opgehaald (huidig jaar = 0). */
  historyYears: number;
}

const DEFAULTS: Settings = { sportScope: 'cycling', historyYears: 1 };
const STORAGE_KEY = 'intervals-dashboard.settings';

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* opslag niet beschikbaar: alleen in geheugen */
      }
      return next;
    });
  }, []);
  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings buiten SettingsProvider');
  return ctx;
}
