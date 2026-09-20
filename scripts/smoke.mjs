/**
 * Browser smoke test for the auth and consent flows.
 *
 * Exists because a whole class of failure is invisible to every other check in
 * this repo: if the client bundle never reaches the browser, the server-rendered
 * page still looks perfect, but nothing hydrates and every button silently does
 * nothing. Typecheck, lint, the unit suite and `next build` all pass while the
 * app is unusable. The only way to catch it is to click something.
 *
 * Usage: `npm run dev`, then `npm run smoke` in another shell.
 * Override the target with SMOKE_URL.
 */
import { launch, reporter, requireApp, sleep } from './lib/browser.mjs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:43917';
const PORT = Number(process.env.SMOKE_DEBUG_PORT ?? 9222);

/** A unique address per run, so a rerun is not a returning student. */
const NEW_EMAIL = `smoke-${Date.now()}@uri.edu`;

await requireApp(BASE);

const { check, summary } = reporter();
const page = await launch({ base: BASE, port: PORT });
let ok = false;

try {
  // --- The page hydrates at all ---------------------------------------------
  await page.goto('/genius-mining');
  const boxChecked = await page.evaluate(`
    (() => {
      const box = document.querySelector('input[type="checkbox"]');
      if (!box) return false;
      box.click();
      return box.checked;
    })()
  `);
  check('consent checkbox responds to a click', boxChecked === true, 'proves hydration');

  await page.click('Start the questionnaire');
  await sleep(2500);
  check('consent advances to the questionnaire', (await page.here()) === '/genius-mining/questionnaire');

  // --- An unknown address is routed into onboarding -------------------------
  await page.goto('/login');
  await page.fill('input[type="email"]', NEW_EMAIL);
  await page.click('Email me a login link');
  await sleep(2500);
  check('login sends a link', await page.has('Check your inbox'));

  await page.click('Continue without the link', 'a');
  await sleep(3000);
  check('an unknown address lands in onboarding', (await page.here()) === '/signup?finish=1');
  check('onboarding explains why', await page.has('Your email is confirmed'));

  const backPresent = await page.evaluate(`
    [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Back')
  `);
  check('no Back button on the first step', backPresent === false);

  // --- Finishing writes the answers to the existing account -----------------
  await page.click('Student');
  await sleep(1200);
  await page.click('Music');
  await page.click('Continue');
  await sleep(1200);

  check(
    'plan step drops the email field',
    (await page.evaluate('!!document.querySelector("input[type=email]")')) === false
  );
  check('plan step drops the log-in footer', !(await page.has('Already have an account')));

  await page.click('Premium');
  await sleep(400);
  check('submit offers to finish, not to email a link', await page.has('Finish setting up my account'));

  await page.click('Finish setting up my account');
  await sleep(3500);
  check('finishing lands on welcome', (await page.here()) === '/welcome?new=1');
  check('welcome names the account', await page.has(NEW_EMAIL));

  await page.goto('/welcome');
  check(
    'the answers were saved, not just passed along',
    (await page.has(NEW_EMAIL)) && (await page.has('Premium'))
  );

  // --- A returning address skips onboarding ---------------------------------
  await page.goto('/login');
  await page.fill('input[type="email"]', NEW_EMAIL);
  await page.click('Email me a login link');
  await sleep(2500);
  check('a known address is recognized', await page.has('We already know this address'));
  await page.click('Continue without the link', 'a');
  await sleep(3000);
  check('a returning address skips onboarding', (await page.here()) === '/welcome');

  // --- Normal signup is unchanged -------------------------------------------
  await page.goto('/signup');
  check('signup still opens on its welcome step', await page.has('Welcome to CampusQuest'));
  check('signup is not in finishing mode', !(await page.has('Your email is confirmed')));
  await page.click("Let's go");
  await sleep(1200);
  await page.click('Student');
  await sleep(1200);
  await page.click('Music');
  await page.click('Continue');
  await sleep(1200);
  check(
    'signup still asks for an email',
    (await page.evaluate('!!document.querySelector("input[type=email]")')) === true
  );

  // --- The plan cards must not stay in three columns on a phone -------------
  // Three columns leaves about 120px a card at 390px, which cannot hold a price,
  // a tagline and a badge. They stack below `sm`.
  const planCards = 'button.relative.rounded-xl';

  await page.setViewport(390, 844);
  await sleep(600);
  const mobile = await page.boxes(planCards);
  check(
    'plan cards stack on a phone',
    mobile.length === 3 && mobile.every((c) => c.width > 300) && new Set(mobile.map((c) => c.top)).size === 3,
    mobile.map((c) => c.width).join(', ')
  );
  check('no horizontal overflow on a phone', (await page.overflowsHorizontally()) === false);

  await page.setViewport(1440, 900);
  await sleep(600);
  const desktop = await page.boxes(planCards);
  check(
    'plan cards stay in a row on a desktop',
    desktop.length === 3 && new Set(desktop.map((c) => c.top)).size === 1,
    desktop.map((c) => c.width).join(', ')
  );

  check('no console errors', page.consoleErrors.length === 0, page.consoleErrors.join(' | '));

  ok = summary();
} catch (error) {
  console.error(`\nSmoke test could not run: ${error.message}`);
} finally {
  await page.close();
}

process.exit(ok ? 0 : 1);
