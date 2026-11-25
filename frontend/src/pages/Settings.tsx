import { useState } from 'react';
import { CheckCircle2, Database, RefreshCw, XCircle } from 'lucide-react';
import { useAsync } from '../hooks/useAsync';
import { useDashboardData } from '../hooks/useDashboardData';
import { useSettings, type SportScope } from '../hooks/useSettings';
import { api } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Segmented } from '../components/Segmented';
import { fmt1, fmtDate, fmtInt } from '../utils/format';
import { typeLabel } from '../data/sports';
import { toIsoDate } from '../utils/dates';

export function Settings() {
  const { settings, update } = useSettings();
  const { athlete, allActivities, wellness, rangeStart, reload, error, loadedAt } = useDashboardData();
  const [nonce, setNonce] = useState(0);
  const health = useAsync(() => api.health(), [nonce]);
  const [busy, setBusy] = useState(false);

  const clearAndReload = async () => {
    setBusy(true);
    try {
      await api.clearCache();
      reload();
      setNonce((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  const connected = !!health.data?.configured && !error;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Verbinding, weergave en je Intervals.icu-profiel" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Verbinding met Intervals.icu">
          <div className="space-y-3 text-sm">
            <Row label="Backend">
              {health.loading ? (
                '…'
              ) : health.error ? (
                <Status ok={false} text={health.error} />
              ) : (
                <Status ok text="Bereikbaar" />
              )}
            </Row>
            <Row label="API-key">
              {health.data ? <Status ok={health.data.configured} text={health.data.configured ? 'Ingesteld in backend/.env' : 'Ontbreekt'} /> : '–'}
            </Row>
            <Row label="Intervals.icu">{health.data?.configured ? <Status ok={connected} text={connected ? 'Verbonden' : error ?? 'Fout'} /> : '–'}</Row>
            <Row label="Athlete-ID">{athlete?.id ?? health.data?.athleteId ?? '–'}</Row>
            <Row label="Geladen periode">
              {fmtDate(toIsoDate(rangeStart))} – vandaag
            </Row>
            <Row label="Gegevens">
              {fmtInt(allActivities.length)} activiteiten · {fmtInt(wellness.length)} wellnessdagen
            </Row>
            <Row label="Laatst opgehaald">{loadedAt ? loadedAt.toLocaleString('nl-NL') : '–'}</Row>
          </div>
          <button
            onClick={clearAndReload}
            disabled={busy}
            className="mt-5 flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-soft disabled:opacity-50"
          >
            <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
            Cache legen en opnieuw ophalen
          </button>
          {!health.data?.configured && (
            <div className="mt-5 rounded-lg border border-surface-border bg-surface-raised p-4 text-xs leading-relaxed text-slate-400">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-slate-200">
                <Database size={13} /> Instellen
              </div>
              Kopieer <code className="text-slate-200">backend/.env.example</code> naar <code className="text-slate-200">backend/.env</code>, vul
              <code className="text-slate-200"> INTERVALS_API_KEY</code> in (Intervals.icu → Settings → Developer Settings) en herstart de backend.
            </div>
          )}
        </Card>

        <Card title="Weergave">
          <div className="space-y-5 text-sm">
            <div>
              <div className="mb-2 font-medium text-slate-200">Sporten in KPI's en grafieken</div>
              <Segmented<SportScope>
                options={[
                  { key: 'cycling', label: 'Alleen fietsen' },
                  { key: 'all', label: 'Alle sporten' },
                ]}
                value={settings.sportScope}
                onChange={(v) => update({ sportScope: v })}
              />
              <p className="mt-2 text-xs text-slate-500">CTL/ATL/TSB komen uit Intervals.icu en tellen altijd alle sporten mee.</p>
            </div>
            <div>
              <div className="mb-2 font-medium text-slate-200">Historie ophalen</div>
              <Segmented
                options={[
                  { key: '1', label: 'Sinds vorig jaar' },
                  { key: '2', label: '2 jaar terug' },
                  { key: '4', label: '4 jaar terug' },
                ]}
                value={String(settings.historyYears) as '1' | '2' | '4'}
                onChange={(v) => update({ historyYears: Number(v) })}
              />
              <p className="mt-2 text-xs text-slate-500">Meer historie = langere laadtijd. Jaar-op-jaarvergelijkingen hebben minimaal "sinds vorig jaar" nodig.</p>
            </div>
          </div>
        </Card>
      </div>

      {athlete && (
        <Card title="Profiel en sportinstellingen" subtitle="Zoals ingesteld in Intervals.icu (alleen-lezen)">
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Row label="Naam">{athlete.name || '–'}</Row>
            <Row label="Gewicht">{athlete.weight ? `${fmt1(athlete.weight)} kg` : '–'}</Row>
            <Row label="Rusthartslag">{athlete.restingHr ? `${athlete.restingHr} bpm` : '–'}</Row>
            <Row label="Tijdzone">{athlete.timezone ?? '–'}</Row>
          </div>
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 text-left font-medium">Sporten</th>
                  <th className="px-3 py-2 text-right font-medium">FTP</th>
                  <th className="px-3 py-2 text-right font-medium">Indoor FTP</th>
                  <th className="px-3 py-2 text-right font-medium">LTHR</th>
                  <th className="px-3 py-2 text-right font-medium">Max HR</th>
                  <th className="px-5 py-2 text-left font-medium">Vermogenszones (% FTP)</th>
                </tr>
              </thead>
              <tbody>
                {athlete.sports.map((s, i) => (
                  <tr key={i} className="border-b border-surface-border/60 last:border-0">
                    <td className="px-5 py-2.5 text-slate-200">{s.types.map(typeLabel).join(', ')}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.ftp ? `${s.ftp} W` : '–'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.indoorFtp ? `${s.indoorFtp} W` : '–'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.lthr ?? '–'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.maxHr ?? '–'}</td>
                    <td className="px-5 py-2.5 text-xs text-slate-400">{s.powerZones.length ? s.powerZones.join(' · ') : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 sm:block">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-slate-200">{children}</div>
    </div>
  );
}

function Status({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${ok ? 'text-emerald-400' : 'text-rose-400'}`}>
      {ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {text}
    </span>
  );
}
