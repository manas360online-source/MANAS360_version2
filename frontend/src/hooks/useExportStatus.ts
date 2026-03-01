import { useQuery } from '@tanstack/react-query';

async function fetchExportStatus(jobId: string) {
  const res = await fetch(`/api/v1/therapists/dashboard/exports/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch export status');
  return res.json();
}

export function useExportStatus(jobId?: string | null) {
  const enabled = Boolean(jobId);
  return useQuery(['exportStatus', jobId], () => fetchExportStatus(jobId as string), {
    enabled,
    refetchInterval: (data) => {
      if (!data) return false;
      const state = data.job?.state || data.export?.status;
      if (!state) return 2000;
      if (state === 'completed' || state === 'COMPLETED' || state === 'failed' || state === 'FAILED') return false;
      return 2000;
    },
    retry: 1,
  });
}

export default useExportStatus;
