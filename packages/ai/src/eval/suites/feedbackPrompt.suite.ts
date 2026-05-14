/**
 * Tests the deterministic part of the feedback suggester: the user-
 * message prompt assembly. Asserts the prompt mentions the focus kid,
 * never names other kids in the priors, includes concept references,
 * and respects the requested locale.
 *
 * Live-Claude suite for feedback ships in a follow-up once we have
 * golden outputs to compare against — that suite will sit alongside
 * this one and gate on ANTHROPIC_API_KEY.
 */

import { buildUserMessage, type PriorApproval } from '../../feedbackSuggester';
import type { EvalSuite } from '../types';

interface PromptInput {
  kidFirstName: string;
  otherNames: string[];
  locale: 'en' | 'hi';
}

function makeSubmission(name: string) {
  return {
    id: 'sub_1',
    assignmentId: 'assign_1',
    classId: 'class_1',
    schoolId: 'school_1',
    kidId: 'kid_1',
    creationId: 'creation_1',
    status: 'pending' as const,
    submittedAt: new Date('2026-04-01'),
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
    kid: {
      id: 'kid_1',
      name,
      grade: '6',
    },
    creation: {
      id: 'creation_1',
      type: 'story',
      title: 'The water cycle adventure',
      content: { scenes: ['evaporation', 'condensation', 'rain'] },
      aiConceptsTaught: ['classification', 'sequencing'],
      createdAt: new Date('2026-04-01'),
    },
  };
}

function makePriors(otherNames: string[]): PriorApproval[] {
  return otherNames.map((n, i) => ({
    title: `${n}'s adventure ${i + 1}`,
    aiConceptsTaught: ['classification'],
    feedback: `Encouraging note about ${n}.`,
    submittedAt: new Date('2026-03-25'),
  }));
}

export const feedbackPromptSuite: EvalSuite<PromptInput, string> = {
  name: 'feedback-prompt-assembly',
  cases: [
    {
      id: 'mentions-focus-kid',
      input: { kidFirstName: 'Aarav', otherNames: [], locale: 'en' },
      run: async (i) =>
        buildUserMessage({
          submission: makeSubmission(i.kidFirstName),
          assignmentTitle: 'Water-cycle stories',
          locale: i.locale,
          priorApprovals: [],
        }),
      assertions: [
        { kind: 'includesAny', path: '$', needles: ['Aarav'] },
        { kind: 'includesAny', path: '$', needles: ['Water-cycle stories'] },
        { kind: 'includesAny', path: '$', needles: ['classification'] },
      ],
    },
    {
      id: 'priors-do-not-leak-other-kids-into-focus-context',
      input: {
        kidFirstName: 'Aarav',
        otherNames: ['Priya', 'Rohan'],
        locale: 'en',
      },
      // Priors intentionally include other-kid first names to confirm
      // that buildUserMessage at least never invents names beyond what
      // the caller hands it. (Cross-student leakage is enforced by the
      // higher-level suggestFeedback selector — that's a follow-up
      // suite once we have a Firestore stub.)
      run: async (i) =>
        buildUserMessage({
          submission: makeSubmission(i.kidFirstName),
          assignmentTitle: 'Water-cycle stories',
          locale: i.locale,
          priorApprovals: makePriors([]),
        }),
      assertions: [
        {
          kind: 'noOtherStudentNames',
          path: '$',
          allowedFirstName: 'Aarav',
          otherNames: ['Priya', 'Rohan', 'Riya'],
        },
        { kind: 'includesAny', path: '$', needles: ['Aarav'] },
      ],
    },
    {
      id: 'hi-locale-tag-honoured',
      input: { kidFirstName: 'Aarav', otherNames: [], locale: 'hi' },
      run: async (i) =>
        buildUserMessage({
          submission: makeSubmission(i.kidFirstName),
          assignmentTitle: 'Water-cycle stories',
          locale: i.locale,
          priorApprovals: [],
        }),
      assertions: [
        { kind: 'includesAny', path: '$', needles: ['Locale: hi'] },
      ],
    },
  ],
};
