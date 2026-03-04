import type { Metadata } from 'next';
import { GameStudioClient } from './GameStudioClient';

export const metadata: Metadata = {
  title: 'Game Studio — GSI AI Studio',
  description: 'Create text adventure games with AI. Describe a scenario and AI builds a branching story with choices and multiple endings!',
};

export default function GameStudioPage() {
  return <GameStudioClient />;
}
