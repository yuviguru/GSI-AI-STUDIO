import { AuthProvider } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

/**
 * Common (auth) layer — provides AuthProvider + ErrorBoundary for everything
 * under /teacher, /school, /parent, /kid (auth route group).
 *
 * The `(shell)` sub-group wraps pages in the dashboard shell.
 * The `(no-shell)` sub-group is for chrome-less pages like the teacher login.
 */
export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>{children}</AuthProvider>
    </ErrorBoundary>
  );
}
