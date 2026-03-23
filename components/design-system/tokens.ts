/**
 * Design System Token Data
 * Source of truth for the visual reference page.
 * Values mirror tailwind.config.ts + docs/design-system.md
 */

// ─── Color Tokens ────────────────────────────────────────────

export interface ColorToken {
  token: string;
  name: string;
  hex: string;
  tailwind: string;
  usage: string;
}

export const brandColors: ColorToken[] = [
  { token: 'primary', name: 'Electric Indigo', hex: '#5B5FFF', tailwind: 'bg-brand-primary', usage: 'Primary buttons, progress indicators, active states' },
  { token: 'secondary', name: 'Teal Mint', hex: '#20C997', tailwind: 'bg-brand-secondary', usage: 'Success states, learning completion, positive reinforcement' },
  { token: 'accent', name: 'Warm Orange', hex: '#FF9F43', tailwind: 'bg-brand-accent', usage: 'Rewards, achievement highlights, CTA emphasis' },
  { token: 'ai', name: 'Soft Purple', hex: '#8A5CFF', tailwind: 'bg-brand-ai', usage: 'AI tools, intelligence features, smart suggestions' },
];

export const neutralColors: ColorToken[] = [
  { token: 'background', name: 'Page BG', hex: '#F7F8FC', tailwind: 'bg-brand-background', usage: 'Page background' },
  { token: 'surface', name: 'Card BG', hex: '#FFFFFF', tailwind: 'bg-brand-surface', usage: 'Card/panel backgrounds' },
  { token: 'soft', name: 'Section BG', hex: '#EEF1FF', tailwind: 'bg-brand-soft', usage: 'Soft section backgrounds, hover states' },
  { token: 'text', name: 'Dark Ink', hex: '#1E1E2F', tailwind: 'text-brand-text', usage: 'Headings, primary text' },
  { token: 'text-secondary', name: 'Gray', hex: '#6B7280', tailwind: 'text-brand-text-secondary', usage: 'Secondary text, labels' },
  { token: 'text-muted', name: 'Light Gray', hex: '#9CA3AF', tailwind: 'text-brand-text-muted', usage: 'Muted text, placeholders' },
  { token: 'border', name: 'Border', hex: '#E5E7EB', tailwind: 'border-brand-border', usage: 'Borders, dividers' },
];

export const stateColors: ColorToken[] = [
  { token: 'success', name: 'Success', hex: '#20C997', tailwind: 'text-brand-secondary', usage: 'Completion, correct answers' },
  { token: 'warning', name: 'Warning', hex: '#FF9F43', tailwind: 'text-brand-accent', usage: 'Caution, attention needed' },
  { token: 'error', name: 'Error', hex: '#FF6B6B', tailwind: 'text-brand-error', usage: 'Errors (friendly, not harsh)' },
  { token: 'info', name: 'Info', hex: '#5B5FFF', tailwind: 'text-brand-primary', usage: 'Information, tips' },
];

// ─── Gradient Tokens ─────────────────────────────────────────

export interface GradientToken {
  name: string;
  cssClass: string;
  from: string;
  to: string;
  usage: string;
}

export const primaryGradients: GradientToken[] = [
  { name: 'Primary', cssClass: 'gradient-primary', from: '#5B5FFF', to: '#8A5CFF', usage: 'Hero sections, highlighted cards, primary CTA' },
  { name: 'Gamification', cssClass: 'gradient-gamification', from: '#20C997', to: '#5B5FFF', usage: 'Mission cards, learning progress' },
  { name: 'Reward', cssClass: 'gradient-reward', from: '#FF9F43', to: '#FFD166', usage: 'Badges, rewards, unlock screens' },
  { name: 'AI', cssClass: 'gradient-ai', from: '#8A5CFF', to: '#5B5FFF', usage: 'AI feature cards, smart suggestions' },
];

export const studioGradients: GradientToken[] = [
  { name: 'Story Studio', cssClass: 'gradient-story', from: '#8A5CFF', to: '#5B5FFF', usage: 'Story creation studio' },
  { name: 'Music Studio', cssClass: 'gradient-music', from: '#FF9F43', to: '#FF6B6B', usage: 'Music creation studio' },
  { name: 'Quiz Studio', cssClass: 'gradient-quiz', from: '#5B5FFF', to: '#20C997', usage: 'Quiz creation studio' },
  { name: 'Game Studio', cssClass: 'gradient-game', from: '#20C997', to: '#5B5FFF', usage: 'Game creation studio' },
  { name: 'Comic Studio', cssClass: 'gradient-comic', from: '#FF9F43', to: '#FFD166', usage: 'Comic creation studio' },
];

