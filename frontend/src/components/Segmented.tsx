interface Props<T extends string> {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-surface-border bg-surface-raised p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === o.key ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
