import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addResponseNote } from '../../api/therapistSessions.api';
import ResponseNotesPanel from './ResponseNotesPanel';

type Props = {
  item: any;
  sessionId?: string;
};

const ResponseRow: React.FC<Props> = ({ item, sessionId }) => {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [saving, setSaving] = useState(false);

  const qc = useQueryClient();
  const [showNotes, setShowNotes] = useState(false);
  const addNote = async () => {
    const txt = window.prompt('Add therapist note (will be encrypted)');
    if (!txt) return;
    if (!sessionId) return alert('Session not available');
    try {
      setSaving(true);
      await addResponseNote(sessionId, item.responseId, txt);
      // refresh session detail to show new note metadata
      qc.invalidateQueries(['sessionDetail', sessionId]);
      qc.invalidateQueries(['responseNotes', sessionId, item.responseId]);
      alert('Note saved');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      alert('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className={`p-3 border-b ${item.flagged ? 'bg-yellow-50' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm text-gray-500">{new Date(item.timestamp).toLocaleString()}</div>
          <div className="mt-1 font-medium">{item.questionText ?? item.questionId}</div>
          <div className="mt-2 text-sm text-gray-700">{expanded ? JSON.stringify(item.answer, null, 2) : (typeof item.answer === 'string' ? item.answer : JSON.stringify(item.answer)).slice(0, 240)}{!expanded && (String(item.answer).length > 240) ? '…' : ''}</div>
        </div>

        <div className="flex-shrink-0 text-right">
          {typeof item.score === 'number' ? <div className="text-sm font-semibold text-indigo-700">{item.score}</div> : null}
          <div className="mt-2">
            <button onClick={() => setExpanded((s) => !s)} className="px-2 py-1 text-xs border rounded mr-2">{expanded ? 'Collapse' : 'Expand'}</button>
            <button onClick={() => setShowNotes((v) => !v)} className="px-2 py-1 text-xs border rounded mr-2">Notes</button>
            <button onClick={addNote} disabled={saving} className="px-2 py-1 text-xs border rounded">Quick add</button>
          </div>
        </div>
      </div>

      {item.notes && item.notes.length ? (
        <div className="mt-3 text-sm text-gray-600">
          <div className="font-medium">Therapist notes</div>
          <div className="mt-1">{item.notes.map((n: any) => <div key={n.id} className="mt-1">{n.text} <span className="text-xs text-gray-400">— {new Date(n.createdAt).toLocaleString()}</span></div>)}</div>
        </div>
      ) : null}

      {showNotes ? (
        <div className="mt-3">
          <ResponseNotesPanel sessionId={sessionId as string} responseId={item.responseId} />
        </div>
      ) : null}

    </div>
  );
};

export default React.memo(ResponseRow);
