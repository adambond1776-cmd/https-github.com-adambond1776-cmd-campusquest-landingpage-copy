import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PROMPT_TEXT } from '../prompts.generated';
import {
  ENGINE_1,
  ENGINE_2,
  MAX_TOKENS,
  MODEL,
  TEMPERATURE,
  renderAnalysisPrompt,
  renderRecommendationsPrompt,
} from '../prompts';

const promptDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'prompts');

describe('the generated prompt module', () => {
  // The .txt files are the source of truth. This is the guard that stops the
  // generated module drifting away from them unnoticed.
  it('matches assets/prompts byte for byte', () => {
    const files = readdirSync(promptDir).filter((name) => name.endsWith('.txt'));

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const key = file.replace(/\.txt$/, '');
      expect(PROMPT_TEXT[key], `${file} is missing from prompts.generated.ts`).toBe(
        readFileSync(join(promptDir, file), 'utf8')
      );
    }
  });

  it('registers exactly the prompts on disk', () => {
    const onDisk = readdirSync(promptDir)
      .filter((name) => name.endsWith('.txt'))
      .map((name) => name.replace(/\.txt$/, ''))
      .sort();

    expect(Object.keys(PROMPT_TEXT).sort()).toEqual(onDisk);
  });
});

describe('engine configuration', () => {
  it('is versioned config rather than a literal at the call site', () => {
    expect(ENGINE_1.promptKey).toBe('analysis_prompt_v1_2_json');
    expect(ENGINE_1.engineVersion).toBe('analysis-1.2');
    expect(ENGINE_2.promptKey).toBe('recommendations_prompt_v1_0');
  });

  it('pins the model and sampling settings', () => {
    expect(MODEL).toBe('claude-sonnet-4-6');
    expect(MAX_TOKENS).toBe(1200);
    expect(TEMPERATURE).toBe(0.1);
  });
});

describe('renderAnalysisPrompt', () => {
  it('substitutes the payload and leaves the prompt otherwise verbatim', () => {
    const rendered = renderAnalysisPrompt({ C3: 'hands were doing almost everything' });

    expect(rendered).not.toContain('{{STUDENT_RESPONSES}}');
    expect(rendered).toContain('hands were doing almost everything');
    expect(rendered).toContain('The domain is a decoy.');
    expect(rendered).toContain('THE EIGHT CANDIDATE WORKING WORDS');
  });
});

describe('renderRecommendationsPrompt', () => {
  const inputs = {
    workingWord: 'BUILDER' as const,
    d3Sentence: "I'm the person who won't leave a broken thing alone.",
    a4Entries: [
      { activity: 'follow Celtics', mode: 'watch' as const, social: 'crowd' as const, setting: 'indoors' as const },
    ],
    pathways: [
      {
        id: 'uri-makerspace',
        working_words: ['BUILDER' as const],
        scope: 'on_campus',
        name: 'MakerspaceURI',
        location: 'Carothers Library, Room 165',
        category: 'facility',
        what_it_is: '3D printers and a laser cutter.',
        how_to_join: 'Walk in.',
        low_commitment_entry: true,
        adjacent_fields: ['Mechanical Engineering', 'Industrial Design'],
        verified: true,
        source: 'Confirmed 27 August 2026',
      },
    ],
  };

  it('fills all four placeholders', () => {
    const rendered = renderRecommendationsPrompt(inputs);

    expect(rendered).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
    expect(rendered).toContain('BUILDER');
    expect(rendered).toContain('follow Celtics');
    expect(rendered).toContain('uri-makerspace');
  });

  it('withholds adjacent_fields, which is Phase 2 groundwork', () => {
    const rendered = renderRecommendationsPrompt(inputs);

    expect(rendered).not.toContain('Mechanical Engineering');
    expect(rendered).not.toContain('adjacent_fields');
  });

  it('renders an empty interest list without leaving a bare placeholder', () => {
    const rendered = renderRecommendationsPrompt({ ...inputs, a4Entries: [] });
    expect(rendered).toContain('None listed.');
  });
});
