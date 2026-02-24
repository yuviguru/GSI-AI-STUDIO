/** Standard API response types */

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
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

/** Share types */

export interface ShareResponse {
  shareUrl: string;
  whatsappUrl: string;
  ogImage: string;
}
