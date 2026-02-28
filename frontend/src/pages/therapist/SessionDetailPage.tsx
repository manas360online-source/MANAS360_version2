import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionDetail } from '../../hooks/useSessionDetail';
import SessionResponseViewer from '../../components/CBT/SessionResponseViewer';

const SessionHeader: React.FC<{ session: any }> = ({ session }) => {
  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Session {session?.bookingReferenceId ?? session?.id}</div>
          <div className="text-sm text-gray-500">{new Date(session?.dateTime).toLocaleString()}</div>
        </div>
        <div className="text-sm text-gray-600">Status: {session?.status}</div>
      </div>
    </div>
  );
};

const PatientCard: React.FC<{ patient: any }> = ({ patient }) => (
  <div className="p-4 border rounded">
    <div className="font-medium">{patient?.name ?? 'Unknown Patient'}</div>
    <div className="text-sm text-gray-500">{patient?.email ?? ''}</div>
    <div className="text-sm text-gray-500">Age: {patient?.age ?? '—'}</div>
  </div>
);

// Timeline rendering is handled by the virtualized SessionResponseViewer

const BranchVisualizer: React.FC<{ branching: any }> = ({ branching }) => {
  const path = branching?.path ?? [];
  return (
    <div className="p-3">
      <div className="text-sm text-gray-500">Branch path:</div>
      <div className="flex gap-2 mt-2">
        {path.map((id: string, i: number) => (
          <div key={id} className="px-2 py-1 bg-gray-100 rounded">{i + 1}</div>
        ))}
      </div>
    </div>
  );
};

const SessionDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useSessionDetail(id);

  if (isLoading) return <div className="p-6">Loading session…</div>;
  if (isError) return <div className="p-6 text-red-600">Failed to load session</div>;

  const detail = data?.session ? data : null;

  return (
    <div className="p-4">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-blue-600">Back</button>
      <SessionHeader session={detail?.session} />

      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="col-span-1">
          <PatientCard patient={detail?.patient} />
          <div className="mt-4"><BranchVisualizer branching={detail?.branching} /></div>
        </div>
        <div className="col-span-2 h-[720px]">
          <div className="border rounded h-full bg-white">
            <SessionResponseViewer sessionId={id as string} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetailPage;
