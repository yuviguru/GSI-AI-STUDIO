'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  ALL_CONSENT_SCOPES,
  CONSENT_SCOPE_LABELS,
  type ConsentScope,
  type ConsentState,
} from '@gsi/types';

interface Props {
  kidId: string;
  kidName?: string;
}

export function ConsentRegister({ kidId, kidName }: Props) {
  const { getIdToken } = useAuth();
  const [state, setState] = useState<ConsentState>({});
  const [loading, setLoading] = useState(true);
  const [savingScope, setSavingScope] = useState<ConsentScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(`/api/dpdp/consent?kidId=${encodeURIComponent(kidId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error?.message ?? 'Could not load consent status.');
      setLoading(false);
      return;
    }
    setState((json.data?.state as ConsentState) ?? {});
    setLoading(false);
  }, [getIdToken, kidId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(scope: ConsentScope, granted: boolean) {
    setSavingScope(scope);
    setError(null);
    setMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/dpdp/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kidId, scope, granted }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Save failed');
      setState((prev) => ({ ...prev, [scope]: granted }));
      setMessage(granted ? 'Consent granted.' : 'Consent revoked.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingScope(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading consent settings…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900">
        <div className="flex items-center gap-2 font-semibold">
          <Shield className="h-4 w-4" />
          Data & privacy controls{kidName ? ` for ${kidName}` : ''}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-indigo-900/80">
          Under India&apos;s DPDP Act 2023, we only process your child&apos;s data for purposes
          you explicitly agree to. You can grant or revoke any permission at any time.
          Revoking stops the affected activity within one minute.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {ALL_CONSENT_SCOPES.map((scope) => (
          <ConsentRow
            key={scope}
            scope={scope}
            granted={state[scope] ?? false}
            saving={savingScope === scope}
            onChange={(next) => toggle(scope, next)}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">
        All grants and revocations are written to a tamper-evident audit log that you
        and our Data Protection Officer can review anytime.
      </p>
    </div>
  );
}

function ConsentRow({
  scope,
  granted,
  saving,
  onChange,
}: {
  scope: ConsentScope;
  granted: boolean;
  saving: boolean;
  onChange: (next: boolean) => void;
}) {
  const label = CONSENT_SCOPE_LABELS[scope];
  return (
    <div className="flex items-start gap-4 p-4">
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">{label.title}</p>
        <p className="mt-1 text-xs text-slate-600">{label.body}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={granted}
        aria-label={`${granted ? 'Revoke' : 'Grant'} ${label.title}`}
        disabled={saving}
        onClick={() => onChange(!granted)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          granted ? 'bg-emerald-500' : 'bg-slate-300',
          saving && 'opacity-60',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            granted ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
