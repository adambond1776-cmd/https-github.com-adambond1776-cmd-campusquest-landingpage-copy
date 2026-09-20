/**
 * Smoke test for the institutional page and the demand button.
 *
 * The button writes to a store and reads a count back, which is exactly the kind
 * of round trip a typecheck cannot see. It also asserts the page never claims a
 * partnership nobody has signed — that copy is a liability, not a bug, and it is
 * the sort of thing that creeps back in during a rewrite.
 */
import { launch, reporter, requireApp, sleep } from './lib/browser.mjs';

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:43917';

async function main() {
  await requireApp(BASE);

  const report = reporter();
  const page = await launch({ base: BASE, port: 9224, width: 1280, height: 900 });

  try {
    await page.goto('/institutions');

    report.check('page loads', (await page.here()) === '/institutions');
    report.check('leads with the programme name', await page.has('Level Up Rhode Island'));
    report.check('says three founding partners', await page.has('three founding partner'));
    report.check('quotes the seat price', await page.has('$25'));
    report.check(
      'refuses to claim a retention effect',
      await page.has('not going to tell you this fixes retention')
    );
    report.check('states whose IRB runs the study', await page.has("institution's IRB"));
    report.check(
      'promises covered students stop being charged',
      await page.has('refund the unused days')
    );

    // Nobody has signed. Naming a school as a partner is the copy risk here.
    const text = (await page.text()).toLowerCase();
    const claimsPartner = [
      'in partnership with the university of rhode island',
      'uri is a partner',
      'our partner, johnson',
    ].some((phrase) => text.includes(phrase));
    report.check('claims no partnership that is not signed', !claimsPartner);

    report.check('no horizontal overflow at 1280px', !(await page.overflowsHorizontally()));

    /* ---- the demand button ---- */

    const email = `smoke-${Date.now()}@uri.edu`;

    await page.evaluate(`
      (() => {
        const select = document.querySelector('#ask-campus');
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype, 'value'
        ).set;
        setter.call(select, 'uri');
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);
    await sleep(300);

    report.check('shows the running count once a school is picked', await page.has('already asked'));

    await page.fill('#ask-email', email);
    await sleep(200);

    report.check('records the ask', await page.click('Add me to the count'));
    await sleep(2500);

    report.check('confirms it counted', await page.has('Counted'));
    report.check('reports the campus total', await page.has('asked University of Rhode Island'));
    report.check(
      'says plainly that it emails nobody at the school',
      await page.has('not emailing anyone at your school')
    );

    /* ---- asking twice must not double-count ---- */

    report.check('offers to ask for another school', await page.click('Ask for a different school'));
    await sleep(400);

    await page.fill('#ask-email', email);
    await sleep(200);
    await page.click('Add me to the count');
    await sleep(2500);

    report.check('recognises a repeat ask', await page.has('already had you down'));

    /* ---- mobile ---- */

    await page.setViewport(390, 844);
    await page.goto('/institutions');

    report.check('no horizontal overflow at 390px', !(await page.overflowsHorizontally()));
    report.check('the form is still reachable on a phone', (await page.count('#ask-campus')) === 1);

    const fatal = page.consoleErrors.filter(
      (line) => !line.includes('favicon') && !line.includes('Download the React DevTools')
    );
    report.check('no console errors', fatal.length === 0, fatal[0] ?? '');
  } finally {
    await page.close();
  }

  process.exit(report.summary() ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
