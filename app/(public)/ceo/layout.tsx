import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kid CEO — Run Your First Business | GSI AI Studio',
  description:
    'Run your first business before you spend a rupee. For kids age 10+.',
};

export default function CeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
