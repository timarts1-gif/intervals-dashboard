/** Gedeelde Recharts-styling. */
export const axisProps = {
  stroke: '#64748b',
  tick: { fill: '#94a3b8', fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: '#262b38' },
} as const;

export const gridProps = { stroke: '#262b38', strokeDasharray: '3 3', vertical: false } as const;

export const tooltipProps = {
  contentStyle: {
    background: '#161922',
    border: '1px solid #262b38',
    borderRadius: 8,
    fontSize: 12,
    color: '#e2e8f0',
  },
  labelStyle: { color: '#cbd5e1', marginBottom: 4 },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
} as const;

export const COLORS = {
  accent: '#f97316',
  ctl: '#38bdf8',
  atl: '#f472b6',
  tsb: '#facc15',
  green: '#34d399',
  violet: '#a78bfa',
  slate: '#94a3b8',
};

/** Kleuren voor vermogenszones Z1..Z7 en sweet spot. */
export const POWER_ZONE_COLORS: Record<string, string> = {
  Z1: '#64748b',
  Z2: '#38bdf8',
  Z3: '#34d399',
  Z4: '#facc15',
  Z5: '#fb923c',
  Z6: '#f87171',
  Z7: '#c084fc',
  SS: '#eab308',
};

export const HR_ZONE_COLORS = ['#64748b', '#38bdf8', '#34d399', '#facc15', '#fb923c', '#f87171', '#c084fc'];
