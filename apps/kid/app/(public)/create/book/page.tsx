import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BookStudioClient } from '@/components/studios/book/BookStudioClient';
import { CommunityStatsBanner } from '@/components/community/CommunityStatsBanner';

export const metadata: Metadata = {
  title: 'Book Studio — GSI AI Studio',
  description:
    'Write your own books with AI grammar help and illustrations. Stories, recipes, journals, poems — anything you can imagine in a book.',
};

export default function BookStudioPage() {
  return (
    <>
      {/* COMMUNITY-001 — book-scoped community banner above the studio
          frame. Floats over the studio's gradient header thanks to its
          own backdrop. */}
      <div className="pointer-events-none fixed left-1/2 top-3 z-30 -translate-x-1/2">
        <div className="pointer-events-auto">
          <CommunityStatsBanner scope="book" />
        </div>
      </div>
      <Suspense>
        <BookStudioClient />
      </Suspense>
    </>
  );
}
