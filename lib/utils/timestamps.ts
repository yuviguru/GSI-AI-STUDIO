/** Defensive coercion for Firestore-timestamp-ish values.
 *
 *  The shared `ceo.types.ts` / `bot.types.ts` `Timestamp` alias is
 *  serialization-friendly: `{ seconds, nanoseconds } | string`. At runtime
 *  Firestore reads usually return a `firebase-admin` Timestamp *instance*
 *  with `.toMillis()`. But when the bundled Netlify function output is
 *  different from the SDK version the Admin SDK writes with, the returned
 *  object can end up as a plain POJO without the `.toMillis()` prototype.
 *  Netlify has shipped this failure mode on us more than once.
 *
 *  Call this helper instead of `.toMillis()` directly. Accepts:
 *    - `firebase-admin` Timestamp instances (`.toMillis()` path)
 *    - plain `{ seconds, nanoseconds }` POJOs (public shape)
 *    - plain `{ _seconds, _nanoseconds }` POJOs (internal shape that some
 *      serializers produce)
 *    - `Date` instances
 *    - ISO-8601 strings and numeric millis
 *    - `null` / `undefined` (returns 0)
 */
export function timestampToMillis(ts: unknown): number {
  if (ts == null) return 0;
  if (typeof ts === 'number') return ts;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'string') {
    const n = Date.parse(ts);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof ts === 'object') {
    const obj = ts as Record<string, unknown>;
    // `firebase-admin` Timestamp instance
    const maybeFn = obj.toMillis;
    if (typeof maybeFn === 'function') {
      const result = (maybeFn as () => number).call(obj);
      return typeof result === 'number' ? result : 0;
    }
    // Plain POJO — public `seconds`/`nanoseconds` OR internal `_seconds`/`_nanoseconds`.
    const secs = (obj.seconds ?? obj._seconds ?? 0) as number;
    const nanos = (obj.nanoseconds ?? obj._nanoseconds ?? 0) as number;
    if (typeof secs === 'number') {
      return secs * 1000 + Math.floor((typeof nanos === 'number' ? nanos : 0) / 1e6);
    }
  }
  return 0;
}
