import { useState, type FormEvent } from 'react';
import { BarChart3, Loader2, Lock } from 'lucide-react';
import { authApi as api } from '../services/authApi';

interface Props {
  title: string;
  subtitle: string;
  onSuccess: () => void;
}

export function LoginScreen({ title, subtitle, onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(password);
      setPassword('');
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-surface-border bg-surface-card p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">{title}</h1>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        <label className="block text-sm text-slate-300" htmlFor="pw">
          Wachtwoord
        </label>
        <div className="relative mt-1.5">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="pw"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface-raised py-2 pl-9 pr-3 text-sm text-slate-100 focus:border-accent focus:outline-none"
          />
        </div>
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2 text-sm font-medium text-white hover:bg-accent-soft disabled:opacity-50"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Inloggen
        </button>
      </form>
    </div>
  );
}
