export default function AutosaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  let text = '';
  if (status === 'saving') text = 'Saving...';
  else if (status === 'saved') text = 'Draft saved';
  else if (status === 'error') text = 'Autosave failed';
  return (
    <div className="text-xs text-gray-400 mt-2 h-4">{text}</div>
  );
}
