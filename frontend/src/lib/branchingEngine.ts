import type { Question } from '../types/question';

// Data structures (repeated here for local module use)
export type Comparator = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'matches';
export type LogicalOp = 'AND' | 'OR';

export interface BranchClause {
  questionId: string | number;
  comparator: Comparator;
  value: any;
}

export interface BranchCondition {
  op?: LogicalOp; // default 'AND'
  clauses: BranchClause[];
}

export interface BranchRule {
  id: string;
  condition: BranchCondition;
  targetQuestionId?: string | number | null; // null/undefined means END
  priority?: number;
}

export interface Branching {
  rules: BranchRule[];
  fallback?: string | number | null; // if not set, use sequential
}

export interface HistoryEntry {
  questionId: string | number;
  answer: any;
  timestamp: number;
  ruleTaken?: string | null;
}

export interface SessionState {
  currentQuestionId?: string | number;
  history: HistoryEntry[];
  visited: Set<string>; // keys stored as strings
  stepCount: number;
}

export type Answers = Record<string | number, any>;

const DEFAULT_MAX_STEPS = 500;

function toKey(id: unknown) {
  return String(id);
}

function evalClause(clause: BranchClause, answers: Answers): boolean {
  const val = answers[toKey(clause.questionId)];
  const cmp = clause.comparator;
  const target = clause.value;

  if (cmp === 'in') {
    if (Array.isArray(target)) return target.includes(val);
    return false;
  }

  if (cmp === 'matches') {
    try {
      const re = new RegExp(String(target));
      return re.test(String(val));
    } catch (e) {
      // malformed regex -> treat as non-match
      return false;
    }
  }

  // comparisons that coerce numbers when applicable
  if ((cmp === '>' || cmp === '>=' || cmp === '<' || cmp === '<=') && val != null) {
    const nVal = Number(val);
    const nTarget = Number(target);
    if (Number.isNaN(nVal) || Number.isNaN(nTarget)) return false;
    switch (cmp) {
      case '>': return nVal > nTarget;
      case '>=': return nVal >= nTarget;
      case '<': return nVal < nTarget;
      case '<=': return nVal <= nTarget;
    }
  }

  switch (cmp) {
    case '==': return val === target;
    case '!=': return val !== target;
  }

  return false;
}

export function evaluateCondition(condition: BranchCondition, answers: Answers): boolean {
  if (!condition || !Array.isArray(condition.clauses) || condition.clauses.length === 0) return false;
  const op = condition.op || 'AND';
  if (op === 'OR') {
    for (const c of condition.clauses) if (evalClause(c, answers)) return true;
    return false;
  }
  // default AND
  for (const c of condition.clauses) if (!evalClause(c, answers)) return false;
  return true;
}

