'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardConfig, SidebarItem } from '@gsi/types';

interface Props {
  config: DashboardConfig;
}

function isActive(item: SidebarItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href;
}

function NavLink({
  item,
  pathname,
  indicatorId,
}: {
  item: SidebarItem;
  pathname: string;
  indicatorId: string;
}) {
  const active = isActive(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
        'text-sm font-medium transition-colors',
        active
          ? 'bg-brand-primary/8 text-brand-primary font-semibold'
          : 'text-brand-text-secondary hover:bg-gray-50 hover:text-brand-text',
      )}
    >
      {active && (
        <motion.span
          layoutId={indicatorId}
          className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand-primary"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && (
        <span className="ml-auto rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold text-brand-primary">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function ExpandableNavItem({
  item,
  pathname,
  indicatorId,
}: {
  item: SidebarItem;
  pathname: string;
  indicatorId: string;
}) {
  const Icon = item.icon;
  const childActive = item.children?.some((c) => isActive(c, pathname)) ?? false;
  const [open, setOpen] = useState(childActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5',
          'text-sm font-medium transition-colors',
          childActive
            ? 'bg-brand-primary/8 text-brand-primary font-semibold'
            : 'text-brand-text-secondary hover:bg-gray-50 hover:text-brand-text',
        )}
      >
        {childActive && (
          <motion.span
            layoutId={indicatorId}
            className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand-primary"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && item.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-5 mt-1 flex flex-col gap-0.5 border-l-2 border-gray-100 pl-3">
              {item.children.map((child) => {
                const active = isActive(child, pathname);
                const ChildIcon = child.icon;
                return (
                  <Link
                    key={child.id}
                    href={child.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                      active
                        ? 'bg-brand-primary/8 font-semibold text-brand-primary'
                        : 'text-brand-text-secondary hover:bg-gray-50 hover:text-brand-text',
                    )}
                  >
                    <ChildIcon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DashboardSidebar({ config }: Props) {
  const pathname = usePathname();
  const Cta = config.ctaCard;
  const indicatorId = `sidebar-indicator-${config.role}`;

  return (
    <aside
      className={cn(
        'hidden lg:flex',
        'fixed left-0 top-0 z-40 h-screen w-[220px]',
        'flex-col border-r border-gray-100 bg-white',
      )}
    >
      <Link href={config.brand.href} className="flex items-center gap-2.5 px-6 py-5">
        {config.brand.logoSrc && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={config.brand.logoSrc} alt={config.brand.name} className="h-8 w-auto" />
        )}
        <span className="font-display text-base font-bold text-brand-text">
          {config.brand.name}
        </span>
      </Link>

      <nav className="mt-2 flex flex-1 flex-col px-3">
        <div className="flex flex-col gap-0.5">
          {config.sidebar.primary.map((item) =>
            item.children?.length ? (
              <ExpandableNavItem
                key={item.id}
                item={item}
                pathname={pathname}
                indicatorId={indicatorId}
              />
            ) : (
              <NavLink
                key={item.id}
                item={item}
                pathname={pathname}
                indicatorId={indicatorId}
              />
            ),
          )}
        </div>

        <div className="flex-1" />

        {config.sidebar.secondary && config.sidebar.secondary.length > 0 && (
          <div className="flex flex-col gap-0.5 pb-2">
            {config.sidebar.secondary.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                pathname={pathname}
                indicatorId={indicatorId}
              />
            ))}
          </div>
        )}

        {Cta && (
          <div className="border-t border-gray-100 px-1 py-4">
            <Cta />
          </div>
        )}
      </nav>
    </aside>
  );
}
