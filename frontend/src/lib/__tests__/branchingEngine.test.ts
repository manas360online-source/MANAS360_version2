import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  BranchCondition,
  nextQuestionCandidate,
  recordAnswerAndAdvance,
  detectProblematicSCCs,
} from '../branchingEngine';

import type { Question } from '../../types/question';

describe('branchingEngine', () => {
  it('evaluates simple condition equality', () => {
    const cond: BranchCondition = { clauses: [{ questionId: 'q1', comparator: '==', value: 'yes' }] };
    const answers = { q1: 'yes' };
    expect(evaluateCondition(cond, answers)).toBe(true);
  });

  it('evaluates OR condition', () => {
    const cond: BranchCondition = { op: 'OR', clauses: [
      { questionId: 'q1', comparator: '==', value: 'no' },
      { questionId: 'q2', comparator: '==', value: 'ok' }
    ] };
    const answers = { q1: 'yes', q2: 'ok' };
    expect(evaluateCondition(cond, answers)).toBe(true);
  });

  it('selects rule by priority and target', () => {
    const qs: Question[] = [ { id: 'q1', text: 'a', type: 'text' }, { id: 'q2', text: 'b', type: 'text' }, { id: 'q3', text: 'c', type: 'text' } ];
    const branching = {
      rules: [
        { id: 'r1', condition: { clauses: [{ questionId: 'q1', comparator: '==', value: 'x' }] }, targetQuestionId: 'q3', priority: 0 },
        { id: 'r2', condition: { clauses: [{ questionId: 'q1', comparator: '==', value: 'y' }] }, targetQuestionId: 'q2', priority: 10 },
      ]
    };
    const ans = { q1: 'y' };
    const cand = nextQuestionCandidate(qs, branching as any, 'q1', ans);
    expect(cand.target).toBe('q2');
  });

  it('recordAnswerAndAdvance prefers next unvisited when loop candidate exists', () => {
    const qs: Question[] = [ { id: 'q1', text: 'a', type: 'text' }, { id: 'q2', text: 'b', type: 'text' } ];
    const branching = {
      rules: [
        { id: 'r1', condition: { clauses: [{ questionId: 'q1', comparator: '==', value: 'go' }] }, targetQuestionId: 'q1' }
      ]
    };
    const state: any = { currentQuestionId: 'q1', history: [], visited: new Set<string>(['q1']), stepCount: 0 };
    const answers: any = {};
    const res = recordAnswerAndAdvance(state, qs as any, branching as any, answers, 'q1', 'go', { maxSteps: 10 });
    // candidate was visited but an alternative exists (q2), so loopDetected should be false and next should be q2
    expect(res?.loopDetected).toBe(false);
    expect(res?.next).toBe('q2');
  });

  it('detects problematic SCCs', () => {
    const qs: Question[] = [ { id: 'q1', text: 'a', type: 'text' }, { id: 'q2', text: 'b', type: 'text' } ];
    const branching = {
      rules: [
        { id: 'r1', condition: { clauses: [{ questionId: 'q1', comparator: '==', value: 'x' }] }, targetQuestionId: 'q2' },
        { id: 'r2', condition: { clauses: [{ questionId: 'q2', comparator: '==', value: 'x' }] }, targetQuestionId: 'q1' },
      ]
    };
    const probs = detectProblematicSCCs(qs as any, branching as any);
    expect(probs.length).toBeGreaterThanOrEqual(1);
  });
});
