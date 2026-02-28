import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyTherapistSessionDetail } from '../api/therapistSessions.api';

export const useSessionDetail = (sessionId?: string) => {
  const qc = useQueryClient();
  return useQuery(['sessionDetail', sessionId], () => getMyTherapistSessionDetail(sessionId as string), {
    enabled: !!sessionId,
    staleTime: 1000 * 30,
    onSuccess: (data) => {
      // prefetch related patient or other sessions if useful
      if (data?.patient?.id) qc.prefetchQuery(['patient', data.patient.id], () => Promise.resolve(data.patient));
    },
  });
};
