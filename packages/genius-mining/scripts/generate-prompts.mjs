/**
 * Turns the prompt text files in assets/prompts into a TypeScript module.
 *
 * The .txt files stay the source of truth — a prompt is versioned config, and
 * editing one means a new file and a new version, not a diff inside a .ts. The
 * generated module exists so the text survives bundling into a serverless
 * function without any filesystem tracing config, and `prompts.generated.test.ts`
 * fails if the two ever drift.
 *
 * Run: npm run gm:prompts
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const promptDir = join(here, '..', 'assets', 'prompts');
const outFile = join(here, '..', 'src', 'prompts.generated.ts');

const files = readdirSync(promptDir).filter((name) => name.endsWith('.txt')).sort();

const entries = files.map((name) => {
  const text = readFileSync(join(promptDir, name), 'utf8');
  const key = name.replace(/\.txt$/, '');
  return `  ${JSON.stringify(key)}: ${JSON.stringify(text)},`;
});

const banner = `// GENERATED FILE — do not edit.
// Source: assets/prompts/*.txt · regenerate with \`npm run gm:prompts\`.
// Copyright (c) 2026 Hidden Genius Labs LLC. See ../LICENSE.

`;

const body = `export const PROMPT_TEXT: Record<string, string> = {
${entries.join('\n')}
};
`;

writeFileSync(outFile, banner + body, 'utf8');
console.log(`Wrote ${files.length} prompt(s) to ${outFile}`);
