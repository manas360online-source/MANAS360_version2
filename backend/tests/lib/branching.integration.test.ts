import BranchingEngine from '../../src/lib/branching/engine';
import { compileCondition } from '../../src/lib/branching/compiler';
import { detectCycles } from '../../src/lib/branching/graph';

describe('Branching compiler and graph (integration test pattern)', () => {
  test('compileCondition simple EQ and AND/OR', () => {
    const eqNode = { type: 'COND', path: 'q1', op: 'EQ', value: 'yes' } as any;
    const fn = compileCondition(eqNode);
    expect(fn({ q1: 'yes' })).toBe(true);
    expect(fn({ q1: 'no' })).toBe(false);

    const andNode = { type: 'AND', children: [eqNode, { type: 'COND', path: 'q2', op: 'GT', value: 3 }] } as any;
    const fand = compileCondition(andNode);
    expect(fand({ q1: 'yes', q2: 4 })).toBe(true);
    expect(fand({ q1: 'yes', q2: 2 })).toBe(false);
  });

  test('detectCycles finds cycles and none when acyclic', () => {
    const snapshotA: any = {
      versionId: 'v1',
      questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
      rules: [
        { id: 'r1', sourceQuestionId: 'q1', targetQuestionId: 'q2' },
        { id: 'r2', sourceQuestionId: 'q2', targetQuestionId: 'q3' },
      ],
    };
    const resA = detectCycles(snapshotA);
    expect(resA.hasCycle).toBe(false);

    const snapshotB: any = {
      versionId: 'v2',
      questions: [{ id: 'q1' }, { id: 'q2' }],
      rules: [
        { id: 'r1', sourceQuestionId: 'q1', targetQuestionId: 'q2' },
        { id: 'r2', sourceQuestionId: 'q2', targetQuestionId: 'q1' },
      ],
    };
    const resB = detectCycles(snapshotB);
    expect(resB.hasCycle).toBe(true);
    expect(resB.cycles.length).toBeGreaterThan(0);
  });
});

describe('BranchingEngine runtime (integration test pattern)', () => {
  test('decides next question based on rule and falls back to linear', () => {
    const snapshot: any = {
      versionId: 'v1',
      questions: [
        { id: 'q1', orderIndex: 0 },
        { id: 'q2', orderIndex: 1 },
        { id: 'q3', orderIndex: 2 },
      ],
      rules: [
        {
          id: 'rule1',
          versionId: 'v1',
          priority: 1,
          sourceQuestionId: 'q1',
          condition: { type: 'COND', path: 'q1', op: 'EQ', value: 'jump' },
          targetQuestionId: 'q3',
          isFallback: false,
        },
      ],
    };

    const engine = new BranchingEngine(snapshot);
    engine.validateOrThrow();

    const state: any = { visited: new Set<string>(), answers: {}, step: 0 };
    const decision1 = engine.runStep('q1', 'jump', state);
    expect(decision1.nextQuestionId).toBe('q3');

    // when answer doesn't match, should go to q2 (linear)
    state.answers = {};
    state.visited = new Set<string>();
    state.step = 0;
    const decision2 = engine.runStep('q1', 'nope', state);
    expect(decision2.nextQuestionId).toBe('q2');
  });

  test('runtime detects loops', () => {
    const snapshot: any = {
      versionId: 'vloop',
      questions: [
        { id: 'a', orderIndex: 0 },
        { id: 'b', orderIndex: 1 },
      ],
      rules: [
        { id: 'r1', versionId: 'vloop', priority: 1, sourceQuestionId: 'a', condition: { type: 'COND', path: '__always', op: 'EXISTS' }, targetQuestionId: 'b' },
        { id: 'r2', versionId: 'vloop', priority: 2, sourceQuestionId: 'b', condition: { type: 'COND', path: '__always', op: 'EXISTS' }, targetQuestionId: 'a' },
      ],
    };
    const engine = new BranchingEngine(snapshot);
    // validate should detect cycle
    expect(() => engine.validateOrThrow()).toThrow();
  });
});
