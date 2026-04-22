import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { ceoAgentAcceptSchema } from '@/lib/validators';
import {
  acceptArtifact,
  getArtifact,
} from '@/lib/firebase/ceoArtifactService';
import type { CeoArtifactAsset } from '@/types';

/**
 * POST /api/ceo/agents/accept
 *
 * Accepts a specific subset of candidate assets from an artifact. Writes
 * atomically: artifact → 'accepted', selected assets stored on the
 * artifact, AND (for BRAND-like flows) derived fields merged into
 * `business.brandAssets`.
 *
 * Selection mapping:
 *   `selections = { logo: 2, motto: 0 }` means "pick logo candidate #2,
 *   motto candidate #0". Selector keys match the `kind` of the asset
 *   (e.g. `logo`, `motto`, `voice`).
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);
    const body = await request.json();
    const { artifactId, selections, attachTo } = ceoAgentAcceptSchema.parse(body);

    const artifact = await getArtifact(artifactId);
    if (artifact.kidId !== kidId || artifact.userId !== userId) {
      throw new AppException('FORBIDDEN', 'Not your artifact', 403);
    }
    if (artifact.status !== 'candidate') {
      throw new AppException(
        'ARTIFACT_NOT_ACCEPTABLE',
        `Artifact is already ${artifact.status}`,
        400,
      );
    }

    // Resolve selections → actual assets. Keys can either be an asset
    // `kind` (filter by kind, pick Nth match) OR — when selections is
    // empty — we take all candidates as-is (legacy behaviour).
    const selectedKeys = Object.keys(selections);
    const finalAssets: CeoArtifactAsset[] =
      selectedKeys.length === 0
        ? artifact.assets
        : selectKinds(artifact.assets, selections);

    if (finalAssets.length === 0) {
      throw new AppException(
        'INVALID_SELECTIONS',
        'Selections must resolve to at least one asset.',
        400,
      );
    }

    const accepted = await acceptArtifact({
      artifactId,
      finalAssets,
      attachTo,
    });

    return apiSuccess({ artifact: accepted });
  } catch (error) {
    return handleApiError(error);
  }
}

function selectKinds(
  candidates: CeoArtifactAsset[],
  selections: Record<string, number>,
): CeoArtifactAsset[] {
  const result: CeoArtifactAsset[] = [];
  for (const [kind, index] of Object.entries(selections)) {
    const matchingKind = candidates.filter((a) => kindOf(a) === kind);
    const pick = matchingKind[index];
    if (pick) result.push(pick);
  }
  // De-dupe: an asset that matched multiple selection slots is kept once.
  return Array.from(new Set(result));
}

function kindOf(asset: CeoArtifactAsset): string {
  switch (asset.type) {
    case 'image':
    case 'text':
      return asset.kind;
    case 'palette':
      return 'palette';
    case 'schedule':
      return 'schedule';
    case 'pricing_strategy':
      return 'pricing_strategy';
    default: {
      // Exhaustiveness guard — keeps the compiler honest if we add a new
      // asset variant without updating this switch.
      const _never: never = asset;
      void _never;
      return 'unknown';
    }
  }
}

export const dynamic = 'force-dynamic';