// ─── Typography Tokens ───────────────────────────────────────

export interface FontToken {
  name: string;
  family: string;
  cssVar: string;
  tailwind: string;
  usage: string;
  sampleText: string;
}

export const fontFamilies: FontToken[] = [
  { name: 'Satoshi', family: 'Satoshi, system-ui, sans-serif', cssVar: '--font-display', tailwind: 'font-display', usage: 'Headings, display text, hero titles', sampleText: 'The quick brown fox jumps over the lazy dog' },
  { name: 'Figtree', family: 'Figtree, system-ui, sans-serif', cssVar: '--font-body', tailwind: 'font-body', usage: 'Body text, descriptions, buttons, labels', sampleText: 'The quick brown fox jumps over the lazy dog' },
  { name: 'JetBrains Mono', family: 'JetBrains Mono, monospace', cssVar: '--font-mono', tailwind: 'font-mono', usage: 'XP points, scores, stats, code snippets', sampleText: '1234567890 +200 XP Level 5' },
];

export interface TypeScaleToken {
  token: string;
  size: string;
  lineHeight: string;
  weight: string;
  font: string;
  tailwind: string;
  usage: string;
}

export const typeScale: TypeScaleToken[] = [
  { token: 'display-xl', size: '48px / 3rem', lineHeight: '1.1', weight: '800', font: 'Satoshi', tailwind: 'text-display-xl', usage: 'Hero headlines' },
  { token: 'display-lg', size: '40px / 2.5rem', lineHeight: '1.15', weight: '700', font: 'Satoshi', tailwind: 'text-display-lg', usage: 'Page titles' },
  { token: 'h1', size: '32px / 2rem', lineHeight: '1.2', weight: '700', font: 'Satoshi', tailwind: 'text-h1', usage: 'Section headings' },
  { token: 'h2', size: '26px / 1.625rem', lineHeight: '1.25', weight: '600', font: 'Satoshi', tailwind: 'text-h2', usage: 'Subsection headings' },
  { token: 'h3', size: '22px / 1.375rem', lineHeight: '1.3', weight: '600', font: 'Satoshi', tailwind: 'text-h3', usage: 'Card titles' },
  { token: 'h4', size: '18px / 1.125rem', lineHeight: '1.4', weight: '600', font: 'Satoshi', tailwind: 'text-h4', usage: 'Small headings' },
  { token: 'body-lg', size: '16px / 1rem', lineHeight: '1.6', weight: '400', font: 'Figtree', tailwind: 'text-body-lg', usage: 'Large body text' },
  { token: 'body', size: '14px / 0.875rem', lineHeight: '1.6', weight: '400', font: 'Figtree', tailwind: 'text-body', usage: 'Default body text' },
  { token: 'caption', size: '12px / 0.75rem', lineHeight: '1.5', weight: '400', font: 'Figtree', tailwind: 'text-caption', usage: 'Captions, labels' },
];

// ─── Spacing Tokens ──────────────────────────────────────────

export interface SpacingToken {
  token: string;
  px: number;
  rem: string;
  tailwind: string;
}

export const spacingScale: SpacingToken[] = [
  { token: 'xs', px: 4, rem: '0.25rem', tailwind: 'p-1' },
  { token: 'sm', px: 8, rem: '0.5rem', tailwind: 'p-2' },
  { token: 'md', px: 12, rem: '0.75rem', tailwind: 'p-3' },
  { token: 'lg', px: 16, rem: '1rem', tailwind: 'p-4' },
  { token: 'xl', px: 24, rem: '1.5rem', tailwind: 'p-6' },
  { token: '2xl', px: 32, rem: '2rem', tailwind: 'p-8' },
  { token: '3xl', px: 48, rem: '3rem', tailwind: 'p-12' },
  { token: '4xl', px: 64, rem: '4rem', tailwind: 'p-16' },
];

// ─── Border Radius Tokens ────────────────────────────────────

export interface RadiusToken {
  token: string;
  px: string;
  tailwind: string;
  usage: string;
}

export const radiusScale: RadiusToken[] = [
  { token: 'sm', px: '8px', tailwind: 'rounded-sm', usage: 'Small elements, badges, tags' },
  { token: 'md', px: '12px', tailwind: 'rounded-md', usage: 'Inputs, small cards' },
  { token: 'lg', px: '16px', tailwind: 'rounded-lg', usage: 'Standard cards, buttons' },
  { token: 'xl', px: '24px', tailwind: 'rounded-xl', usage: 'Large cards, modals' },
  { token: '2xl', px: '32px', tailwind: 'rounded-2xl', usage: 'Hero cards, featured elements' },
  { token: 'full', px: '9999px', tailwind: 'rounded-full', usage: 'Avatars, circular elements' },
];

