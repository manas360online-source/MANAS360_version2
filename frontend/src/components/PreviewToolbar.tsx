import { useSessionBuilder } from '../store/useSessionBuilder';
import usePreviewStore from '../store/usePreviewStore';

export default function PreviewToolbar() {
  const { questions, branching } = useSessionBuilder((s: any) => ({ questions: s.questions, branching: s.branching }));
  const startPreview = usePreviewStore((s: any) => s.startPreview);
  const active = usePreviewStore((s: any) => s.active);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-1 rounded border ${active ? 'bg-gray-200' : 'bg-white'}`}
          onClick={() => startPreview(questions, branching, 'desktop')}
        >
          Preview (Desktop)
        </button>
        <button
          className="px-3 py-1 rounded border bg-white"
          onClick={() => startPreview(questions, branching, 'mobile')}
        >
          Preview (Mobile)
        </button>
      </div>
      <div className="text-sm text-gray-500">Preview runs locally and does not save data.</div>
    </div>
  );
}
