'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BusinessRegistration } from '@/components/ceo/BusinessRegistration';
import {
  useCeoBusiness,
  type RegisterBusinessParams,
} from '@/hooks/useCeoBusiness';

export default function CeoRegisterPage() {
  const router = useRouter();
  const hook = useCeoBusiness({ autoFetch: false });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/ceo"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-brand-ai"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kid CEO
        </Link>

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
