import usePreviewStore from '../store/usePreviewStore';
import QuestionRenderer from './QuestionRenderer';
import { Question } from '../types/question';

export default function SessionPreview() {
  const { session, questions, answers, device, active, reset, exit, answerAndAdvance } = usePreviewStore((s: any) => ({
    session: s.session,
    questions: s.questions,
    answers: s.answers,
    device: s.device,
    active: s.active,
    reset: s.reset,
    exit: s.exit,
    answerAndAdvance: s.answerAndAdvance,
  }));

  if (!active || !session) return null;

  const currentId = session.currentQuestionId as string | number | undefined;
  const currentQuestion: Question | undefined = questions.find((q: Question) => String(q.id) === String(currentId));

  const onAnswer = (val: any) => {
    if (!currentQuestion) return;
    answerAndAdvance(currentQuestion.id, val);
  };

  return (
    <div className="w-full">
      <div className={`border rounded p-4 ${device === 'mobile' ? 'max-w-xs mx-auto' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">Preview Mode {device === 'mobile' ? '(Mobile)' : '(Desktop)'}</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded" onClick={reset}>Reset</button>
            <button className="px-3 py-1 border rounded" onClick={exit}>Exit</button>
          </div>
        </div>

        {!currentQuestion ? (
          <div className="text-center text-gray-600">Preview complete</div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-sm text-gray-500">{currentQuestion.text}</div>
            <QuestionRenderer
              question={currentQuestion}
              value={answers[String(currentQuestion.id)]}
              onChange={onAnswer}
              onValidate={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
}
