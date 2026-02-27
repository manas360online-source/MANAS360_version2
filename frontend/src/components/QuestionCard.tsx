import QuestionTypeSelector from './QuestionTypeSelector';
import BranchingLogicEditor from './BranchingLogicEditor';
import { useSessionBuilder } from '../store/useSessionBuilder';
import QuestionRenderer from './QuestionRenderer';
import { useCallback } from 'react';
import type { Question } from '../types/question';

export default function QuestionCard({ question }: { question: Question }) {
  const { updateQuestion, setResponse, responses, session, answerAndAdvance } = useSessionBuilder();
  const resp = responses[String(question.id)];

  const handleAnswerChange = useCallback((value: any) => {
    if (answerAndAdvance && session) {
      answerAndAdvance(question.id, value);
    } else {
      setResponse(question.id, value);
    }
  }, [question.id, setResponse, answerAndAdvance, session]);

  return (
    <div className="bg-white rounded shadow p-4 mb-4 flex flex-col gap-2">
      <input
        className="border px-2 py-1 rounded w-full"
        value={question.text}
        onChange={e => updateQuestion(question.id, { text: e.target.value })}
        placeholder="Enter question text"
      />
      <QuestionTypeSelector
        value={question.type}
        onChange={(type: string) => updateQuestion(question.id, { type })}
      />

      <div className="mt-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Preview / Answer</label>
        <QuestionRenderer
          question={question}
          value={resp?.value}
          onChange={handleAnswerChange}
          onValidate={() => { /* optional: we can surface validation UI */ }}
        />
        {resp && !resp.valid && <div className="text-xs text-red-600 mt-1">{resp.errors?.join(', ')}</div>}
      </div>

      <BranchingLogicEditor
        branching={question.branching}
        onChange={(branching: any) => updateQuestion(question.id, { branching })}
      />
    </div>
  );
}
