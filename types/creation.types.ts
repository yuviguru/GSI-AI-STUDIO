/** Creation types matching Firestore schema */

export type CreationType = 'story' | 'music' | 'quiz' | 'game' | 'comic';
export type CreationStatus = 'draft' | 'published' | 'archived';

export interface StoryContent {
  pages: Array<{
    text: string;
    imageUrl: string;
    pageNumber: number;
  }>;
  genre: string;
  characters: string[];
  setting: string;
}

export interface MusicContent {
  audioUrl: string;
  duration: number;
  genre: string;
  mood: string;
  lyrics: string;
  instruments: string[];
  bpm: number;
}

export interface QuizContent {
  questions: Array<{
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }>;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  format: 'trivia' | 'true_false' | 'fill_blank' | 'adventure';
  totalQuestions: number;
}

export interface GameScene {
  id: string;
  title: string;
  text: string;
  choices: Array<{
    text: string;
    nextSceneId: string;
  }>;
  isEnding: boolean;
  endingType?: 'success' | 'neutral' | 'try_again';
  endingMessage?: string;
}

export interface GameContent {
  scenes: GameScene[];
  startSceneId: string;
  totalScenes: number;
  totalEndings: number;
  setting: string;
  characterName: string;
}

export type CreationContent = StoryContent | MusicContent | QuizContent | GameContent;

/** API response from POST /api/ai/story */
export interface StoryGenerateResponse {
  story: StoryContent & { title: string; moral: string };
  aiXray: AiXrayData;
  creationId: string;
  shareUrl: string;
}

export interface AiXrayData {
  model: string;
  concept: string;
  explanation: string;
  curriculumTag: string;
  aiPoints: number;
}

export interface Creation {
  id: string;
  type: CreationType;
  title: string;
  status: CreationStatus;
  prompt: string;
  content: CreationContent;
  media: Array<{ url: string; type: string; alt: string }>;
  thumbnail?: string;
  aiMetadata: AiXrayData;
  sessionId: string;
  userId?: string;
  kidId?: string;
  shareUrl?: string;
  viewCount: number;
  shareCount: number;
  downloadCount: number;
  likeCount: number;
  aiConceptsTaught: string[];
  curriculumTags: string[];
  templateId?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
