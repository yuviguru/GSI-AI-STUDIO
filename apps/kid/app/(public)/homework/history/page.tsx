import type { Metadata } from 'next';
import { HomeworkHistoryClient } from './HomeworkHistoryClient';

export const metadata: Metadata = {
  title: 'Homework — GSI AI Studio',
  description:
    'Every homework session you have done with the bot — subject, score, and the full transcript of questions and answers.',
};

export default function HomeworkHistoryPage() {
  return <HomeworkHistoryClient />;
}
