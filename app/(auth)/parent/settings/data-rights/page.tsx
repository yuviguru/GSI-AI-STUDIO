'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ConsentRegister } from '@/components/parent/ConsentRegister';
import { DataRightsPanel } from '@/components/parent/DataRightsPanel';

interface KidOption {
  id: string;
  name: string;
}

export default function ParentDataRightsPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, getIdToken } = useAuth();
  const [kids, setKids] = useState<KidOption[]>([]);
  const [activeKidId, setActiveKidId] = useState<string>('');
  const [loadingKids, setLoadingKids] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    if (user && user.role !== 'parent' && user.role !== 'schoolAdmin') {
      router.replace('/');
    }
  }, [loading, isAuthenticated, user, router]);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/users/kids', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setLoadingKids(false);
      return;
    }
    const json = await res.json();
    const list = (json.data?.kids ?? []) as Array<{ id: string; name: string }>;
    setKids(list.map((k) => ({ id: k.id, name: k.name })));
    if (list.length > 0 && !activeKidId) setActiveKidId(list[0]!.id);
    setLoadingKids(false);
  }, [activeKidId, getIdToken]);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  if (loading || loadingKids) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  if (kids.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900">Data & privacy</h1>
        <p className="mt-2 text-sm text-slate-600">
          Add a child profile first to manage privacy settings.
        </p>
      </div>
    );
  }

  const activeKid = kids.find((k) => k.id === activeKidId) ?? kids[0];
  const kidId = activeKid!.id;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Data & privacy</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage what GSI can do with your child's data. These controls comply with
          India's DPDP Act 2023.
        </p>
      </header>

      {kids.length > 1 && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Child</span>
          <select
            value={activeKidId}
            onChange={(e) => setActiveKidId(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          >
            {kids.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Consent settings
        </h2>
        <ConsentRegister kidId={kidId} kidName={activeKid!.name} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Your data rights
        </h2>
        <DataRightsPanel kidId={kidId} kidName={activeKid!.name} />
      </section>
    </div>
  );
}
