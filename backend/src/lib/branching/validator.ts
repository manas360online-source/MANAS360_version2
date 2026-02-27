import { TemplateSnapshot } from './types';
import { detectCycles } from './graph';

export function validateSnapshot(snapshot: TemplateSnapshot): { valid: boolean; errors: string[] } {
  const errs: string[] = [];
  if (!snapshot) {
    errs.push('Snapshot missing');
    return { valid: false, errors: errs };
  }
  if (!Array.isArray(snapshot.questions) || snapshot.questions.length === 0) errs.push('No questions in snapshot');
  const qids = new Set((snapshot.questions || []).map(q => q.id));
  const priorities = new Map<number, string>();
  for (const r of snapshot.rules || []) {
    if (!r.condition) errs.push(`Rule ${r.id} missing condition`);
    if (!r.isFallback && !r.targetQuestionId) errs.push(`Rule ${r.id} missing targetQuestionId`);
    if (r.targetQuestionId && !qids.has(r.targetQuestionId)) errs.push(`Rule ${r.id} targets unknown question ${r.targetQuestionId}`);
    if (r.sourceQuestionId && !qids.has(r.sourceQuestionId)) errs.push(`Rule ${r.id} has unknown sourceQuestionId ${r.sourceQuestionId}`);
    if (typeof r.priority !== 'number') errs.push(`Rule ${r.id} missing priority`);
    else {
      const seen = priorities.get(r.priority);
      if (seen) errs.push(`Priority collision ${r.priority} between ${seen} and ${r.id}`);
      else priorities.set(r.priority, r.id);
    }
  }

  // cycles
  const { hasCycle, cycles } = detectCycles(snapshot);
  if (hasCycle) errs.push(`Cycle(s) found: ${JSON.stringify(cycles)}`);

  return { valid: errs.length === 0, errors: errs };
}
