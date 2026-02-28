import React, { useState, useEffect } from 'react';

type Props = {
  initial?: string;
  readOnly?: boolean;
  onSave?: (val: string) => Promise<void> | void;
  onClose: () => void;
  title?: string;
};

const ResponseNoteEditor: React.FC<Props> = ({ initial = '', readOnly = false, onSave, onClose, title = 'Therapist note' }) => {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(initial), [initial]);

  const handleSave = async () => {
    if (!onSave) return onClose();
    try {
      setSaving(true);
      await onSave(value);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl mx-4 rounded shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <div>
            <button onClick={onClose} className="text-sm text-gray-600">Close</button>
          </div>
        </div>

        <div className="mt-3">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={readOnly}
            rows={8}
            className="w-full border rounded p-2 text-sm"
          />
        </div>

        <div className="mt-3 flex justify-end gap-2">
          {!readOnly ? (
            <button onClick={handleSave} disabled={saving} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
              {saving ? 'Saving…' : 'Save'}
            </button>
          ) : null}
          <button onClick={onClose} className="px-3 py-1 border rounded text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ResponseNoteEditor;
