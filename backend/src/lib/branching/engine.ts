import { TemplateSnapshot, BranchRule, ExecutionState } from './types';
import { compileCondition } from './compiler';
import { detectCycles } from './graph';

export interface EngineOptions {
  maxDepth?: number;
}

export class BranchingEngine {
  private snapshot: TemplateSnapshot;
  private rulesBySource: Map<string, BranchRule[]> = new Map();
  private globalRules: BranchRule[] = [];
  private compiledFns: Map<string, (answers: any) => boolean> = new Map();
  private maxDepth: number;

  constructor(snapshot: TemplateSnapshot, opts?: EngineOptions) {
    this.snapshot = snapshot;
    this.maxDepth = opts?.maxDepth ?? 200;
    this.buildIndex();
  }

  private buildIndex() {
    // group rules by source and compile conditions
    const rules = (this.snapshot.rules || []).filter((r) => r.active !== false);
    rules.sort((a, b) => a.priority - b.priority);
    for (const r of rules) {
      const key = r.sourceQuestionId || '__GLOBAL__';
      const arr = this.rulesBySource.get(key) || [];
      arr.push(r);
      this.rulesBySource.set(key, arr);
      this.compiledFns.set(r.id, compileCondition(r.condition));
    }
    this.globalRules = this.rulesBySource.get('__GLOBAL__') || [];
  }

  /**
   * Validate snapshot for cycles and basic integrity.
   */
  public validateOrThrow() {
    // basic: questions exist
    const qids = new Set(this.snapshot.questions.map((q) => q.id));
    for (const r of this.snapshot.rules || []) {
      if (!r.isFallback && !r.targetQuestionId) {
        throw new Error(`Rule ${r.id} missing targetQuestionId and not fallback`);
      }
      if (r.targetQuestionId && !qids.has(r.targetQuestionId)) {
        throw new Error(`Rule ${r.id} targets unknown question ${r.targetQuestionId}`);
      }
      if (r.sourceQuestionId && !qids.has(r.sourceQuestionId)) {
        throw new Error(`Rule ${r.id} has unknown sourceQuestionId ${r.sourceQuestionId}`);
      }
    }

    // cycle detection
    const { hasCycle, cycles } = detectCycles(this.snapshot);
    if (hasCycle) {
      throw new Error(`Cycle detected in rules: ${JSON.stringify(cycles)}`);
    }
  }

  /** Decide next question id from currentQuestionId using in-memory rules. */
  public decideNextQuestion(currentQuestionId: string | null, state: ExecutionState): { nextQuestionId: string | null; usedRuleId?: string | null } {
    if (state.step > this.maxDepth) {
      throw new Error('MaxDepthExceeded');
    }

    const answers = state.answers || {};

    // candidate rules: those scoped to this question, then global rules
    const scoped = currentQuestionId ? this.rulesBySource.get(currentQuestionId) || [] : [];
    const candidates = [...scoped, ...this.globalRules];

    for (const r of candidates) {
      const fn = this.compiledFns.get(r.id);
      if (!fn) continue;
      let ok = false;
      try { ok = !!fn(answers); } catch (e) { ok = false; }
      if (ok) {
        if (!r.targetQuestionId) {
          // safeguard: skip invalid rule
          continue;
        }
        if (state.visited.has(r.targetQuestionId)) {
          // loop predicted — skip rule to keep progress or surface
          continue;
        }
        return { nextQuestionId: r.targetQuestionId, usedRuleId: r.id };
      }
    }

    // fallback: find fallback rule for source
    const fallback = (currentQuestionId ? (this.rulesBySource.get(currentQuestionId) || []).find(r => r.isFallback) : undefined)
      || this.globalRules.find(r => r.isFallback);
    if (fallback && fallback.targetQuestionId) return { nextQuestionId: fallback.targetQuestionId, usedRuleId: fallback.id };

    // default linear progression by orderIndex
    const questions = this.snapshot.questions.slice().sort((a,b)=>a.orderIndex - b.orderIndex);
    if (!currentQuestionId) return { nextQuestionId: questions.length ? questions[0].id : null };
    const idx = questions.findIndex(q => q.id === currentQuestionId);
    if (idx === -1) return { nextQuestionId: questions.length ? questions[0].id : null };
    if (idx + 1 < questions.length) return { nextQuestionId: questions[idx+1].id, usedRuleId: null };
    return { nextQuestionId: null, usedRuleId: null };
  }

  /** Run single step: record answer and compute next question. */
  public runStep(currentQuestionId: string, answer: any, state: ExecutionState): { nextQuestionId: string | null; usedRuleId?: string | null } {
    state.step = (state.step || 0) + 1;
    state.answers = state.answers || {};
    state.answers[currentQuestionId] = answer;
    state.visited.add(currentQuestionId);

    const decision = this.decideNextQuestion(currentQuestionId, state);
    if (decision.nextQuestionId && state.visited.has(decision.nextQuestionId)) {
      // loop detected at runtime
      throw new Error('LoopDetected');
    }
    return decision;
  }
}

export default BranchingEngine;
