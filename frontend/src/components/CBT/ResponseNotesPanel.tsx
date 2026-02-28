import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listResponseNotes,
  getResponseNote,
  addResponseNote,
  updateResponseNote,
  deleteResponseNote,
} from '../../api/therapistSessions.api';
import ResponseNoteEditor from './ResponseNoteEditor';

type Props = {
  sessionId: string;
  responseId: string;
};

const ResponseNotesPanel: React.FC<Props> = ({ sessionId, responseId }) => {
  const qc = useQueryClient();
  // local UI state

  const { data, isLoading, isError } = useQuery(
    ['responseNotes', sessionId, responseId],
    async () => {
      const res = await listResponseNotes(sessionId, responseId);
      return res?.notes ?? res?.data?.notes ?? res?.notes ?? [];
    },
    { enabled: !!sessionId && !!responseId },
  );

  const addMut = useMutation((content: string) => addResponseNote(sessionId, responseId, content), {
    onSuccess: () => qc.invalidateQueries(['responseNotes', sessionId, responseId]),
  });

  const updateMut = useMutation(({ noteId, content }: { noteId: string; content: string }) => updateResponseNote(sessionId, responseId, noteId, content), {
    onSuccess: () => qc.invalidateQueries(['responseNotes', sessionId, responseId]),
  });

  const deleteMut = useMutation((noteId: string) => deleteResponseNote(sessionId, responseId, noteId), {
    onSuccess: () => qc.invalidateQueries(['responseNotes', sessionId, responseId]),
  });

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingInitial, setEditingInitial] = useState<string>('');
  const [viewingNoteId, setViewingNoteId] = useState<string | null>(null);
  const [viewingContent, setViewingContent] = useState<string>('');

  const handleAdd = async () => {
    setEditingNoteId('new');
    setEditingInitial('');
  };

  const handleView = async (noteId: string) => {
    setViewingNoteId(noteId);
    try {
      const res = await getResponseNote(sessionId, responseId, noteId);
      const content = res?.note?.content ?? res?.data?.note?.content ?? res?.note ?? '';
      setViewingContent(content);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setViewingContent('Failed to load note');
    }
  };

  const handleEdit = async (noteId: string) => {
    // fetch decrypted content, then open editor
    const res = await getResponseNote(sessionId, responseId, noteId);
    const content = res?.note?.content ?? res?.data?.note?.content ?? res?.note ?? '';
    setEditingInitial(content);
    setEditingNoteId(noteId);
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm('Delete this note?')) return;
    await deleteMut.mutateAsync(noteId);
    qc.invalidateQueries(['sessionDetail', sessionId]);
  };

  if (isLoading) return <div className="p-2 text-sm text-gray-500">Loading notes…</div>;
  if (isError) return <div className="p-2 text-sm text-red-600">Failed to load notes</div>;

  const notes = data ?? [];

  return (
    <div className="p-2 border rounded bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">Therapist notes</div>
        <div>
          <button onClick={handleAdd} className="text-xs px-2 py-1 border rounded">Add</button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="text-sm text-gray-500">No notes</div>
      ) : (
        <div className="space-y-2">
          {notes.map((n: any) => (
            <div key={n.id} className="p-2 bg-white border rounded">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">{new Date(n.createdAt).toLocaleString()}</div>
                <div className="flex gap-2">
                  <button onClick={() => handleView(n.id)} className="text-xs px-2 py-1 border rounded">View</button>
                  <button onClick={() => handleEdit(n.id)} className="text-xs px-2 py-1 border rounded">Edit</button>
                  <button onClick={() => handleDelete(n.id)} className="text-xs px-2 py-1 border rounded text-red-600">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal for add/edit */}
      {editingNoteId ? (
        <React.Suspense>
          {/* lazy-free simple import */}
          <ResponseNoteEditor
            initial={editingInitial}
            onSave={async (content: string) => {
              if (editingNoteId === 'new') {
                await addMut.mutateAsync(content);
              } else {
                await updateMut.mutateAsync({ noteId: editingNoteId, content });
              }
              qc.invalidateQueries(['responseNotes', sessionId, responseId]);
              qc.invalidateQueries(['sessionDetail', sessionId]);
            }}
            onClose={() => {
              setEditingNoteId(null);
              setEditingInitial('');
            }}
          />
        </React.Suspense>
      ) : null}

      {/* Viewer modal for decrypted content */}
      {viewingNoteId ? (
        <React.Suspense>
          <ResponseNoteEditor
            initial={viewingContent}
            readOnly
            title="View note"
            onClose={() => {
              setViewingNoteId(null);
              setViewingContent('');
            }}
          />
        </React.Suspense>
      ) : null}
    </div>
  );
};

export default ResponseNotesPanel;
