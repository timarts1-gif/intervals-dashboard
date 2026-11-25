import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LoadingState({ label = 'Gegevens laden uit Intervals.icu…' }: { label?: string }) {
  return (
    <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
      <Loader2 className="animate-spin" size={20} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-rose-400" size={20} />
        <div>
          <h3 className="font-semibold text-rose-200">Kon gegevens niet laden</h3>
          <p className="mt-1 text-sm text-rose-200/80">{message}</p>
          <p className="mt-3 text-sm text-slate-400">
            Controleer de verbinding op de <Link className="text-accent hover:underline" to="/settings">Settings</Link>-pagina.
          </p>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
      <Inbox size={22} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
