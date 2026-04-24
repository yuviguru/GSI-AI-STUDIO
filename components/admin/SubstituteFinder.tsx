'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  type TeacherTimetable,
  type Weekday,
  WEEKDAYS,
} from '@/lib/firebase/timetableTypes';
import type { SubInstructionsDraft } from '@/lib/ai/subInstructionsGenerator';

interface TeacherInfo {
  teacherUid: string;
  teacherName: string;
}

interface PerPeriodResult {
  periodIdx: number;
  subject?: string;
  classId?: string;
  candidates: Array<{
    teacherUid: string;
    score: number;
    subjects: string[];
    seniority: number;
    recentSubLoad: number;
    reasoning: string[];
  }>;
}

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SubstituteFinder({ schoolId }: { schoolId: string }) {
  const { getIdToken } = useAuth();
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [timetables, setTimetables] = useState<TeacherTimetable[]>([]);
  const [date, setDate] = useState(isoToday());
  const [absentTeacherUid, setAbsentTeacherUid] = useState<string>('');
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);
  const [results, setResults] = useState<PerPeriodResult[] | null>(null);
  const [weekday, setWeekday] = useState<Weekday | null>(null);
  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructionsByPeriod, setInstructionsByPeriod] = useState<
    Record<number, SubInstructionsDraft>
  >({});
  const [generatingPeriod, setGeneratingPeriod] = useState<number | null>(null);

  const teacherNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teachers) map.set(t.teacherUid, t.teacherName);
    return map;
  }, [teachers]);

  const load = useCallback(async () => {
    setLoading(true);
    const token = await getIdToken();
    if (!token) return;
    const [analyticsRes, timetableRes] = await Promise.all([
      fetch(`/api/admin/analytics/school/${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch('/api/substitutes/timetable', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);
    if (analyticsRes.ok) {
      const json = await analyticsRes.json();
      const a = json.data?.analytics;
      const list = (a?.teacherActivity ?? []) as Array<{
        teacherUid: string;
        teacherName: string;
      }>;
      setTeachers(list.map((t) => ({ teacherUid: t.teacherUid, teacherName: t.teacherName })));
    }
    if (timetableRes.ok) {
      const json = await timetableRes.json();
      setTimetables(
        (json.data?.timetables ?? []).map(
          (t: TeacherTimetable & { updatedAt: string }) => ({
            ...t,
            updatedAt: new Date(t.updatedAt),
          }),
        ),
      );
    }
    setLoading(false);
  }, [getIdToken, schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  function togglePeriod(p: number) {
    setSelectedPeriods((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p].sort((a, b) => a - b),
    );
  }

  async function find() {
    if (!absentTeacherUid || selectedPeriods.length === 0) return;
    setFinding(true);
    setError(null);
    setResults(null);
    setInstructionsByPeriod({});
    try {
      const token = await getIdToken();
      const res = await fetch('/api/substitutes/find', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          absentTeacherUid,
          date,
          periodIdxs: selectedPeriods,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Find failed');
      setWeekday(json.data?.weekday as Weekday);
      setResults((json.data?.perPeriod ?? []) as PerPeriodResult[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Find failed');
    } finally {
      setFinding(false);
    }
  }

  async function generateInstructions(p: PerPeriodResult) {
    if (!p.classId || !p.subject) return;
    setGeneratingPeriod(p.periodIdx);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/substitutes/instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          absentTeacherUid,
          classId: p.classId,
          subject: p.subject,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Generate failed');
      setInstructionsByPeriod({
        ...instructionsByPeriod,
        [p.periodIdx]: json.data?.draft as SubInstructionsDraft,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generate failed');
    } finally {
      setGeneratingPeriod(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }
  if (teachers.length === 0) {
    return (
      <p className="rounded border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        No teacher activity yet — invite teachers from the school dashboard first.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Calendar className="h-4 w-4" /> Mark a teacher absent
        </h3>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Absent teacher</span>
            <select
              value={absentTeacherUid}
              onChange={(e) => setAbsentTeacherUid(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">Pick a teacher…</option>
              {teachers.map((t) => (
                <option key={t.teacherUid} value={t.teacherUid}>
                  {t.teacherName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-slate-700">Periods to cover</p>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePeriod(p)}
                className={`rounded-md border px-3 py-1 text-xs ${
                  selectedPeriods.includes(p)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                P{p}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={find}
            disabled={!absentTeacherUid || selectedPeriods.length === 0 || finding}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Users className="h-4 w-4" />
            {finding ? 'Finding…' : 'Find substitutes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {results && (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Day: <strong>{weekday}</strong>
          </p>
          {results.map((p) => {
            const instructions = instructionsByPeriod[p.periodIdx];
            return (
              <div key={p.periodIdx} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Period {p.periodIdx}{' '}
                    {p.subject ? (
                      <span className="text-slate-500">· {p.subject}</span>
                    ) : (
                      <span className="text-amber-700">· no class scheduled</span>
                    )}
                  </h4>
                  {p.classId && p.subject && (
                    <button
                      type="button"
                      onClick={() => generateInstructions(p)}
                      disabled={generatingPeriod === p.periodIdx}
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                    >
                      <Sparkles className="h-3 w-3" />
                      {generatingPeriod === p.periodIdx
                        ? 'Drafting…'
                        : instructions
                          ? 'Regenerate instructions'
                          : 'Generate instructions'}
                    </button>
                  )}
                </div>
                {p.candidates.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Nobody is free this period. Reshuffle the timetable or shorten the day.
                  </p>
                ) : (
                  <ol className="mt-2 space-y-1 text-sm">
                    {p.candidates.map((c) => (
                      <li
                        key={c.teacherUid}
                        className="flex items-start justify-between rounded border border-slate-100 px-2 py-1.5"
                      >
                        <div>
                          <p className="font-medium text-slate-800">
                            {teacherNameById.get(c.teacherUid) ?? c.teacherUid}
                          </p>
                          <p className="text-xs text-slate-500">
                            {c.subjects.join(', ') || 'no subjects on file'} · seniority{' '}
                            {c.seniority} · recent subs {c.recentSubLoad}
                          </p>
                          <p className="text-xs text-indigo-700">
                            {c.reasoning.join(' · ')}
                          </p>
                        </div>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          {c.score}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                {instructions && (
                  <div className="mt-3 space-y-2 rounded border border-indigo-100 bg-indigo-50 p-3 text-sm">
                    <Section label="5-minute recap" body={instructions.recap} />
                    <Section label="20-minute backup" body={instructions.backupActivity} />
                    <Section label="Classwork" body={instructions.classwork} />
                    {instructions.reminders.length > 0 && (
                      <div>
                        <h5 className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                          Reminders
                        </h5>
                        <ul className="list-inside list-disc text-sm text-slate-800">
                          {instructions.reminders.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TimetableCoverage timetables={timetables} weekdays={WEEKDAYS} />
    </div>
  );
}

function TimetableCoverage({
  timetables,
  weekdays,
}: {
  timetables: TeacherTimetable[];
  weekdays: Weekday[];
}) {
  if (timetables.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">No timetables on file yet.</p>
        <p className="mt-1 text-xs">
          Add timetable rows via PUT /api/substitutes/timetable for each teacher
          (CSV / inline editor lands in a follow-up). Without timetables, the
          finder treats every teacher as free — useful in a pinch but less precise.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Timetable coverage
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        {timetables.length} teacher{timetables.length === 1 ? '' : 's'} with a
        timetable on file. Days covered:
      </p>
      <ul className="mt-2 space-y-1 text-xs">
        {timetables.map((t) => {
          const daysCovered = weekdays.filter(
            (d) => (t.periods[d] ?? []).length > 0,
          );
          return (
            <li key={t.teacherUid} className="flex items-center justify-between">
              <span className="text-slate-700">{t.teacherUid.slice(0, 8)}…</span>
              <span className="text-slate-500">
                {t.subjects.join(', ') || 'no subjects'} · seniority {t.seniority} ·{' '}
                {daysCovered.join(', ') || 'no days'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <h5 className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
        {label}
      </h5>
      <p className="text-sm leading-relaxed text-slate-800">{body}</p>
    </div>
  );
}
