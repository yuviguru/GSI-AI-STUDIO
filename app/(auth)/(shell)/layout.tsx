'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DashboardShell } from '@/components/navigation';
import { teacherDashboardConfig } from '@/lib/dashboard/configs/teacher.config';
import { schoolAdminDashboardConfig } from '@/lib/dashboard/configs/schoolAdmin.config';
import { parentDashboardConfig } from '@/lib/dashboard/configs/parent.config';
import type { DashboardConfig } from '@/types/dashboard.types';

function pickConfig(role: string | undefined, pathname: string): DashboardConfig {
  // Path-based override: parent-only routes always use the parent shell
  // (e.g. /kid/class/.../feed lives under (auth) but is parent-facing).
  if (pathname.startsWith('/parent') || pathname.startsWith('/kid/class')) {
    return parentDashboardConfig;
  }
  if (pathname.startsWith('/school')) {
    // Default to school admin chrome for /school/*; teachers may visit /school
    // pages but the school admin chrome is the common parent.
    return schoolAdminDashboardConfig;
  }
  if (pathname.startsWith('/teacher')) {
    // Role-based: schoolAdmins inside teacher pages still get teacher shell;
    // they have an explicit /school link in the secondary nav.
    return teacherDashboardConfig;
  }

  // Fall back on role for shared routes (e.g. /notifications).
  if (role === 'schoolAdmin') return schoolAdminDashboardConfig;
  if (role === 'teacher') return teacherDashboardConfig;
  if (role === 'parent') return parentDashboardConfig;
  return teacherDashboardConfig;
}

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const config = pickConfig(user?.role, pathname);

  return <DashboardShell config={config}>{children}</DashboardShell>;
}
