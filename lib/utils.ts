import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a UUID v4 for anonymous sessions */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/** Format a creation count for display */
export function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

/** Kid-friendly error messages */
export function friendlyError(code: string): string {
  const messages: Record<string, string> = {
    RATE_LIMITED: "You're creating too fast! Take a quick break and try again soon. 🚀",
    UNSAFE_CONTENT: "Let's try a different idea! Think of something fun and creative. ✨",
    AI_GENERATION_FAILED: 'Oops! The AI got confused. Try again? 🤔',
    CREATION_LIMIT: "You've made lots of amazing things today! Come back tomorrow for more. 🌟",
    SESSION_EXPIRED: 'Your session ended. Refresh the page to start creating again!',
    NOT_FOUND: "We couldn't find that creation. It might have been removed.",
  };
  return messages[code] ?? 'Something went wrong. Please try again!';
}
