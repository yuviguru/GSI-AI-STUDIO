/**
 * Kid app tailwind config — extends the design tokens at the repo root.
 *
 * Content paths cover apps/kid's own routes plus the shared components/
 * directory and the @gsi/ui package so utility classes referenced by
 * shared code get picked up in this build.
 */
import { Config } from 'tailwindcss';
import baseConfig from '../../tailwind.config';

const config: Config = {
  ...baseConfig,
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
