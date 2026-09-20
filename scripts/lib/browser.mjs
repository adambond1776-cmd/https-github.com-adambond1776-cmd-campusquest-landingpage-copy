/**
 * A small headless-browser harness over the Chrome DevTools Protocol.
 *
 * Deliberately dependency-free: Node's WebSocket plus CDP covers everything the
 * smoke tests need, and a browser automation library is a large thing to install
 * for a handful of clicks.
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser',
].filter(Boolean);

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function resolveChrome() {
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

/** Aborts the run with a clear message rather than a wall of failed assertions. */
export async function requireApp(base) {
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`responded ${res.status}`);
  } catch (error) {
    console.error(`No app at ${base} — ${error.message}`);
    console.error('Start it with `npm run dev`, or point SMOKE_URL somewhere else.');
    process.exit(1);
  }
}

export function reporter() {
  const results = [];

  return {
    check(name, passed, detail = '') {
      results.push({ name, passed });
      console.log(`${passed ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
    },
    summary() {
      const failed = results.filter((r) => !r.passed);
      console.log(`\n${results.length - failed.length}/${results.length} passed`);
      return failed.length === 0;
    },
  };
}

export async function launch({ base, port = 9222, width, height }) {
  const profile = mkdtempSync(join(tmpdir(), 'campusquest-smoke-'));
  const args = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
  ];
  if (width && height) args.push(`--window-size=${width},${height}`);
  args.push('about:blank');

  const chrome = spawn(resolveChrome(), args, { stdio: 'ignore' });

  let debuggerUrl;
  for (let attempt = 0; attempt < 40 && !debuggerUrl; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      debuggerUrl = (await res.json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch {
      // Chrome is not listening yet.
    }
    if (!debuggerUrl) await sleep(250);
  }
  if (!debuggerUrl) throw new Error('Chrome never exposed a debuggable page.');

  const ws = new WebSocket(debuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const consoleErrors = [];

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id !== undefined) {
      pending.get(msg.id)?.(msg);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      consoleErrors.push(msg.params.entry.text);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  // `--window-size` does not reliably give the layout viewport a headless run
  // reports, and a responsive check measured at the wrong width is worse than no
  // check. Emulation pins it exactly.
  if (width && height) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return res.result?.result?.value;
  };

  const page = {
    consoleErrors,
    evaluate,

    async goto(path, settle = 3000) {
      await send('Page.navigate', { url: `${base}${path}` });
      await sleep(settle);
    },

    text: () => evaluate('document.body.innerText'),
    here: () => evaluate('location.pathname + location.search'),

    setViewport: (w, h) =>
      send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: h,
        deviceScaleFactor: 1,
        mobile: w < 768,
      }),

    /** Bounding boxes for elements matching `selector`, for layout assertions. */
    boxes: (selector) =>
      evaluate(`
        [...document.querySelectorAll(${JSON.stringify(selector)})].map((el) => {
          const r = el.getBoundingClientRect();
          return { width: Math.round(r.width), top: Math.round(r.top) };
        })
      `),

    overflowsHorizontally: () =>
      evaluate('document.documentElement.scrollWidth > window.innerWidth + 1'),

    /**
     * Case-insensitive on purpose. `innerText` reports text as rendered, so a
     * heading styled with `text-transform: uppercase` comes back shouting and an
     * exact-case match fails against copy that is perfectly correct in source.
     */
    async has(needle) {
      return (await page.text()).toLowerCase().includes(needle.toLowerCase());
    },

    /**
     * React tracks input values on the DOM node itself, so assigning `.value` is
     * ignored. Going through the native setter is what makes onChange fire.
     */
    fill(selector, value, index = 0) {
      const proto = 'HTMLTextAreaElement';
      return evaluate(`
        (() => {
          const nodes = document.querySelectorAll(${JSON.stringify(selector)});
          const el = nodes[${index}];
          if (!el) return false;
          const prototype = el.tagName === 'TEXTAREA'
            ? window.${proto}.prototype
            : window.HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(prototype, 'value').set
            .call(el, ${JSON.stringify(value)});
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        })()
      `);
    },

    /** Clicks the first element of `tag` whose text contains `needle`. */
    click(needle, tag = 'button') {
      return evaluate(`
        (() => {
          const el = [...document.querySelectorAll(${JSON.stringify(tag)})]
            .find((n) => n.textContent.trim().includes(${JSON.stringify(needle)}));
          if (!el) return false;
          el.click();
          return true;
        })()
      `);
    },

    clickSelector(selector, index = 0) {
      return evaluate(`
        (() => {
          const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
          if (!el) return false;
          el.click();
          return true;
        })()
      `);
    },

    count(selector) {
      return evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`);
    },

    async close() {
      ws.close();
      chrome.kill();
      // Chrome keeps writing to its profile for a moment after the kill signal,
      // so removing it immediately races. It is a temp directory; failing to
      // clean it up must not fail the run.
      await sleep(500);
      try {
        rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch {
        // Left behind in the system temp directory.
      }
    },
  };

  return page;
}
