/** Standard API response types */

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  /**
   * Optional structured payload — present on billing-related errors
   * (402 INSUFFICIENT_CREDITS, 403 FORBIDDEN_BY_PLAN) and any other
   * route that wants to ship machine-readable details alongside the
   * human message. Shape documented in `docs/api-contracts.md`.
   */
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/** AI Generation request types */

export interface StoryGenerateRequest {
  premise: string;
  characters?: string[];
  setting?: string;
  genre?: string;
  pages?: number;
  style?: string;
  ageGroup: string;
}

export interface MusicGenerateRequest {
  mood: string;
  genre: string;
  theme?: string;
  duration?: number;
  instruments?: string[];
  lyricsPrompt?: string;
  ageGroup: string;
}

export interface QuizGenerateRequest {
  topic: string;
  format?: 'trivia' | 'true_false' | 'fill_blank' | 'adventure';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  questionCount?: number;
  ageGroup: string;
}

/** Session types */

export interface SessionResponse {
  sessionId: string;
  creationsRemaining: number;
  cooldownSeconds: number;
  expiresAt: string;
}

/** Points & badge types */

export interface PointsResponse {
  aiPoints: number;
  badges: string[];
  newBadges: string[];
  conceptsLearned: string[];
  creationsByType: Record<string, number>;
  shareCount: number;
  /** Per-studio daily activity streaks. Keyed by studio creationType
   *  (`book`, `story`, `music`, `quiz`, `comic`, `game`). Drives per-studio
   *  streak displays + `studio_streak` badges. */
  perStudioStreaks?: Record<string, { count: number; lastDay: string }>;
}

/** Share types */

export interface ShareResponse {
  shareUrl: string;
  whatsappUrl: string;
  ogImage: string;
}
