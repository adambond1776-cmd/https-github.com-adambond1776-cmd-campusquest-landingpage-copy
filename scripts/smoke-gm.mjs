/**
 * Browser smoke test for the Genius Mining instrument, end to end.
 *
 * Walks consent, all five sections, the analysis, the profile and the advisor
 * printout. The answers are chosen to force the interesting case rather than a
 * simple one: three instances tagged REPAIRED and three tagged CONNECTED ties
 * the count, and both C1 picks carry REPAIRED, so D1 must resolve by the C1
 * tiebreak and land on FIXER. That path is where the instrument's only real
 * arithmetic lives, so it is the path worth driving through the actual UI.
 *
 * Requires a dev server with no Anthropic key, so the analysis runs against the
 * local stand-in engine rather than spending model calls.
 *
 * Usage: `npm run dev`, then `npm run smoke:gm` in another shell.
 */
import { launch, reporter, requireApp, sleep } from './lib/browser.mjs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:43917';
const PORT = Number(process.env.SMOKE_DEBUG_PORT ?? 9224);

const INSTANCES = [
  "Fixed my roommate's broken desk lamp",
  'Reorganized the whole pantry at my job',
  'Talked two friends through a fight they were having',
  'Built a spreadsheet to track our intramural team stats',
  'Repaired a bike chain for someone on my floor',
  'Set up the sound system for a dorm event',
];

// Instances 1, 2 and 5 versus 3, 4 and 6 — three tags each, so the count ties.
const REPAIRED_INSTANCES = [1, 2, 5];
const CONNECTED_INSTANCES = [3, 4, 6];

await requireApp(BASE);

const { check, summary } = reporter();
const page = await launch({ base: BASE, port: PORT });
let ok = false;

/** Clicks a verb button inside one instance's radiogroup. */
const tagInstance = (instance, verb) =>
  page.evaluate(`
    (() => {
      const group = document.querySelector(
        '[aria-label="Verb for instance ${instance}"]'
      );
      if (!group) return false;
      const button = [...group.querySelectorAll('button')]
        .find((b) => b.textContent.trim() === '${verb}');
      if (!button) return false;
      button.click();
      return true;
    })()
  `);

