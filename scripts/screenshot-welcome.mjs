import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const OUT = '.pr-assets/screenshots';
const BASE = 'http://localhost:3000/welcome';

// Each shot: jump to anchor (or scroll Y), wait briefly, viewport screenshot.
const SHOTS = [
  { name: '01-hero',           y: 0,        wait: 1200 },
  { name: '02-logobar',        y: 740,      wait: 500 },
  { name: '03-whatyoucanmake', y: 1100,     wait: 800 },
  { name: '04-bento',          y: 1500,     wait: 800 },
  { name: '05-aixray',         hash: '#x-ray',     wait: 900 },
  { name: '06-schools',        hash: '#schools',   wait: 900 },
  { name: '07-faq',            hash: '#faq',       wait: 700 },
  { name: '08-finalcta',       fullPageBottom: true, wait: 700 },
];

const main = async () => {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();

  console.log('navigating', BASE);
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  // Wait for hero text to render
  await page.waitForSelector('h1', { timeout: 30000 });
  await page.waitForTimeout(1500);

  for (const shot of SHOTS) {
    if (shot.hash) {
      await page.goto(BASE + shot.hash, { waitUntil: 'networkidle' });
    } else if (shot.fullPageBottom) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 900));
    } else {
      await page.evaluate((y) => window.scrollTo(0, y), shot.y);
    }
    await page.waitForTimeout(shot.wait);
    const file = join(OUT, `${shot.name}.png`);
    await page.screenshot({ path: file, fullPage: false, type: 'png' });
    console.log('wrote', file);
  }

  // Full-page screenshot too
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const fullPath = join(OUT, '00-full-page.png');
  await page.screenshot({ path: fullPath, fullPage: true, type: 'png' });
  console.log('wrote', fullPath);

  await browser.close();
};

main().catch((err) => {
  console.error('SCREENSHOT FAILED:', err);
  process.exit(1);
});
