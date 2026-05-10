/**
 * /admin/health — provider health snapshot.
 *
 * Reads from the in-memory HealthMonitor cache. Per-lambda state means
 * this only reflects the container that served the request — useful for
 * debugging "is Groq down?" but not a global view. Long-term: persist
 * health to Firestore for a true cross-container snapshot.
 */

import { isAdmin } from '@/lib/admin/guard';
import { llmRouter, imageRouter } from '@/lib/ai/router';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminHealthPage() {
  if (!isAdmin()) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">403 — Admin only</h1>
      </main>
    );
  }

  // Force a fresh snapshot for this request — useful when debugging.
  // Provider health is per-lambda; this is the view from THIS container.
  const llm = llmRouter.health();
  const image = imageRouter.health();

  return (
    <main className="mx-auto max-w-4xl p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Provider Health</h1>
        <p className="mt-1 text-sm text-gray-600">
          In-memory snapshot from this serverless container only.
          Healthy = either probed-OK or assumed-OK pre-probe (fail-open).
        </p>
      </header>

      <Section title="LLM providers" providers={llm} />
      <Section title="Image providers" providers={image} />

      <p className="mt-12 text-xs text-gray-500">
        Source: lib/ai/router/{`{LlmRouter,ImageRouter}`}.health()
      </p>
    </main>
  );
}

function Section({
  title,
  providers,
}: {
  title: string;
  providers: Array<{ name: string; priority: number; costTier: string; healthy: boolean }>;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {providers.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">None configured.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4 font-medium">Provider</th>
              <th className="py-2 pr-4 font-medium">Priority</th>
              <th className="py-2 pr-4 font-medium">Cost tier</th>
              <th className="py-2 pr-4 font-medium">Health</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.name} className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono">{p.name}</td>
                <td className="py-2 pr-4 font-mono">{p.priority}</td>
                <td className="py-2 pr-4 font-mono">{p.costTier}</td>
                <td className="py-2 pr-4">
                  {p.healthy ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                      healthy
                    </span>
                  ) : (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">
                      unhealthy
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
