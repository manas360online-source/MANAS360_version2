import React from 'react';
import { useDashboardState, useDashboardDispatch } from '../../context/dashboardContext';
import SessionQuickActions from '../therapist/SessionQuickActions';
import ExportButton from '../ExportButton';
import { useQuery } from '@tanstack/react-query';
import { getMyTherapistSessionDetail } from '../../api/therapistSessions.api';

const SessionDetailsDrawer: React.FC = () => {
  const state = useDashboardState();
  const dispatch = useDashboardDispatch();
  const sessionId = state.ui.selectedSessionId;
  if (!state.ui.drawerOpen || !sessionId) return null;

  const { data, isLoading, error } = useQuery(['therapist', 'session', sessionId], () => getMyTherapistSessionDetail(sessionId), {
    enabled: !!sessionId,
    staleTime: 1000 * 60, // 1 minute
  });

  const detail = data ?? null;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') dispatch({ type: 'closeDrawer' });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white border-l shadow-lg z-40" role="dialog" aria-modal="true" aria-labelledby="session-drawer-title" onKeyDown={handleKey}>
      <div className="p-4 flex items-center justify-between border-b">
        <div id="session-drawer-title" className="font-semibold">Session {sessionId}</div>
        <div className="flex items-center gap-4">
          <SessionQuickActions sessionId={sessionId} templateId={detail?.templateId ?? detail?.template?.id} />
          <ExportButton sessionId={sessionId} />
          <button className="text-sm text-gray-500" onClick={() => dispatch({ type: 'closeDrawer' })}>Close</button>
        </div>
      </div>
      <div className="p-4 overflow-auto h-full">
        {isLoading && <div className="text-sm text-gray-600">Loading...</div>}
        {error && <div className="text-sm text-red-600">Failed to load session details</div>}

        {!isLoading && detail && (
          <>
            <h4 className="text-sm font-medium">Patient Details</h4>
            <div className="text-sm text-gray-600 mt-2">Name: {detail.patient?.name ?? detail.patientName ?? '—'}</div>
            <div className="text-sm text-gray-600">Email: {detail.patient?.email ?? detail.patientEmail ?? '—'}</div>
            {detail.bookingReferenceId && <div className="text-sm text-gray-600">Booking: {detail.bookingReferenceId}</div>}
            {detail.scheduledAt && <div className="text-sm text-gray-600">Scheduled: {new Date(detail.scheduledAt).toLocaleString()}</div>}

            <h4 className="text-sm font-medium mt-4">Session Timeline</h4>
            <div className="mt-2 text-sm text-gray-700">
              {(detail.timeline && detail.timeline.length > 0) ? (
                <ul className="space-y-2">
                  {detail.timeline.slice(0, 20).map((t: any, i: number) => (
                    <li key={i} className="border rounded p-2">
                      <div className="text-xs text-gray-500">{t.questionText ?? t.questionId ?? `Q${i + 1}`}</div>
                      <div className="text-sm text-gray-800 mt-1">{typeof t.answer === 'string' ? t.answer : JSON.stringify(t.answer)}</div>
                      <div className="text-xs text-gray-400 mt-1">{t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}</div>
                    </li>
                  ))}
                  {detail.timeline.length > 20 && <li className="text-sm text-gray-500">Showing first 20 responses</li>}
                </ul>
              ) : (
                <div className="text-sm text-gray-700">No timeline responses available.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionDetailsDrawer;