// ─── Shadow Tokens ───────────────────────────────────────────

export interface ShadowToken {
  token: string;
  value: string;
  tailwind: string;
  usage: string;
  interactive?: boolean;
  hoverTailwind?: string;
}

export const shadowScale: ShadowToken[] = [
  { token: 'soft', value: '0 4px 12px rgba(0,0,0,0.05)', tailwind: 'shadow-soft', usage: 'Subtle elevation (tags, badges)' },
  { token: 'card', value: '0 10px 25px rgba(0,0,0,0.08)', tailwind: 'shadow-card', usage: 'Default card elevation', interactive: true, hoverTailwind: 'hover:shadow-card-hover' },
  { token: 'card-hover', value: '0 15px 35px rgba(0,0,0,0.12)', tailwind: 'shadow-card-hover', usage: 'Card hover state' },
  { token: 'button', value: '0 6px 14px rgba(0,0,0,0.10)', tailwind: 'shadow-button', usage: 'Primary buttons', interactive: true, hoverTailwind: 'hover:shadow-button-hover' },
  { token: 'button-hover', value: '0 8px 20px rgba(0,0,0,0.15)', tailwind: 'shadow-button-hover', usage: 'Button hover state' },
  { token: 'elevated', value: '0 20px 40px rgba(0,0,0,0.12)', tailwind: 'shadow-elevated', usage: 'Modals, overlays, dropdowns' },
  { token: 'inner', value: 'inset 0 2px 4px rgba(0,0,0,0.05)', tailwind: 'shadow-inner', usage: 'Inset inputs, wells' },
];

// ─── Button Tokens ───────────────────────────────────────────

export interface ButtonVariant {
  name: string;
  cssClass: string;
  description: string;
}

export const buttonVariants: ButtonVariant[] = [
  { name: 'Primary', cssClass: 'btn-primary', description: 'Electric Indigo fill, white text, shadow' },
  { name: 'Secondary', cssClass: 'btn-secondary', description: 'White fill, indigo border + text' },
  { name: 'Ghost', cssClass: 'btn-ghost', description: 'Transparent, indigo text, soft hover' },
  { name: 'Reward', cssClass: 'btn-reward', description: 'Orange→Gold gradient, white text' },
];

export const buttonSizes = [
  { name: 'Small', cssClass: 'btn-sm', height: '36px' },
  { name: 'Medium', cssClass: 'btn-md', height: '44px' },
  { name: 'Large', cssClass: 'btn-lg', height: '52px' },
];

// ─── Animation Tokens ────────────────────────────────────────

export interface AnimationToken {
  name: string;
  tailwind: string;
  duration: string;
  description: string;
}

export const animations: AnimationToken[] = [
  { name: 'Float', tailwind: 'animate-float', duration: '3s infinite', description: 'Decorative elements, floating icons' },
  { name: 'Sparkle', tailwind: 'animate-sparkle', duration: '1.5s infinite', description: 'Achievement unlock, highlight' },
  { name: 'Slide Up', tailwind: 'animate-slide-up', duration: '400ms once', description: 'Entrance animation for cards/sections' },
  { name: 'Fade In', tailwind: 'animate-fade-in', duration: '300ms once', description: 'Subtle element appearance' },
  { name: 'Scale Pop', tailwind: 'animate-scale-pop', duration: '150ms once', description: 'Button press feedback' },
];

// ─── Sidebar Navigation ─────────────────────────────────────

export interface SidebarSection {
  id: string;
  label: string;
  icon: string;
}

export const sidebarSections: SidebarSection[] = [
  { id: 'colors', label: 'Colors', icon: '🎨' },
  { id: 'gradients', label: 'Gradients', icon: '🌈' },
  { id: 'typography', label: 'Typography', icon: '🔤' },
  { id: 'spacing', label: 'Spacing', icon: '📏' },
  { id: 'border-radius', label: 'Border Radius', icon: '⬜' },
  { id: 'shadows', label: 'Shadows', icon: '💠' },
  { id: 'buttons', label: 'Buttons', icon: '🔘' },
  { id: 'cards', label: 'Cards', icon: '🃏' },
  { id: 'animations', label: 'Animations', icon: '✨' },
  { id: 'gamification', label: 'Gamification', icon: '🏆' },
];
