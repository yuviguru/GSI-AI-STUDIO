import type { CreationType } from '@gsi/types';

export interface Template {
  id: string;
  emoji: string;
  title: string;
  description: string;
  promptText: string;
  category: string;
  type: CreationType;
  settings?: Record<string, unknown>;
}