function sortRules(rules: BranchRule[]) {
  return [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

function findNextSequential(questions: Question[], currentId?: string | number): string | number | undefined {
  if (!questions || questions.length === 0) return undefined;
  if (currentId == null) return questions[0].id;
  const idx = questions.findIndex(q => toKey(q.id) === toKey(currentId));
  if (idx === -1) return undefined;
  if (idx + 1 >= questions.length) return undefined;
  return questions[idx + 1].id;
}

function findNextUnvisited(questions: Question[], state: SessionState): string | number | undefined {
  const startIdx = state.currentQuestionId == null ? -1 : questions.findIndex(q => toKey(q.id) === toKey(state.currentQuestionId));
  for (let i = startIdx + 1; i < questions.length; i++) {
    const id = questions[i].id;
    if (!state.visited.has(toKey(id))) return id;
  }
  // wrap-around search
  for (let i = 0; i <= startIdx; i++) {
    const id = questions[i].id;
    if (!state.visited.has(toKey(id))) return id;
  }
  return undefined;
}

/**
 * Determine next question candidate based on branching rules and answers.
 * Returns { target, ruleId }
 */
export function nextQuestionCandidate(
  questions: Question[],
  branching: Branching | undefined,
  currentId: string | number | undefined,
  answers: Answers
): { target?: string | number | null; ruleId?: string | null } {
  if (!branching || !branching.rules || branching.rules.length === 0) {
    const seq = findNextSequential(questions, currentId);
    return { target: seq, ruleId: null };
  }

  const rules = sortRules(branching.rules);
  for (const rule of rules) {
    try {
      if (evaluateCondition(rule.condition, answers)) return { target: rule.targetQuestionId ?? null, ruleId: rule.id };
    } catch (e) {
      // treat as non-match and continue
      continue;
    }
  }

  if (branching.fallback !== undefined) return { target: branching.fallback ?? null, ruleId: null };
  return { target: findNextSequential(questions, currentId), ruleId: null };
}

export interface AdvanceOptions {
  maxSteps?: number;
  endMarker?: string | number | null;
}

/**
 * Record an answer to a question and advance session to next question according to branching rules.
 * Returns nextQuestionId (or null if session ended) and metadata.
 */
export function recordAnswerAndAdvance(
  state: SessionState,
  questions: Question[],
  branching: Branching | undefined,
  answers: Answers,
  questionId: string | number,
  answer: any,
  options?: AdvanceOptions
): { next?: string | number | null; ended?: boolean; loopDetected?: boolean } {
  const maxSteps = options?.maxSteps ?? DEFAULT_MAX_STEPS;
  const endMarker = options?.endMarker ?? null;

  // record answer
  const now = Date.now();
  state.history.push({ questionId, answer, timestamp: now, ruleTaken: null });
  answers[toKey(questionId)] = answer;

  // evaluate candidate
  const cand = nextQuestionCandidate(questions, branching, questionId, answers);
  let candidate = cand.target;
  const ruleId = cand.ruleId ?? null;

  // End if candidate is explicit end marker
  if (candidate === null || candidate === endMarker) {
    // mark ruleTaken on last history entry
    const last = state.history[state.history.length - 1];
    if (last) last.ruleTaken = ruleId;
    state.currentQuestionId = undefined;
    return { next: null, ended: true, loopDetected: false };
  }

  // loop detection
  const key = candidate !== undefined ? toKey(candidate) : undefined;
  if ((key !== undefined && state.visited.has(key)) || state.stepCount >= maxSteps) {
    // attempt alternative: sequential unvisited
    const alt = findNextUnvisited(questions, state);
    if (alt !== undefined) {
      candidate = alt;
    } else if (branching?.fallback !== undefined && !state.visited.has(toKey(branching.fallback))) {
      candidate = branching.fallback;
    } else {
      // cannot advance safely - end session and flag loop
      const last = state.history[state.history.length - 1];
      if (last) last.ruleTaken = ruleId;
      state.currentQuestionId = undefined;
      return { next: null, ended: true, loopDetected: true };
    }
  }

  // update state and history (set ruleTaken)
  const last = state.history[state.history.length - 1];
  if (last) last.ruleTaken = ruleId;
  if (candidate !== undefined && candidate !== null) {
    state.visited.add(toKey(candidate));
    state.currentQuestionId = candidate;
    state.stepCount = (state.stepCount || 0) + 1;
    return { next: candidate, ended: false, loopDetected: false };
  }

  // no candidate -> end
  state.currentQuestionId = undefined;
  return { next: null, ended: true, loopDetected: false };
}

/**
 * Static analysis: detect strongly connected components and report SCCs that have no exit edges (i.e., potential infinite loop regions)
 * Returns array of SCCs (each is array of node ids) which are problematic.
 */
export function detectProblematicSCCs(questions: Question[], branching?: Branching) {
  // build adjacency list: include both branching edges and sequential edges
  const ids = questions.map(q => toKey(q.id));
  const indexOf = new Map<string, number>();
  ids.forEach((id, i) => indexOf.set(id, i));

  const adj: string[][] = ids.map(() => []);

  // sequential edges
  for (let i = 0; i < ids.length - 1; i++) {
    adj[i].push(ids[i + 1]);
  }

  // branching edges
  if (branching && Array.isArray(branching.rules)) {
    for (const rule of branching.rules) {
      const srcs = rule.condition.clauses.map(c => toKey(c.questionId));
      const tgt = rule.targetQuestionId == null ? null : toKey(rule.targetQuestionId);
      for (const s of srcs) {
        const si = indexOf.get(s);
        if (si === undefined) continue;
        if (tgt !== null && indexOf.has(tgt)) adj[si].push(tgt);
      }
    }
  }

  // Tarjan's SCC
  const n = ids.length;
  const index: number[] = new Array(n).fill(-1);
  const lowlink: number[] = new Array(n).fill(0);
  const onStack: boolean[] = new Array(n).fill(false);
  const stack: number[] = [];
  let idx = 0;
  const sccs: number[][] = [];

  function strongconnect(v: number) {
    index[v] = idx; lowlink[v] = idx; idx++; stack.push(v); onStack[v] = true;
    for (const wId of adj[v]) {
      const w = indexOf.get(wId)!;
      if (index[w] === -1) {
        strongconnect(w);
        lowlink[v] = Math.min(lowlink[v], lowlink[w]);
      } else if (onStack[w]) {
        lowlink[v] = Math.min(lowlink[v], index[w]);
      }
    }
    if (lowlink[v] === index[v]) {
      const component: number[] = [];
      let w: number;
      do {
        w = stack.pop() as number;
        onStack[w] = false;
        component.push(w);
      } while (w !== v);
      sccs.push(component);
    }
  }

  for (let v = 0; v < n; v++) if (index[v] === -1) strongconnect(v);

  const problematic: string[][] = [];
  // For each SCC check if there's any outgoing edge to outside the SCC
  for (const comp of sccs) {
    if (comp.length <= 1) continue; // single node cycles handled separately
    const compSet = new Set(comp.map(i => ids[i]));
    let hasExit = false;
    for (const i of comp) {
      for (const w of adj[i]) if (!compSet.has(w)) { hasExit = true; break; }
      if (hasExit) break;
    }
    if (!hasExit) problematic.push(comp.map(i => ids[i]));
  }

  // self-loop detection (single node with edge to itself)
  for (let i = 0; i < n; i++) {
    if (adj[i].includes(ids[i])) {
      // if this node is not part of any problematic comp already
      const already = problematic.some(arr => arr.includes(ids[i]));
      if (!already) problematic.push([ids[i]]);
    }
  }

  return problematic;
}
