import type { AuthContext } from '@gsi/types';
import { AppException } from '@/lib/api-utils';
import { adminDb } from '@gsi/firebase/admin';

/**
 * Ensure the authed user owns the kid (or is an admin/schoolAdmin who can
 * touch any kid). Used by billing endpoints — only the parent should be
 * able to read or modify their kid's wallet.
 *
 * Throws AppException on 403/404; returns silently on success.
 */
export async function requireKidOwnership(
  auth: Pick<AuthContext, 'userId' | 'role' | 'plan'>,
  kidId: string,
): Promise<void> {
  // Admin bypass — internal team can touch any kid (support, reconciliation).
  if (auth.plan === 'admin' || auth.role === 'schoolAdmin') return;

  const snap = await adminDb.collection('kids').doc(kidId).get();
  if (!snap.exists) throw new AppException('NOT_FOUND', 'Kid profile not found', 404);

  if (snap.data()?.parentId !== auth.userId) {
    throw new AppException('FORBIDDEN', 'That kid profile does not belong to you', 403);
  }
}
