/**
 * /admin/usage — cost telemetry dashboard.
 *
 * Reads the aggregate from `lib/cost/usageTracker.ts#getUsageSummary` over
 * the last 7 days. Renders provider breakdown, total cost, failure rates.
 *
 * Auth: cookie-based admin token (see lib/admin/guard.ts). Set the cookie
 * manually via dev tools for pilot — full Firebase admin claim flow in a
 * later iteration.
 */

import { isAdmin } from '@/lib/admin/guard';
import { getUsageSummary } from '@/lib/cost/usageTracker';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminUsagePage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  if (!isAdmin()) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">403 — Admin only</h1>
        <p className="mt-4 text-sm text-gray-600">
          Set the <code className="rounded bg-gray-100 px-1">gsi_admin_token</code>{' '}
          cookie to your <code className="rounded bg-gray-100 px-1">ADMIN_API_TOKEN</code> value
          to access this page.
        </p>
      </main>
    );
  }

  const days = Number(searchParams.days ?? 7);
  const summary = await getUsageSummary(days);

  const providers = Object.entries(summary.costByProvider).sort(
    (a, b) => b[1] - a[1],
  );
  const failures = Object.entries(summary.failuresByProvider).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <main className="mx-auto max-w-4xl p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">AI Usage</h1>
        <p className="mt-1 text-sm text-gray-600">
          Last {days} days · From the <code>aiUsage</code> collection (sampled to 1000 events)
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Total cost"
          value={`$${summary.totalCostUsd.toFixed(4)}`}
          sub={`≈ ₹${(summary.totalCostUsd * 84).toFixed(2)}`}
        />
        <Stat label="Events" value={summary.totalCreations.toString()} />
        <Stat
          label="Avg cost / event"
          value={
            summary.totalCreations === 0
              ? '—'
              : `$${(summary.totalCostUsd / summary.totalCreations).toFixed(5)}`
          }
        />
        <Stat
          label="Failures"
          value={Object.values(summary.failuresByProvider).reduce((s, n) => s + n, 0).toString()}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Cost by provider</h2>
        <Table
          rows={providers.map(([name, cost]) => [
            name,
            `$${cost.toFixed(5)}`,
            `${((cost / Math.max(summary.totalCostUsd, 0.000001)) * 100).toFixed(1)}%`,
          ])}
          headers={['Provider', 'Cost (USD)', '% of total']}
          empty="No paid AI calls in this window."
        />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Failures by provider</h2>
        <Table
          rows={failures.map(([name, count]) => [name, count.toString()])}
          headers={['Provider', 'Failure count']}
          empty="No failures in this window 🎉"
        />
      </section>

      <p className="mt-12 text-xs text-gray-500">
        ?days=N to change window. Telemetry source: lib/cost/usageTracker.ts
      </p>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function Table({
  rows,
  headers,
  empty,
}: {
  rows: string[][];
  headers: string[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-gray-500">{empty}</p>;
  }
  return (
    <table className="mt-3 w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
          {headers.map((h) => (
            <th key={h} className="py-2 pr-4 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-100">
            {row.map((cell, j) => (
              <td key={j} className="py-2 pr-4 font-mono">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
