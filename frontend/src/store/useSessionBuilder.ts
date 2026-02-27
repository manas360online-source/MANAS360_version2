import create from 'zustand';
import { devtools } from 'zustand/middleware';
import { Question, ResponseRecord } from '../types/question';
import {
  SessionState,
  Branching,
  recordAnswerAndAdvance,
  detectProblematicSCCs,
  Answers,
} from '../lib/branchingEngine';

type BuilderState = {
  questions: Question[];
  version: number;
  isDraft: boolean;
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  responses: Record<string, ResponseRecord | undefined>;
  branching?: Branching | undefined;
  session?: SessionState | undefined;
  templateWarnings: string[];
  addQuestion: () => void;
  reorderQuestions: (from: number, to: number) => void;
  updateQuestion: (id: string | number, data: Partial<Question>) => void;
  saveTemplate: () => Promise<void>;
  setResponse: (questionId: string | number, value: any) => void;
  validateQuestion: (questionId: string | number) => ResponseRecord;
  setBranching: (b: Branching) => void;
  validateTemplate: () => void;
  startSession: () => void;
  answerAndAdvance: (questionId: string | number, answer: any) => { next?: string | number | null; ended?: boolean; loopDetected?: boolean } | undefined;
};

export const useSessionBuilder = create<BuilderState>(
  devtools((set: any, get: any) => ({
    questions: [],
    version: 1,
    isDraft: true,
    autosaveStatus: 'idle',
    responses: {},
    branching: undefined,
    session: undefined,
    templateWarnings: [],
    addQuestion: () =>
      set((state: any) => ({
        questions: [
          ...state.questions,
          { id: Date.now(), type: 'text', text: '', branching: {}, required: false, weight: 1 },
        ],
        isDraft: true,
      })),
    reorderQuestions: (from: number, to: number) =>
      set((state: any) => {
        const updated = [...state.questions];
        const [moved] = updated.splice(from, 1);
        updated.splice(to, 0, moved);
        return { questions: updated, isDraft: true };
      }),
    updateQuestion: (id: string | number, data: Partial<Question>) =>
      set((state: any) => ({
        questions: state.questions.map((q: Question) => (q.id === id ? { ...q, ...data } : q)),
        isDraft: true,
      })),
    saveTemplate: async () => {
      set({ autosaveStatus: 'saving' });
      try {
        // TODO: Replace with API call to persist template
        await new Promise((res) => setTimeout(res, 500));
        set((state: any) => ({ version: state.version + 1, isDraft: false, autosaveStatus: 'saved' }));
      } catch (e) {
        set({ autosaveStatus: 'error' });
      }
    },
    setResponse: (questionId: string | number, value: any) =>
      set((state: any) => {
        // basic inline validation
        const q = state.questions.find((x: Question) => x.id === questionId);
        let valid = true;
        const errors: string[] = [];
        if (q) {
          if (q.required) {
            const empty =
              value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
            if (empty) {
              valid = false;
              errors.push('Required');
            }
          }
          if (q.validation?.pattern && typeof value === 'string') {
            try {
              const re = new RegExp(q.validation.pattern);
              if (!re.test(value)) {
                valid = false;
                errors.push('Invalid format');
              }
            } catch {}
          }
          if (typeof value === 'number') {
            if (q.validation?.min !== undefined && value < q.validation.min) {
              valid = false;
              errors.push(`Minimum ${q.validation.min}`);
            }
            if (q.validation?.max !== undefined && value > q.validation.max) {
              valid = false;
              errors.push(`Maximum ${q.validation.max}`);
            }
          }
        }
        const id = String(questionId);
        return { responses: { ...state.responses, [id]: { value, valid, errors } } } as any;
      }),
    setBranching: (b: Branching) => set({ branching: b }),
    validateTemplate: () => {
      const state = get();
      const warnings: string[] = [];
      try {
        const problematic = detectProblematicSCCs(state.questions, state.branching);
        for (const p of problematic) warnings.push(`Problematic cycle detected: ${p.join(' -> ')}`);
      } catch (e: any) {
        warnings.push(`Validation error: ${String(e)}`);
      }
      set({ templateWarnings: warnings });
    },
    startSession: () => {
      const state = get();
      const initial: SessionState = {
        currentQuestionId: state.questions.length ? state.questions[0].id : undefined,
        history: [],
        visited: new Set<string>(),
        stepCount: 0,
      };
      if (initial.currentQuestionId) initial.visited.add(String(initial.currentQuestionId));
      set({ session: initial });
    },
    answerAndAdvance: (questionId: string | number, answer: any) => {
      const state = get();
      if (!state.session) return undefined;
      const answers: Answers = {}; // build answers map from responses + new answer
      for (const k of Object.keys(state.responses)) {
        const r = state.responses[k];
        if (r) answers[k] = r.value;
      }
      answers[String(questionId)] = answer;
      const res = recordAnswerAndAdvance(state.session, state.questions, state.branching, answers, questionId, answer, { maxSteps: 500 });
      // persist response
      const id = String(questionId);
      const valid = res ? !res.loopDetected : true;
      set({ responses: { ...state.responses, [id]: { value: answer, valid, errors: res && res.loopDetected ? ['Loop detected'] : undefined } }, session: state.session });
      return res;
    },
    validateQuestion: (questionId: string | number) => {
      const state = get();
      const q = state.questions.find((x: Question) => x.id === questionId);
      const id = String(questionId);
      const existing = state.responses[id];
      if (existing) return existing as ResponseRecord;
      // if no response yet, run same validation logic with undefined
      let valid = true;
      const errors: string[] = [];
      if (q && q.required) {
        valid = false;
        errors.push('Required');
      }
      return { value: undefined, valid, errors } as ResponseRecord;
    },
  }))
);

