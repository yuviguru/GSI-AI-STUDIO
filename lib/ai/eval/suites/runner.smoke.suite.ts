/**
 * Sanity suite — exercises every Assertion kind in the runner with
 * synthetic inputs. Catches regressions in the runner itself before
 * live-AI suites get a chance to misdiagnose a generator.
 */

import type { EvalSuite } from '../types';

export const runnerSmokeSuite: EvalSuite<undefined, unknown> = {
  name: 'runner-smoke',
  cases: [
    {
      id: 'shape-passes',
      input: undefined,
      run: async () => ({
        positive: 'Aarav showed strong narrative arcs in the story.',
        growthArea: 'Try connecting cause and effect more explicitly next time.',
        followUpPrompts: ['What happens if X?', 'Could the hero choose differently?'],
      }),
      assertions: [
        { kind: 'hasKeys', keys: ['positive', 'growthArea', 'followUpPrompts'] },
        { kind: 'wordsBetween', path: 'positive', min: 5, max: 30 },
        { kind: 'isArrayBetween', path: 'followUpPrompts', min: 1, max: 4 },
        { kind: 'noPhrases', path: 'positive', phrases: ['great job', 'awesome'] },
        { kind: 'includesAny', path: 'positive', needles: ['Aarav', 'narrative', 'arc'] },
        { kind: 'scriptIs', path: 'positive', script: 'latin' },
        {
          kind: 'noOtherStudentNames',
          path: 'positive',
          allowedFirstName: 'Aarav',
          otherNames: ['Priya', 'Riya', 'Rohan'],
        },
      ],
    },
    {
      id: 'devanagari-ok',
      input: undefined,
      run: async () => ({
        body: 'आरव ने सप्ताह में रचनात्मक लेखन किया।',
      }),
      assertions: [
        { kind: 'scriptIs', path: 'body', script: 'devanagari' },
        { kind: 'lengthBetween', path: 'body', min: 10, max: 200 },
      ],
    },
  ],
};
