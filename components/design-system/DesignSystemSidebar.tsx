'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { sidebarSections } from './tokens';

export function DesignSystemSidebar() {
  const [activeSection, setActiveSection] = useState('colors');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    for (const section of sidebarSections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:block fixed top-[57px] left-0 w-60 h-[calc(100vh-57px)] overflow-y-auto border-r border-brand-border bg-white p-4">
        <p className="text-caption font-semibold text-brand-text-muted uppercase tracking-wider mb-3">
          Sections
        </p>
        <ul className="space-y-0.5">
          {sidebarSections.map((section) => (
            <li key={section.id}>
              <button
                onClick={() => scrollTo(section.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-left',
                  activeSection === section.id
                    ? 'bg-brand-soft text-brand-primary'
                    : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-background'
                )}
              >
                <span className="text-base">{section.icon}</span>
                <span>{section.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile horizontal nav */}
      <nav className="lg:hidden sticky top-[57px] z-40 bg-white/90 backdrop-blur-md border-b border-brand-border">
        <div className="flex overflow-x-auto px-4 py-2 gap-2 scrollbar-hide">
          {sidebarSections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollTo(section.id)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap',
                activeSection === section.id
                  ? 'bg-brand-primary text-white'
                  : 'bg-brand-soft text-brand-text-secondary hover:text-brand-text'
              )}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
