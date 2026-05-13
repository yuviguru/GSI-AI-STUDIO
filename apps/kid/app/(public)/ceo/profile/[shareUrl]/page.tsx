'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, Ghost } from 'lucide-react';
import { CeoProfileCard } from '@/components/ceo/CeoProfileCard';
import { useCeoProfile } from '@/hooks/useCeoProfile';

export default function CeoPublicProfilePage() {
  const params = useParams<{ shareUrl: string }>();
  const shareUrlRaw = params?.shareUrl;
  const shareUrl = Array.isArray(shareUrlRaw) ? shareUrlRaw[0] : shareUrlRaw;

  const { profile, business, loading, error } = useCeoProfile({
    shareUrl: shareUrl ?? '',
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {loading && (
          <div className="space-y-4">
            <div className="h-8 w-40 animate-pulse rounded bg-gray-100" />
            <div className="h-64 animate-pulse rounded-3xl bg-gray-100" />
            <div className="h-40 animate-pulse rounded-3xl bg-gray-100" />
          </div>
        )}

        {!loading && (error || !profile || !business) && (
          <div className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Ghost className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-bold text-brand-text">
              This profile isn&apos;t available
            </h1>
            <p className="mt-2 text-sm text-brand-text-secondary">
              It might be private, or the link may be broken.
            </p>
            <Link
              href="/ceo"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-ai"
            >
              Go to Kid CEO
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {!loading && profile && business && shareUrl && (
          <>
            <CeoProfileCard
              business={business}
              profile={profile}
              shareUrl={shareUrl}
              canShare={false}
            />

            <div className="mt-8 border-t border-gray-100 pt-6 text-center">
              <p className="text-sm text-brand-text-secondary">
                Made on GSI AI Studio
              </p>
              <Link
                href="/ceo"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:text-brand-ai"
              >
                Create your own CEO Profile
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