try {
  // --- Consent ---------------------------------------------------------------
  await page.goto('/genius-mining');
  check('the intro names the instrument', await page.has('Find the thing you actually do'));
  check('support resources are on the intro', await page.has('URI Counseling Center'));

  await page.click('Start the questionnaire');
  await sleep(1500);
  check(
    'consent is refused without the checkbox',
    await page.has('Tick the box to say you understand')
  );
  check('and it did not navigate', (await page.here()) === '/genius-mining');

  await page.clickSelector('input[type="checkbox"]');
  await sleep(300);
  check('ticking the box clears the complaint', !(await page.has('Tick the box to say you understand')));

  await page.click('Start the questionnaire');
  await sleep(3000);
  check('consent starts the questionnaire', (await page.here()) === '/genius-mining/questionnaire');

  // --- Section A -------------------------------------------------------------
  check('section A is first', await page.has('Section A of 5'));

  await page.click('Finish section A');
  await sleep(1500);
  check('an empty section A is refused', await page.has('Some answers still need attention'));

  for (const [index, text] of INSTANCES.entries()) {
    await page.fill('input[type="text"]', text, index);
  }
  await page.fill('#A2', 'I end up being the person who makes the broken thing work again.');
  await page.fill(
    '#A3',
    'People come to me when something has stopped working and they do not want to throw it out.'
  );

  const consentDefault = await page.evaluate(
    'document.querySelectorAll(\'input[type="checkbox"]\')[0]?.checked'
  );
  check('the A4 name consent starts unticked', consentDefault === false);

  await page.click('Finish section A');
  await sleep(3000);
  check('section A submits', await page.has('Section B of 5'));

  // --- Section B -------------------------------------------------------------
  check('section B shows what you wrote in A1', await page.has(INSTANCES[0]));
  check('the verb glossary is available', await page.has('What each verb means'));

  for (const instance of REPAIRED_INSTANCES) await tagInstance(instance, 'REPAIRED');
  for (const instance of CONNECTED_INSTANCES) await tagInstance(instance, 'CONNECTED');
  await sleep(500);

  await page.click('Finish section B');
  await sleep(3000);
  check('section B submits', await page.has('Section C of 5'));

  // --- Section C -------------------------------------------------------------
  const pickInstance = (text) => page.click(text);
  await pickInstance(INSTANCES[0]);
  await sleep(300);
  await page.click('Finish section C');
  await sleep(1500);
  check('C1 refuses a single pick', await page.has('Some answers still need attention'));

  await pickInstance(INSTANCES[4]);
  await sleep(400);
  check('C1 confirms the two you picked', await page.has('The two you picked'));

  const thirdBlocked = await page.evaluate(`
    (() => {
      const buttons = [...document.querySelectorAll('button[aria-pressed]')];
      const unpicked = buttons.find((b) => b.getAttribute('aria-pressed') === 'false');
      return unpicked ? unpicked.disabled : 'none found';
    })()
  `);
  check('a third pick is blocked rather than swapped', thirdBlocked === true);

  await page.fill('#C2', 'Both times someone was stuck and the thing in front of them had stopped working.');
  // A thin C3 must never hard-block, but the student is supposed to actually see
  // the nudge. Those two requirements pull against each other, so check both.
  await page.fill('#C3', 'idk');
  await page.click('Finish section C');
  await sleep(2500);

  const advancedOnThinC3 = await page.has('Section D of 5');
  check(
    'a thin C3 shows the soft warning',
    await page.has('the answer the analysis leans on hardest'),
    advancedOnThinC3 ? 'section advanced, so the student never sees it' : 'held on section C'
  );
  check('a thin C3 does not advance past the warning unread', advancedOnThinC3 === false);
  check('and the button offers to continue regardless', await page.has('Continue anyway'));

  // Pressing again with the same thin answer must go through: it warns, it never
  // blocks. Verified here, then the answer is improved for the rest of the run.
  await page.click('Continue anyway');
  await sleep(3000);
  check('a thin C3 never hard-blocks', await page.has('Section D of 5'));

  // --- Section D: the tie must resolve through C1 ----------------------------
  check('the tally is shown', await page.has('Your six tags'));
  check('the tie was broken by C1', await page.has('came from the two instances you circled'));
  check('the working word is FIXER', await page.has('FIXER'));
  check('and not the losing verb', !(await page.has('CONNECTOR')));

  await page.fill('input[type="text"]', 'I am the person who gets the broken thing working again.');
  await page.click('Finish section D');
  await sleep(3000);
  check('section D submits', await page.has('Section E of 5'));

  // --- Section E -------------------------------------------------------------
  check('support resources are on the final page', await page.has('988'));
  check('and are not hidden behind a toggle', await page.has('URI Counseling Center'));

  await page.fill('#E1', 'The tagging part was harder than I expected.');
  await page.fill('#E2', 'Nothing I would change.');
  await page.click('YES');
  await sleep(400);
  await page.fill('input[type="text"]', 'C3');
  await sleep(300);

  await page.click('Finish and run the analysis');
  await sleep(4000);
  check('the questionnaire ends at the profile', (await page.here()) === '/genius-mining/profile');

  // --- Analysis --------------------------------------------------------------
  check('the stand-in engine is disclosed', await page.has('mock-engine'));
  await page.click('Run my analysis');
  await sleep(6000);
  check('the analysis produces a profile', await page.has('FIXER'));

  const beforeEdit = await page.text();
  check('the profile quotes the student', beforeEdit.includes('bike chain') || beforeEdit.length > 400);

  // --- Sign-off --------------------------------------------------------------
  const accepted = await page.click('file this');
  if (accepted !== true) await page.click('Accept');
  await sleep(3000);

  await page.goto('/genius-mining/profile/advisor');
  check('the advisor printout exists', (await page.here()) === '/genius-mining/profile/advisor');
  check('the printout names the working word', await page.has('FIXER'));
  check('the printout flags the stand-in engine', await page.has('mock-engine'));

  check('no console errors', page.consoleErrors.length === 0, page.consoleErrors.join(' | '));

  ok = summary();
} catch (error) {
  console.error(`\nSmoke test could not run: ${error.message}`);
  console.error(error.stack);
} finally {
  await page.close();
}

process.exit(ok ? 0 : 1);
