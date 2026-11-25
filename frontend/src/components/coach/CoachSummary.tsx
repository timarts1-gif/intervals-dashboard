import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';
import type { CoachAthlete, CoachOverview } from '../../types/api';
import { parseLocal } from '../../utils/dates';
import { fmtDate } from '../../utils/format';

/**
 * Lekensamenvatting per atleet. Dit is een INTERPRETATIE bovenop de Intervals.icu-waarden,
 * met vaste, uitlegbare drempels (zie onderaan de pagina):
 *  - Form% = Form / CTL × 100, met de zones van de Intervals.icu fitnessgrafiek:
 *    > +20 transitie, +5…+20 fris, −10…+5 grijze zone, −30…−10 optimale training, < −30 hoog risico.
 *  - Conditie: CTL onder LOW_CTL, of CTL in 28 dagen meer dan CTL_DROP_PCT gedaald.
 */
const FRESH_PCT = 5;
const LOW_CTL = 30;
const CTL_DROP_PCT = 15;
const STALE_DAYS = 7;

type Tone = 'green' | 'yellow' | 'orange' | 'red' | 'gray';

interface Verdict {
  tone: Tone;
  title: string;
  text: string;
  notes: string[];
}

const TONE: Record<Tone, { dot: string; border: string; title: string }> = {
  green: { dot: 'bg-emerald-400', border: 'border-emerald-500/40', title: 'text-emerald-300' },
  yellow: { dot: 'bg-amber-300', border: 'border-amber-400/40', title: 'text-amber-200' },
  orange: { dot: 'bg-orange-400', border: 'border-orange-500/40', title: 'text-orange-300' },
  red: { dot: 'bg-rose-500', border: 'border-rose-500/50', title: 'text-rose-300' },
  gray: { dot: 'bg-slate-500', border: 'border-surface-border', title: 'text-slate-300' },
};

export function assess(a: CoachAthlete, periodEnd: string): Verdict {
  const stale = !a.lastDataDate || differenceInCalendarDays(parseLocal(periodEnd), parseLocal(a.lastDataDate)) > STALE_DAYS;
  if (a.ctl == null || a.form == null || a.ctl <= 0 || stale) {
    return {
      tone: 'gray',
      title: 'Onvoldoende gegevens',
      text: a.lastDataDate ? `Geen recente trainingsdata (laatste: ${fmtDate(a.lastDataDate)}).` : 'Er is geen trainingsdata beschikbaar.',
      notes: [],
    };
  }

  const formPct = (a.form / a.ctl) * 100;
  const ctlBase = a.ctlChange28 != null ? a.ctl - a.ctlChange28 : null;
  const ctlDropPct = ctlBase && ctlBase > 0 && a.ctlChange28! < 0 ? (-a.ctlChange28! / ctlBase) * 100 : 0;
  const lowCondition = a.ctl < LOW_CTL;
  const declining = ctlDropPct > CTL_DROP_PCT;

  const notes: string[] = [];
  if (lowCondition) notes.push('Lage basisconditie: er is de afgelopen weken weinig getraind.');
  else if (declining) notes.push(`Conditie loopt terug: ${Math.round(ctlDropPct)}% lager dan 4 weken geleden.`);

  // "Fris" = Intervals.icu zone Fresh (Form ≥ +5% van CTL). Alleen dan geldt iemand als koersklaar;
  // een negatieve of bijna-nul Form betekent dat er nog vermoeidheid van recente training is.
  const fresh = formPct >= FRESH_PCT;

  if (formPct < -30) {
    return { tone: 'red', title: 'Erg vermoeid', text: 'Heeft veel meer getraind dan gewend. Rust nodig; liever niet koersen.', notes };
  }
  if (formPct < -10) {
    return {
      tone: 'orange',
      title: 'Vermoeid door training',
      text: 'Zit midden in een zware trainingsperiode. Niet fris genoeg om goed te koersen.',
      notes,
    };
  }
  if (lowCondition || declining) {
    const v: Verdict = {
      tone: 'yellow',
      title: fresh
        ? lowCondition ? 'Fris, maar weinig conditie' : 'Fris, maar conditie zakt'
        : lowCondition ? 'Weinig conditie' : 'Conditie zakt',
      text: fresh
        ? 'Niet vermoeid, maar de conditie is niet op niveau. Koersen kan, verwacht geen topvorm.'
        : 'De conditie is niet op niveau en er is nog wat vermoeidheid. Verwacht geen topvorm.',
      notes: [],
    };
    if (declining && lowCondition) v.notes.push(`Conditie is ${Math.round(ctlDropPct)}% lager dan 4 weken geleden.`);
    return v;
  }
  if (!fresh) {
    return {
      tone: 'yellow',
      title: 'Nog niet helemaal fris',
      text: 'Goede conditie, maar nog lichte vermoeidheid van recente training. Een paar rustige dagen maken iemand koersklaar.',
      notes,
    };
  }
  if (formPct > 20) {
    return { tone: 'yellow', title: 'Erg uitgerust', text: 'Fris, maar al een tijdje weinig training. Kan koersen; de conditie kan gaan zakken.', notes };
  }
  return { tone: 'green', title: 'Klaar om te koersen', text: 'Goede conditie en uitgerust.', notes };
}

