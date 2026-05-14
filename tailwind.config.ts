import type { Config } from 'tailwindcss';

/**
 * GSI AI Studio — Design System Tokens
 * @see docs/design-system.md for full specification
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // --- Breakpoints (Responsive Layout Contract) ---
      // Defaults sm/md/lg/xl/2xl preserved so existing code doesn't shift.
      screens: {
        xs: '360px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
        landscape: { raw: '(orientation: landscape)' },
        portrait: { raw: '(orientation: portrait)' },
        short: { raw: '(max-height: 480px)' },
      },

      colors: {
        // --- Brand Colors (Design System §3) ---
        brand: {
          primary: '#5B5FFF',       // Electric Indigo — buttons, active states
          secondary: '#20C997',     // Teal Mint — success, completion
          accent: '#FF9F43',        // Warm Orange — rewards, CTAs
          ai: '#8A5CFF',            // Soft Purple — AI features
          background: '#F7F8FC',    // Page background
          surface: '#FFFFFF',       // Card/panel surface
          soft: '#EEF1FF',          // Soft section backgrounds
          text: '#1E1E2F',          // Primary text
          'text-secondary': '#6B7280', // Secondary text
          'text-muted': '#9CA3AF',  // Muted text
          error: '#FF6B6B',         // Friendly error red
          border: '#E5E7EB',        // Borders, dividers
          // Legacy aliases (use sparingly during migration)
          purple: '#5B5FFF',
          orange: '#FF9F43',
          cyan: '#20C997',
        },
        // --- shadcn/ui compatible tokens ---
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        ring: 'hsl(var(--ring))',
      },

      // --- Typography (Design System §5) ---
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': ['3rem', { lineHeight: '1.1', fontWeight: '800' }],
        'display-lg': ['2.5rem', { lineHeight: '1.15', fontWeight: '700' }],
        'h1': ['2rem', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['1.625rem', { lineHeight: '1.25', fontWeight: '600' }],
        'h3': ['1.375rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h4': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['0.875rem', { lineHeight: '1.6', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }],
      },

      // --- Border Radius (Design System §7) ---
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
      },

      // --- Shadows (Design System §8) ---
      boxShadow: {
        'card': '0 10px 25px rgba(0,0,0,0.08)',
        'card-hover': '0 15px 35px rgba(0,0,0,0.12)',
        'elevated': '0 20px 40px rgba(0,0,0,0.12)',
        'button': '0 6px 14px rgba(0,0,0,0.10)',
        'button-hover': '0 8px 20px rgba(0,0,0,0.15)',
        'soft': '0 4px 12px rgba(0,0,0,0.05)',
        'inner': 'inset 0 2px 4px rgba(0,0,0,0.05)',
      },

      // --- Animations (Design System §15) ---
      animation: {
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s cubic-bezier(0, 0, 0.2, 1)',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-pop': 'scalePop 0.15s ease-out',
        'progress-fill': 'progressFill 0.5s ease-out',
      },
      keyframes: {
        sparkle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scalePop: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        progressFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-target, 100%)' },
        },
      },

      // --- Spacing extras (Design System §6) ---
      spacing: {
        '18': '4.5rem',  // 72px
        '88': '22rem',   // 352px — sidebar width
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
