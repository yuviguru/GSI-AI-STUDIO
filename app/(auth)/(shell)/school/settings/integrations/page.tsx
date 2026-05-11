'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Plug, RefreshCw, Save, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type ProviderId = 'local' | 'fedena' | 'mastersoft' | 'schoollog' | 'neverskip';

interface IntegrationConfig {
  schoolId: string;
  provider: ProviderId;
  credentialsRef?: string;
  enabled: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'failure';
  lastError?: string;
}

interface ProviderHealth {
  id: ProviderId;
  ok: boolean;
  message?: string;
  checkedAt: string;
}

const PROVIDERS: Array<{ id: ProviderId; name: string; description: string; status: 'live' | 'planned' }> = [
  {
    id: 'local',
    name: 'GSI Local',
    description: 'Use GSI Firestore as the canonical school data store. Default.',
    status: 'live',
  },
  {
    id: 'fedena',
    name: 'Fedena',
    description: 'Fedena ERP integration. Fetches roster, attendance, and timetables.',
    status: 'planned',
  },
  {
    id: 'mastersoft',
    name: 'MasterSoft',
    description: 'Coming soon — adapter scaffolded but not yet validated.',
    status: 'planned',
  },
  {
    id: 'schoollog',
    name: 'Schoollog',
    description: 'Coming soon — adapter scaffolded but not yet validated.',
    status: 'planned',
  },
  {
    id: 'neverskip',
    name: 'Neverskip',
    description: 'Coming soon — adapter scaffolded but not yet validated.',
    status: 'planned',
  },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, getIdToken } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [config, setConfig] = useState<IntegrationConfig | null>(null);
  const [provider, setProvider] = useState<ProviderId>('local');
  const [credentialsRef, setCredentialsRef] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState<ProviderHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Resolve schoolId via /api/auth/teacher (the same pattern as other school admin pages).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/auth/teacher', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const j = await res.json();
      if (!cancelled) setSchoolId((j.data?.schoolId as string | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [getIdToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/teacher/login');
      return;
    }
    if (user && user.role !== 'schoolAdmin') {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  const load = useCallback(async () => {
    if (!schoolId) return;
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/schools/${schoolId}/integrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const j = await res.json();
        const c = j.data?.config as IntegrationConfig;
        setConfig(c);
        setProvider(c.provider);
        setCredentialsRef(c.credentialsRef ?? '');
        setEnabled(c.enabled);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [getIdToken, schoolId]);

  useEffect(() => {
    if (schoolId) void load();
  }, [schoolId, load]);

  async function save() {
    if (!schoolId) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/schools/${schoolId}/integrations`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, enabled, credentialsRef: credentialsRef || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error?.message ?? 'Save failed.');
      setConfig(j.data.config as IntegrationConfig);
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    if (!schoolId) return;
    setTesting(true);
    setHealth(null);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/schools/${schoolId}/integrations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error?.message ?? 'Test failed.');
      setHealth(j.data.health as ProviderHealth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed.');
    } finally {
      setTesting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20 text-brand-text-secondary">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-brand-text sm:text-3xl">
          Integrations
        </h1>
        <p className="text-sm text-brand-text-secondary">
          Connect your school&apos;s SIS / ERP. We use it to sync roster, attendance, and timetables.
          Credentials are stored encrypted; only an opaque reference is kept here.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="mb-3 font-display text-sm font-bold text-brand-text">
          Choose a provider
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map((p) => {
            const active = provider === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={cn(
                  'flex flex-col items-start rounded-2xl border-2 p-3 text-left transition',
                  active
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-gray-200 bg-white hover:border-gray-300',
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-2 font-semibold text-brand-text">
                    <Plug className="h-4 w-4 text-brand-primary" />
                    {p.name}
                  </span>
                  {p.status === 'planned' && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                      Planned
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-brand-text-secondary">{p.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {provider !== 'local' && (
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 font-display text-sm font-bold text-brand-text">Credentials</h2>
          <label className="block">
            <span className="text-xs font-semibold text-brand-text-secondary">
              Credentials reference (opaque pointer to encrypted secret)
            </span>
            <input
              type="text"
              value={credentialsRef}
              onChange={(e) => setCredentialsRef(e.target.value)}
              placeholder="vault://schools/<id>/sis-creds"
              className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20"
            />
          </label>
          <p className="mt-2 text-[11px] text-brand-text-muted">
            Generate via the secret-store CLI; never paste raw API keys here.
          </p>
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          <span>
            <span className="block text-sm font-semibold text-brand-text">
              Integration enabled
            </span>
            <span className="text-xs text-brand-text-secondary">
              Disable to fall back to GSI Local without losing the saved config.
            </span>
          </span>
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
        <button
          type="button"
          onClick={test}
          disabled={testing}
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-brand-text transition hover:bg-gray-200 disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Test connection
        </button>
        {savedAt && (
          <span className="text-xs text-emerald-700">
            Saved at {savedAt.toLocaleTimeString()}.
          </span>
        )}
      </div>

      {health && (
        <div
          className={cn(
            'flex items-start gap-3 rounded-2xl border p-4 text-sm',
            health.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800',
          )}
        >
          {health.ok ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <div>
            <p className="font-semibold">
              {health.ok ? 'Connection healthy' : 'Connection failed'} ·{' '}
              <span className="font-normal opacity-80">{health.id}</span>
            </p>
            {health.message && <p className="mt-0.5 text-xs">{health.message}</p>}
            <p className="mt-0.5 text-[10px] opacity-70">
              Checked at {new Date(health.checkedAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {config?.lastSyncAt && (
        <p className="text-xs text-brand-text-secondary">
          Last sync: {new Date(config.lastSyncAt).toLocaleString()} ·{' '}
          <span className="capitalize">{config.lastSyncStatus}</span>
          {config.lastError && ` · ${config.lastError}`}
        </p>
      )}
    </div>
  );
}
