/**
 * Pass-through layout for chrome-less authenticated routes (e.g. /teacher/login).
 * Inherits AuthProvider + ErrorBoundary from `app/(auth)/layout.tsx`.
 */
export default function NoShellLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">{children}</div>;
}
