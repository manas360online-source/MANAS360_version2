import SessionHeader from '../components/SessionHeader';
import QuestionList from '../components/QuestionList';
import AddQuestionButton from '../components/AddQuestionButton';
import AutosaveIndicator from '../components/AutosaveIndicator';
import { useSessionBuilder } from '../store/useSessionBuilder';
import PreviewToolbar from '../components/PreviewToolbar';
import SessionPreview from '../components/SessionPreview';
import usePreviewStore from '../store/usePreviewStore';
import VersionHistory from '../components/VersionHistory';

export default function SessionBuilderPage() {
  const { questions, addQuestion, saveTemplate, autosaveStatus } = useSessionBuilder();
  const previewActive = usePreviewStore((s: any) => s.active);

  return (
    <div className="max-w-4xl mx-auto p-4 flex flex-col gap-6">
      <SessionHeader />
      <PreviewToolbar />
      <VersionHistory templateId={String(questions?.[0]?.sessionId || '')} />
      {previewActive ? (
        <SessionPreview />
      ) : (
        <>
          <QuestionList questions={questions} />
          <AddQuestionButton onClick={addQuestion} />
          <AutosaveIndicator status={autosaveStatus} />
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            onClick={saveTemplate}
          >
            Save as Template
          </button>
        </>
      )}
    </div>
  );
}
