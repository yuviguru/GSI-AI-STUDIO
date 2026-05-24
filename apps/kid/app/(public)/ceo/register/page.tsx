'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BusinessRegistration } from '@/components/ceo/BusinessRegistration';
import {
  useCeoBusiness,
  type RegisterBusinessParams,
} from '@/hooks/useCeoBusiness';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';

export default function CeoRegisterPage() {
  const router = useRouter();
  const hook = useCeoBusiness({ autoFetch: false });
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { activeKid, loading: kidLoading } = useKidProfile();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Client-side defense: if the caller lands here without auth + kid, bounce
  // them back to the landing page which renders the appropriate gate. The
  // server-side routes still reject the actual registration on their own,
  // so a determined user can't bypass this.
  useEffect(() => {
    if (authLoading || kidLoading) return;
    if (!isAuthenticated || !activeKid) {
      router.replace('/ceo');
    }
  }, [authLoading, kidLoading, isAuthenticated, activeKid, router]);

  async function handleSubmit(params: RegisterBusinessParams) {
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await hook.registerBusiness(params);
      router.push(`/ceo/play?businessId=${result.businessId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not start your business.';
      setFormError(message);
      setSubmitting(false);
    }
  }

  // While auth/kid are resolving OR while we're redirecting unauthed users,
  // render a minimal shell rather than the registration form.
  if (authLoading || kidLoading || !isAuthenticated || !activeKid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="h-64 animate-pulse rounded-3xl bg-gray-100" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-brand-text">
            Start your business
          </h1>
          <p className="mt-1 text-sm text-brand-text-secondary">
            Pick a business, name it, and set your pace. You&apos;ll meet your first
            decision in seconds.
          </p>
        </div>

        {formError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="font-semibold">Something went wrong</div>
            <div className="mt-0.5">{formError}</div>
          </div>
        )}

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <BusinessRegistration
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      </div>
    </div>
  );
}
