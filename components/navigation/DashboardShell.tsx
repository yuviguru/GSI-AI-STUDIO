'use client';

import { DashboardSidebar } from './DashboardSidebar';
import { DashboardRightRail } from './DashboardRightRail';
import type { DashboardConfig } from '@gsi/types';

interface Props {
  config: DashboardConfig;
  children: React.ReactNode;
}

/**
 * 3-column dashboard shell — sidebar (left) + center column (children) + right rail.
 *
 * Responsive contract: see docs/ux-patterns.md "Responsive Layout Contract".
 * - < lg: single column, sidebar hidden, right rail stacked below
 * - lg: sidebar fixed (220px), main content offset, right rail visible
 * - 2xl+: content capped at 1600px max-width
 */
export function DashboardShell({ config, children }: Props) {
  const hasRightRail = config.rightRailWidgets.length > 0;

  return (
    <div className="min-h-screen bg-brand-background">
      <DashboardSidebar config={config} />

      <div className="lg:pl-[220px]">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          {config.topStrip}

          {hasRightRail ? (
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
              <main className="min-w-0">{children}</main>
              <div className="mt-6 lg:mt-0">
                <DashboardRightRail widgets={config.rightRailWidgets} />
              </div>
            </div>
          ) : (
            <main className="min-w-0">{children}</main>
          )}
        </div>
      </div>
    </div>
  );
}
