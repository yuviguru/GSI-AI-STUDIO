'use client';

import type { RightRailWidget } from '@/types/dashboard.types';

interface Props {
  widgets: RightRailWidget[];
}

export function DashboardRightRail({ widgets }: Props) {
  if (widgets.length === 0) return null;
  return (
    <aside className="flex flex-col gap-4">
      {widgets.map(({ id, component: Widget }) => (
        <Widget key={id} />
      ))}
    </aside>
  );
}
