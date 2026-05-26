/**
 * Scheduled daily refresh of per-school analytics caches.
 *
 * Runs at 02:00 UTC (≈07:30 IST — after overnight creation bursts settle).
 * Walks every school in the `schools` collection and re-aggregates its
 * metrics into `schoolAnalytics/{schoolId}`. The admin dashboard reads
 * from the cache; on-demand `?refresh=1` calls run the same aggregation
 * but bypass the cache.
 *
 * Idempotent: safe to call manually at any time with BOT_SETUP_SECRET.
 */

import type { Handler } from '@netlify/functions';
import { schedule } from '@netlify/functions';
import { adminDb } from '@gsi/firebase/admin';
import { refreshSchoolAnalytics } from '@gsi/firebase/analyticsService';
import { isAuthorizedCronCall } from '../../../../lib/netlify-cron-auth';

const DEPLOY_SECRET = process.env.BOT_SETUP_SECRET;

const baseHandler: Handler = async (event) => {
  if (!isAuthorizedCronCall(event, DEPLOY_SECRET)) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const started = Date.now();
  const schoolsSnap = await adminDb.collection('schools').get();
  const results: { schoolId: string; ok: boolean; error?: string }[] = [];

  for (const doc of schoolsSnap.docs) {
    try {
      await refreshSchoolAnalytics(doc.id);
      results.push({ schoolId: doc.id, ok: true });
    } catch (err) {
      results.push({
        schoolId: doc.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const elapsedMs = Date.now() - started;
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schoolsProcessed: results.length,
      failures: results.filter((r) => !r.ok).length,
      elapsedMs,
      results,
    }),
  };
};

// 02:00 UTC daily — after most overnight activity has landed.
export const handler = schedule('0 2 * * *', baseHandler);
