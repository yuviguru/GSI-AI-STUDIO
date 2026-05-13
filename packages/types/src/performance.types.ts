/**
 * Performance types — kid-recorded responses to creations (PERF-001).
 * See docs/data-model.md#performances.
 */

import type { CreationType } from './creation.types';
import type { AssetModeration } from './asset.types';

export type PerformanceKind =
  | 'sing_along'
  | 'reading'
  | 'voice_memo'
  | 'reaction';

export type PerformanceStatus =
  | 'draft'
  | 'published'
  | 'flagged'
  | 'archived';

export type PerformanceVisibility = 'private' | 'public' | 'class';

export interface Performance {
  id: string;
  kind: PerformanceKind;
  parentCreationId?: string;
  parentCreationType?: CreationType;
  audioAssetId: string;
  videoAssetId?: string;
  ownerSessionId: string;
  ownerKidId?: string;
  ownerKidName?: string;
  ownerKidAvatar?: string;
  durationSec: number;
  caption?: string;
  visibility: PerformanceVisibility;
  status: PerformanceStatus;
  moderation: AssetModeration;
  viewCount: number;
  likeCount: number;
  reactionCounts: Record<string, number>;
  shareUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Public-feed view: performance + parent creation summary + URLs */
export interface PerformanceFeedItem {
  id: string;
  kind: PerformanceKind;
  parentCreation?: {
    id: string;
    type: CreationType;
    title: string;
    thumbnail?: string;
  };
  audioUrl: string;
  videoUrl?: string;
  durationSec: number;
  kid: {
    name: string;
    avatar?: string;
  };
  caption?: string;
  visibility: PerformanceVisibility;
  status: PerformanceStatus;
  viewCount: number;
  likeCount: number;
  reactionCounts: Record<string, number>;
  myReaction?: string;
  shareUrl: string;
  createdAt: Date;
}

/** Request body for POST /api/performances */
export interface CreatePerformanceRequest {
  kind: PerformanceKind;
  parentCreationId?: string;
  audioAssetId: string;
  videoAssetId?: string;
  durationSec: number;
  caption?: string;
  visibility?: PerformanceVisibility;
}

/** Response from POST /api/performances */
export interface CreatePerformanceResponse {
  performance: Performance;
  shareUrl: string;
}
