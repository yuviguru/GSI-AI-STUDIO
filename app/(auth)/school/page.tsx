'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Users, BookOpen, Award, Activity, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CurriculumHeatmap } from '@/components/admin/CurriculumHeatmap';
import { TeacherActivityTable } from '@/components/admin/TeacherActivityTable';
import { ComplianceExport } from '@/components/admin/ComplianceExport';
import { WeeklyTrendChart } from '@/components/admin/WeeklyTrendChart';
import { cn } from '@/lib/utils';
import type { SchoolAnalyticsDoc } from '@/types/user.types';

interface LeaderboardEntry {
  rank: number;
  schoolId: string;
  name: string;
  city: string;
  board: string;
  creations: number;
  curriculumCoverage: number;
  activeStudentPct: number;
}

export default function SchoolDashboardPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, getIdToken } = useAuth();
  const [analytics, setAnalytics] = useState<SchoolAnalyticsDoc | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/teacher/login');
      return;
    }
    if (!user || user.role === undefined) return;
    if (user.role !== 'schoolAdmin') router.replace('/teacher');
  }, [loading, isAuthenticated, user, router]);

  const load = useCallback(async (forceRefresh = false) => {
    const token = await getIdToken();
    if (!token) return;

    const verifyRes = await fetch('/api/auth/teacher', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!verifyRes.ok) {
      router.replace('/teacher/login');
      return;
    }
    const verifyJson = await verifyRes.json();
    const schoolId: string | undefined = verifyJson.data?.schoolId;
    if (!schoolId) return;

    const [analyticsRes, leaderboardRes] = await Promise.all([
      fetch(
        `/api/admin/analytics/school/${schoolId}${forceRefresh ? '?refresh=1' : ''}`,
        { headers: { Authorization: `Bearer ${token}` } },
      ),
      fetch('/api/admin/competitions/leaderboard', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (analyticsRes.ok) {
      const json = await analyticsRes.json();
      const a = json.data?.analytics;
      if (a) {
        setAnalytics({
          ...a,
          updatedAt: new Date(a.updatedAt),
          teacherActivity: (a.teacherActivity ?? []).map(
            (t: LeaderboardEntry & { lastActiveAt?: string }) => ({
              ...t,
              lastActiveAt: t.lastActiveAt ? new Date(t.lastActiveAt) : undefined,
            }),
          ),
        });
      }
    }
    if (leaderboardRes.ok) {
      const json = await leaderboardRes.json();
      setLeaderboard(json.data?.rankings ?? []);
    }
    setLoadingData(false);
  }, [getIdToken, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'schoolAdmin') void load();
  }, [isAuthenticated, user, load]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading || loadingData) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading school…</p>;
  }

  if (!analytics) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
        Analytics are still warming up. Please check back in a few minutes.
      </div>
    );
  }

  const lastUpdatedLabel = analytics.updatedAt
    ? analytics.updatedAt.toLocaleString()
    : 'never';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            School dashboard
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Last refreshed {lastUpdatedLabel}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50',
            refreshing && 'opacity-60',
          )}
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Users}
          label="Students"
          value={analytics.totalStudents}
          hint={`${analytics.activeStudentsThisWeek} active this week`}
        />
        <StatCard
          icon={BookOpen}
          label="Creations"
          value={analytics.totalCreations}
          hint={`${analytics.creationsThisWeek} this week`}
        />
        <StatCard
          icon={Activity}
          label="Active %"
          value={
            analytics.totalStudents > 0
              ? `${Math.round(
                  (analytics.activeStudentsThisWeek / analytics.totalStudents) *
                    100,
                )}%`
              : '0%'
          }
          hint="Weekly active students"
        />
        <StatCard
          icon={Award}
          label="Avg concepts"
          value={
            analytics.totalStudents > 0
              ? Math.round(
                  analytics.curriculumCoverage.reduce(
                    (sum, c) => sum + c.studentsExposed,
                    0,
                  ) / analytics.totalStudents,
                )
              : 0
          }
          hint="Concepts per student"
        />
      </div>

      <WeeklyTrendChart data={analytics.weeklyTrend} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Curriculum coverage
          </h2>
        </div>
        <CurriculumHeatmap
          coverage={analytics.curriculumCoverage}
          totalStudents={analytics.totalStudents}
        />
      </section>

      <TeacherActivityTable teachers={analytics.teacherActivity} />

      <ComplianceExport />

      <section className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-gray-700">
            Inter-school leaderboard
          </h2>
        </div>
        {leaderboard.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            Leaderboard is warming up…
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-400">
                <th className="px-2 py-2 text-left font-medium">Rank</th>
                <th className="px-2 py-2 text-left font-medium">School</th>
                <th className="px-2 py-2 text-left font-medium">City</th>
                <th className="px-2 py-2 text-left font-medium">Board</th>
                <th className="px-2 py-2 text-right font-medium">Creations</th>
                <th className="px-2 py-2 text-right font-medium">Coverage</th>
                <th className="px-2 py-2 text-right font-medium">Active %</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr
                  key={row.schoolId}
                  className="border-t border-gray-50"
                >
                  <td className="px-2 py-2 font-semibold text-gray-700">
                    #{row.rank}
                  </td>
                  <td className="px-2 py-2 text-gray-900">{row.name}</td>
                  <td className="px-2 py-2 text-gray-500">{row.city}</td>
                  <td className="px-2 py-2 text-gray-500 uppercase">{row.board}</td>
                  <td className="px-2 py-2 text-right text-gray-600">
                    {row.creations}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-600">
                    {row.curriculumCoverage}%
                  </td>
                  <td className="px-2 py-2 text-right text-gray-600">
                    {row.activeStudentPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
