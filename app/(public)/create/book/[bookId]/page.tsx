import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BookEditorClient } from '../BookEditorClient';

export const metadata: Metadata = {
  title: 'Book Editor — GSI AI Studio',
};

export default function BookEditorPage({
  params,
}: {
  params: { bookId: string };
}) {
  return (
    <Suspense>
      <BookEditorClient bookId={params.bookId} />
    </Suspense>
  );
}
