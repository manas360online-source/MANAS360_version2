import React, { useState } from 'react';
import { useExportStatus } from '../hooks/useExportStatus';

type Props = { sessionId: string };

export const ExportButton: React.FC<Props> = ({ sessionId }) => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [enqueuing, setEnqueuing] = useState(false);
  const { data, isLoading, error } = useExportStatus(jobId);

  const startExport = async (format = 'csv') => {
    setJobId(null);
    setEnqueuing(true);
    try {
      const res = await fetch(`/api/v1/therapists/me/sessions/${sessionId}/export?format=${format}`, { method: 'GET', credentials: 'include' });
      const body = await res.json();
      if (res.ok && body.jobId) {
        setJobId(body.jobId);
      } else if (res.ok && body.success && body.url) {
        // legacy: immediate URL
        window.open(body.url, '_blank');
      } else {
        console.error('Failed to enqueue export', body);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEnqueuing(false);
    }
  };

  const exportRecord = data?.export;
  const jobState = data?.job?.state;

  return (
    <div>
      <div className="flex items-center gap-2">
        <button onClick={() => startExport('pdf')} className="btn btn-sm" disabled={enqueuing}>{enqueuing ? 'Enqueuing…' : 'Export PDF'}</button>
        <button onClick={() => startExport('csv')} className="btn btn-sm" disabled={enqueuing}>{enqueuing ? 'Enqueuing…' : 'Export CSV'}</button>
        <button onClick={() => startExport('json')} className="btn btn-sm" disabled={enqueuing}>{enqueuing ? 'Enqueuing…' : 'Export JSON'}</button>
      </div>

      {jobId && (
        <div className="mt-2 text-sm">
          <div>Job: {jobId}</div>
          <div>State: {String(jobState)}</div>
          {exportRecord?.status === 'COMPLETED' && exportRecord.filePath && (
            <div>
              <a href={exportRecord.filePath} target="_blank" rel="noreferrer" className="text-blue-600">Download export</a>
            </div>
          )}
          {exportRecord?.status === 'FAILED' && <div className="text-red-600">Export failed: {exportRecord.errorMessage}</div>}
          {isLoading && <div className="text-gray-500">Checking status…</div>}
          {error && <div className="text-red-600">Status error</div>}
        </div>
      )}
    </div>
  );
};

export default ExportButton;