export function CoachSummary({ data }: { data: CoachOverview }) {
  const [help, setHelp] = useState(false);
  const items = data.athletes
    .map((a) => ({ a, v: assess(a, data.periodEnd) }))
    .sort((x, y) => x.a.name.localeCompare(y.a.name, 'nl'));

  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">In het kort</h2>
        <button
          type="button"
          onClick={() => setHelp((h) => !h)}
          aria-expanded={help}
          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5"
        >
          <HelpCircle size={14} /> {help ? 'Uitleg sluiten' : 'Hoe lees ik dit?'}
        </button>
      </div>
      {help && <Legend />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map(({ a, v }, i) => {
          const t = TONE[v.tone];
          return (
            <div key={i} className={`rounded-lg border bg-surface-raised px-4 py-3 ${t.border}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.dot}`} />
                <span className="truncate font-medium text-slate-100">{a.name}</span>
              </div>
              <div className={`mt-1.5 text-sm font-semibold ${t.title}`}>{v.title}</div>
              <p className="mt-0.5 text-sm leading-snug text-slate-300">{v.text}</p>
              {v.notes.map((n, j) => (
                <p key={j} className="mt-1 text-xs leading-snug text-slate-400">
                  {n}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const LEGEND: { tone: Tone; title: string; when: string }[] = [
  { tone: 'green', title: 'Klaar om te koersen', when: `Form tussen +${FRESH_PCT}% en +20% van CTL (fris) en de conditie is op niveau.` },
  { tone: 'yellow', title: 'Erg uitgerust', when: 'Form boven +20% van CTL: fris, maar al een tijd weinig getraind.' },
  {
    tone: 'yellow',
    title: 'Nog niet helemaal fris',
    when: `Form tussen −10% en +${FRESH_PCT}% van CTL: lichte vermoeidheid. Koersen kan, maar niet op z'n best.`,
  },
  {
    tone: 'yellow',
    title: 'Weinig conditie / conditie zakt',
    when: `CTL onder ${LOW_CTL} of meer dan ${CTL_DROP_PCT}% gedaald in 28 dagen (en niet erg vermoeid).`,
  },
  { tone: 'orange', title: 'Vermoeid door training', when: 'Form tussen −30% en −10% van CTL: zware trainingsperiode.' },
  { tone: 'red', title: 'Erg vermoeid', when: 'Form onder −30% van CTL: veel meer getraind dan gewend, rust nodig.' },
  { tone: 'gray', title: 'Onvoldoende gegevens', when: `Geen trainingsdata in de laatste ${STALE_DAYS} dagen.` },
];

function Legend() {
  return (
    <div className="space-y-3 rounded-lg border border-surface-border bg-surface-raised px-4 py-3 text-sm text-slate-300">
      <div className="space-y-1 leading-relaxed">
        <p>
          <strong className="font-medium text-white">Fitness (CTL)</strong>: hoeveel iemand de afgelopen ~6 weken gemiddeld getraind
          heeft. Hoger = betere conditie.
        </p>
        <p>
          <strong className="font-medium text-white">Fatigue (ATL)</strong>: hoeveel er de laatste ~week getraind is. Hoger = meer
          vermoeid.
        </p>
        <p>
          <strong className="font-medium text-white">Form</strong> = CTL − ATL. Negatief betekent vermoeid, positief betekent fris. Het
          oordeel kijkt naar Form als percentage van CTL, met de zones van de Intervals.icu fitnessgrafiek.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-1.5 pr-3 font-medium">Oordeel</th>
            <th className="py-1.5 font-medium">Wanneer</th>
          </tr>
        </thead>
        <tbody>
          {LEGEND.map((l, i) => (
            <tr key={i} className="border-b border-surface-border/60 last:border-0 align-top">
              <td className="py-1.5 pr-3">
                <span className="inline-flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE[l.tone].dot}`} />
                  <span className={`font-medium ${TONE[l.tone].title}`}>{l.title}</span>
                </span>
              </td>
              <td className="py-1.5 text-slate-300">{l.when}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-500">Dit is een vuistregel, geen medisch of trainersadvies.</p>
    </div>
  );
}
