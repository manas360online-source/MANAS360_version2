export type ConditionOp =
  | 'EQ'
  | 'NE'
  | 'LT'
  | 'LE'
  | 'GT'
  | 'GE'
  | 'IN'
  | 'CONTAINS'
  | 'REGEX'
  | 'EXISTS';

export type CondNode = {
  type: 'COND';
  path: string; // e.g. 'answers.q1.value' or '__always'
  op: ConditionOp;
  value?: any;
};

export type AndNode = { type: 'AND'; children: ConditionNode[] };
export type OrNode = { type: 'OR'; children: ConditionNode[] };

export type ConditionNode = CondNode | AndNode | OrNode;

export interface BranchRule {
  id: string;
  versionId: string;
  priority: number;
  sourceQuestionId?: string | null; // optional: rule scoped to a question
  condition: ConditionNode;
  targetQuestionId?: string | null;
  isFallback?: boolean;
  active?: boolean;
}

export interface QuestionSnapshot {
  id: string;
  orderIndex: number;
  prompt: string;
  type: string;
  payload?: any;
}

export interface TemplateSnapshot {
  versionId: string;
  questions: QuestionSnapshot[];
  rules: BranchRule[]; // not guaranteed to be sorted
}

export interface ExecutionState {
  answers: Record<string, any>;
  visited: Set<string>;
  step: number;
}
