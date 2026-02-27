import { describe, it, expect } from 'vitest';
import { recordAnswerAndAdvance, detectProblematicSCCs } from '../branchingEngine';

import type { Question } from '../../types/question';

describe('branchingEngine — additional cases', () => {
  it('nested conditions advance correctly through multiple levels', () => {
    const qs: Question[] = [
      { id: 'q1', text: 'First', type: 'text' },
      { id: 'q2', text: 'Second', type: 'text' },
      { id: 'q3', text: 'Third', type: 'text' },
    ];

    const branchingForQ1 = {
      rules: [
        { id: 'r1', condition: { clauses: [{ questionId: 'q1', comparator: '==', value: 'go' }] }, targetQuestionId: 'q2' }
      ],
      fallback: null
    };

    const branchingForQ2 = {
      rules: [
        { id: 'r2', condition: { clauses: [{ questionId: 'q1', comparator: '==', value: 'go' }, { questionId: 'q2', comparator: '==', value: 'next' }] }, targetQuestionId: 'q3' }
      ],
      fallback: null
    };

    // start state
    const state: any = { currentQuestionId: 'q1', history: [], visited: new Set<string>(['q1']), stepCount: 0 };
    const answers: any = {};

    const r1 = recordAnswerAndAdvance(state, qs, branchingForQ1 as any, answers, 'q1', 'go');
    expect(r1.next).toBe('q2');
    // now answer q2 and use a branching that references q1 and q2 (nested)
    const r2 = recordAnswerAndAdvance(state, qs, branchingForQ2 as any, answers, 'q2', 'next');
    expect(r2.next).toBe('q3');
  });

  it('multiple-choice branching resolves deterministically', () => {
    const qs: Question[] = [
      { id: 'q1', text: 'MCQ', type: 'multiple-choice', options: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as any },
      { id: 'qA', text: 'A', type: 'text' },
      { id: 'qB', text: 'B', type: 'text' },
      { id: 'qFallback', text: 'F', type: 'text' }
    ];

    const branching = {
      rules: [
        { id: 'rA', condition: { clauses: [{ questionId: 'q1', comparator: 'in', value: ['a'] }] }, targetQuestionId: 'qA', priority: 5 },
        { id: 'rB', condition: { clauses: [{ questionId: 'q1', comparator: 'in', value: ['b'] }] }, targetQuestionId: 'qB', priority: 1 }
      ],
      fallback: 'qFallback'
    };

    const state: any = { currentQuestionId: 'q1', history: [], visited: new Set<string>(['q1']), stepCount: 0 };
    const answers: any = {};

    // simulate selecting 'a' (engine treats 'in' as answer in target list)
    const res = recordAnswerAndAdvance(state, qs, branching as any, answers, 'q1', 'a');
    expect(res.next).toBe('qA');
  });

  it('missing fallback without match ends the session gracefully', () => {
    const qs: Question[] = [ { id: 'q1', text: 'a', type: 'text' } ];
    const branching = { rules: [ { id: 'r1', condition: { clauses: [{ questionId: 'q1', comparator: '==', value: 'yes' }] }, targetQuestionId: 'qX' } ], fallback: undefined };
    const state: any = { currentQuestionId: 'q1', history: [], visited: new Set<string>(['q1']), stepCount: 0 };
    const answers: any = {};
    const res = recordAnswerAndAdvance(state, qs, branching as any, answers, 'q1', 'no-match');
    expect(res.next).toBeNull();
    expect(res.ended).toBe(true);
  });

  it('detects cycles in SCC analysis for a 2-node mutual cycle', () => {
    const qs: Question[] = [ { id: 'q1', text: 'a', type: 'text' }, { id: 'q2', text: 'b', type: 'text' } ];
    const branching = {
      rules: [
        { id: 'r1', condition: { clauses: [{ questionId: 'q1', comparator: '==', value: 'x' }] }, targetQuestionId: 'q2' },
        { id: 'r2', condition: { clauses: [{ questionId: 'q2', comparator: '==', value: 'y' }] }, targetQuestionId: 'q1' }
      ]
    };
    const probs = detectProblematicSCCs(qs as any, branching as any);
    expect(probs.length).toBeGreaterThan(0);
    expect(probs.some(p => p.includes('q1') && p.includes('q2'))).toBe(true);
  });

  it('large session traversal (200 questions) completes quickly and without stack overflow', () => {
    const N = 200;
    const qs: Question[] = new Array(N).fill(null).map((_, i) => ({ id: `q${i+1}`, text: `q${i+1}`, type: 'text' } as Question));
    // linear rules: each question's sequential next exists by order
    const branching = undefined;

    const state: any = { currentQuestionId: 'q1', history: [], visited: new Set<string>(['q1']), stepCount: 0 };
    const answers: any = {};

    const start = Date.now();
    for (let i = 1; i <= N; i++) {
      const qid = `q${i}`;
      const ans = i < N ? 'next' : 'end';
      recordAnswerAndAdvance(state, qs, branching as any, answers, qid, ans);
      // continue until end
    }
    const dur = Date.now() - start;
    // ensure it completes fairly fast on dev machine
    expect(dur).toBeLessThan(2000);
    // final state should be ended
    expect(state.currentQuestionId).toBeUndefined();
  });
});
