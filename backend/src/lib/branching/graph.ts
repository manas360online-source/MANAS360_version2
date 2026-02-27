import { TemplateSnapshot, BranchRule } from './types';

export interface CycleResult {
  hasCycle: boolean;
  cycles: string[][]; // list of node id paths demonstrating cycles
}

/**
 * Detect cycles among rules that have sourceQuestionId defined.
 * Global rules (no sourceQuestionId) are ignored for cycle detection.
 */
export function detectCycles(snapshot: TemplateSnapshot): CycleResult {
  const adj = new Map<string, string[]>();
  const questions = new Set(snapshot.questions.map((q) => q.id));

  for (const r of snapshot.rules || []) {
    if (!r.sourceQuestionId) continue; // global rule
    if (!r.targetQuestionId) continue;
    if (!questions.has(r.sourceQuestionId) || !questions.has(r.targetQuestionId)) continue;
    const arr = adj.get(r.sourceQuestionId) || [];
    arr.push(r.targetQuestionId);
    adj.set(r.sourceQuestionId, arr);
  }

  const visited = new Set<string>();
  const stack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]) {
    if (stack.has(node)) {
      const idx = path.indexOf(node);
      cycles.push(path.slice(idx).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    const neighbors = adj.get(node) || [];
    for (const n of neighbors) dfs(n, path.concat(n));
    stack.delete(node);
  }

  for (const q of questions) {
    if (!visited.has(q)) dfs(q, [q]);
  }

  return { hasCycle: cycles.length > 0, cycles };
}
