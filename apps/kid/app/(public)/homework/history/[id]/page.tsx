import type { Metadata } from 'next';
import { HomeworkTranscriptClient } from './HomeworkTranscriptClient';

export const metadata: Metadata = {
  title: 'Homework Transcript — GSI AI Studio',
  description:
    'Full transcript of a homework session — every question, every attempt, and whether the answer was revealed.',
};

export default function HomeworkTranscriptPage({
  params,
}: {
  params: { id: string };
}) {
  return <HomeworkTranscriptClient id={params.id} />;
}
