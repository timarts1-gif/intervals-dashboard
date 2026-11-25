import type { Activity, SportProfile } from '../types/api';
import { hrZoneTotals, powerZoneTotals } from './aggregate';
import { HR_ZONE_COLORS, POWER_ZONE_COLORS } from '../components/chartTheme';
import type { ZoneRow } from '../components/ZoneChart';

/** Vermogenszones in volgorde Z1..Z7; sweet spot (SS) overlapt met Z3/Z4 en wordt apart getoond. */
export function powerZoneRows(acts: Activity[], profile: SportProfile | null, includeSweetSpot = false): ZoneRow[] {
  const totals = powerZoneTotals(acts);
  const byId = new Map(totals.map((t) => [t.id, t.secs]));
  const ids = [...byId.keys()].filter((id) => /^Z\d+$/.test(id)).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const rows: ZoneRow[] = ids.map((id, i) => ({
    name: profile?.powerZoneNames[i] ? `${id} ${profile.powerZoneNames[i]}` : id,
    secs: byId.get(id) ?? 0,
    color: POWER_ZONE_COLORS[id] ?? '#94a3b8',
  }));
  if (includeSweetSpot && byId.has('SS')) rows.push({ name: 'Sweet spot', secs: byId.get('SS')!, color: POWER_ZONE_COLORS.SS, overlap: true });
  return rows;
}

export function hrZoneRows(acts: Activity[], profile: SportProfile | null): ZoneRow[] {
  return hrZoneTotals(acts).map((secs, i) => ({
    name: profile?.hrZoneNames[i] ? `Z${i + 1} ${profile.hrZoneNames[i]}` : `Z${i + 1}`,
    secs,
    color: HR_ZONE_COLORS[i] ?? '#94a3b8',
  }));
}
