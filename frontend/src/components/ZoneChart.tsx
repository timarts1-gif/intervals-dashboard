import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisProps, tooltipProps } from './chartTheme';
import { fmtDuration, fmt1 } from '../utils/format';
import { EmptyState } from './States';

export interface ZoneRow {
  name: string;
  secs: number;
  color: string;
  /** Overlappende zone (bijv. sweet spot): wel tonen, niet meetellen in het totaal. */
  overlap?: boolean;
}

export function ZoneChart({ rows, height = 240 }: { rows: ZoneRow[]; height?: number }) {
  const total = rows.filter((r) => !r.overlap).reduce((s, r) => s + r.secs, 0);
  if (total === 0) return <EmptyState label="Geen zonedata in deze periode" />;
  const data = rows.map((r) => ({ ...r, pct: (r.secs / total) * 100 }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" {...axisProps} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" {...axisProps} width={110} />
        <Tooltip
          {...tooltipProps}
          formatter={(_v, _n, item) => [`${fmtDuration(item.payload.secs)} (${fmt1(item.payload.pct)}%)`, 'Tijd']}
        />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
