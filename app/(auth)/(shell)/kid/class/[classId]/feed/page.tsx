'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ClassFeed } from '@/components/class/ClassFeed';

export default function ClassFeedPage() {
  const params = useParams<{ classId: string }>();
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [activeKidId, setActiveKidId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    if (user && user.role !== 'parent') {
      router.replace('/');
    }
  }, [loading, isAuthenticated, user, router]);

  // The kid-picker UI elsewhere in the app stores the selected kidId in
  // localStorage under "activeKidId"; mirror that here.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setActiveKidId(window.localStorage.getItem('activeKidId'));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }
  if (!activeKidId) {
    return (
      <div className="mx-auto max-w-2xl space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Class feed</h1>
        <p className="text-sm text-slate-600">
          Pick a child profile first to see your class&apos;s shared creations.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Class feed</h1>
        <p className="text-sm text-slate-600">
          Approved creations your teacher has shared with the class. React with
          a kind emoji.
        </p>
      </header>
      <ClassFeed classId={params.classId} kidId={activeKidId} />
    </div>
  );
}
