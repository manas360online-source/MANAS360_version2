import create from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  SessionState,
  Branching,
  recordAnswerAndAdvance,
  Answers,
} from '../lib/branchingEngine';
import type { Question } from '../types/question';

type PreviewState = {
  active: boolean;
  device: 'mobile' | 'desktop';
  questions: Question[];
  branching?: Branching;
  session?: SessionState;
  answers: Record<string, any>;
  startPreview: (questions: Question[], branching?: Branching, device?: 'mobile' | 'desktop') => void;
  reset: () => void;
  exit: () => void;
  answerAndAdvance: (questionId: string | number, answer: any) => { next?: string | number | null; ended?: boolean; loopDetected?: boolean } | undefined;
};

export const usePreviewStore = create<PreviewState>(
  devtools((set: any, get: any) => ({
    active: false,
    device: 'desktop',
    questions: [],
    branching: undefined,
    session: undefined,
    answers: {},
    startPreview: (questions: Question[], branching?: Branching, device: 'mobile' | 'desktop' = 'desktop') => {
      const initial: SessionState = {
        currentQuestionId: questions.length ? questions[0].id : undefined,
        history: [],
        visited: new Set<string>(),
        stepCount: 0,
      };
      if (initial.currentQuestionId) initial.visited.add(String(initial.currentQuestionId));
      set({ active: true, device, questions, branching, session: initial, answers: {} });
    },
    reset: () => {
      const s = get();
      const initial: SessionState = {
        currentQuestionId: s.questions.length ? s.questions[0].id : undefined,
        history: [],
        visited: new Set<string>(),
        stepCount: 0,
      };
      if (initial.currentQuestionId) initial.visited.add(String(initial.currentQuestionId));
      set({ session: initial, answers: {} });
    },
    exit: () => set({ active: false, session: undefined, answers: {}, questions: [], branching: undefined }),
    answerAndAdvance: (questionId: string | number, answer: any) => {
      const s = get();
      if (!s.session) return undefined;
      const answers: Answers = {};
      for (const k of Object.keys(s.answers)) answers[k] = s.answers[k];
      answers[String(questionId)] = answer;

      const res = recordAnswerAndAdvance(s.session, s.questions, s.branching, answers, questionId, answer, { maxSteps: 500 });

      // persist into preview answers and session in-memory only
      set((state: any) => ({ answers: { ...state.answers, [String(questionId)]: answer }, session: state.session }));
      return res;
    },
  }))
);

export default usePreviewStore;
