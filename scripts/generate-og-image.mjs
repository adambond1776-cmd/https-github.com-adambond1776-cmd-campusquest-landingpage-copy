/**
 * Renders scripts/og-image.html to public/og-image.png at the 1200x630 size
 * link previews expect. Headless Chrome is used so the card picks up the same
 * webfont and gradients the site itself renders with.
 *
 * Usage: npm run og
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, 'og-image.html');
const output = resolve(here, '..', 'public', 'og-image.png');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser',
].filter(Boolean);

function resolveChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'ignore' });
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error(
    'No Chrome or Chromium binary found. Install one, or set CHROME_PATH to its location.'
  );
}

const chrome = resolveChrome();
mkdirSync(dirname(output), { recursive: true });

// Chrome insists on a dedicated profile directory, and reuses a stale one if
// left to pick its own.
const profile = mkdtempSync(join(tmpdir(), 'campusquest-og-'));

try {
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      `--user-data-dir=${profile}`,
      '--window-size=1200,630',
      // Lets the Google Fonts request finish before the frame is captured.
      '--virtual-time-budget=8000',
      `--screenshot=${output}`,
      `file://${source}`,
    ],
    // Chrome reliably writes the file well inside this window; the timeout
    // exists only to bound the hang described below.
    { stdio: ['ignore', 'inherit', 'ignore'], timeout: 45_000 }
  );
} catch (error) {
  // Headless Chrome writes the screenshot and then sometimes fails to tear
  // itself down. A produced file means the render itself succeeded.
  if (!existsSync(output)) {
    throw error;
  }
} finally {
  rmSync(profile, { recursive: true, force: true });
}

if (!existsSync(output)) {
  throw new Error(`Chrome exited without writing ${output}`);
}

console.log(`Wrote ${output}`);
