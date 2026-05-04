import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BookStudioClient } from '@/components/studios/book/BookStudioClient';

export const metadata: Metadata = {
  title: 'Book Studio — GSI AI Studio',
  description:
    'Write your own books with AI grammar help and illustrations. Stories, recipes, journals, poems — anything you can imagine in a book.',
};

export default function BookStudioPage() {
  return (
    <Suspense>
      <BookStudioClient />
    </Suspense>
  );
}
