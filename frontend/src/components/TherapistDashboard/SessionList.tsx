import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import SessionRow from './SessionRow';
import { useDashboardDispatch, useDashboardState } from '../../context/dashboardContext';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listMyTherapistSessions } from '../../api/therapistSessions.api';
import { TherapistSession, Paged } from '../../types/session.types';
import { useSearchParams } from 'react-router-dom';

const SessionList: React.FC = () => {
  const { filters } = useDashboardState();
  const dispatch = useDashboardDispatch();
  const onOpen = (id: string) => dispatch({ type: 'openDrawer', payload: { sessionId: id } });

  const pageSize = 20;
  // URL sync
  const [searchParams, setSearchParams] = useSearchParams();

  // local filter state (initialized from URL or dashboard filters)
  const [localFilters, setLocalFilters] = useState(() => ({
    status: searchParams.get('status') ?? filters.status ?? 'all',
    patient: searchParams.get('patient') ?? filters.patient ?? '',
    dateFrom: searchParams.get('from') ?? filters.dateFrom ?? null,
    dateTo: searchParams.get('to') ?? filters.dateTo ?? null,
    sessionType: searchParams.get('type') ?? filters.sessionType ?? null,
    completion: (searchParams.get('completion') as any) ?? filters.completion ?? 'all',
  }));

  // debounce hook for patient search
  const useDebounce = <T,>(value: T, delay = 350) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const t = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
  };

  const [patientInput, setPatientInput] = useState(localFilters.patient ?? '');
  const debouncedPatient = useDebounce(patientInput, 350);

  // keep localFilters.patient in sync with debounced value
  useEffect(() => {
    setLocalFilters((s) => ({ ...s, patient: debouncedPatient }));
  }, [debouncedPatient]);

  // push to URL (debounced patient only) when filters change
  useEffect(() => {
    const p = new URLSearchParams();
    if (localFilters.status && localFilters.status !== 'all') p.set('status', localFilters.status);
    if (localFilters.patient) p.set('patient', localFilters.patient);
    if (localFilters.dateFrom) p.set('from', String(localFilters.dateFrom));
    if (localFilters.dateTo) p.set('to', String(localFilters.dateTo));
    if (localFilters.sessionType) p.set('type', String(localFilters.sessionType));
    if (localFilters.completion && localFilters.completion !== 'all') p.set('completion', String(localFilters.completion));
    setSearchParams(p, { replace: true });
  }, [localFilters, setSearchParams]);

  const infinite = useInfiniteQuery(
    ['therapistSessions', localFilters],
    ({ pageParam = 1 }) =>
      listMyTherapistSessions({
        page: pageParam,
        limit: pageSize,
        status: localFilters.status === 'all' ? undefined : localFilters.status,
        patient: localFilters.patient || undefined,
        from: localFilters.dateFrom || undefined,
        to: localFilters.dateTo || undefined,
        type: localFilters.sessionType || undefined,
        completion: localFilters.completion === 'all' ? undefined : (localFilters.completion as string),
      }),
    {
      getNextPageParam: (lastPage: Paged<TherapistSession> & any) => {
        const page = lastPage.meta?.page ?? 1;
        const total = lastPage.meta?.total ?? 0;
        const limit = lastPage.meta?.limit ?? pageSize;
        const maxPage = Math.ceil(total / limit) || (lastPage.items?.length ? page + 1 : undefined);
        return page < maxPage ? page + 1 : undefined;
      },
      staleTime: 1000 * 30,
    }
  );

  const listRef = useRef<HTMLDivElement | null>(null);

  const allItems = useMemo(() => infinite.data?.pages.flatMap((p: any) => p.items ?? []) ?? [], [infinite.data]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && infinite.hasNextPage && !infinite.isFetchingNextPage) {
            infinite.fetchNextPage();
          }
        });
      });
      io.observe(node);
      return () => io.disconnect();
    },
    [infinite]
  );

  if (infinite.isError) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-600">Failed to load sessions</div>
        <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded" onClick={() => infinite.refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-[70vh] overflow-auto" ref={listRef}>
      {/* Filter bar */}
      <div className="p-3 border-b flex flex-wrap gap-2 items-center">
        <select
          value={localFilters.status}
          onChange={(e) => setLocalFilters((s) => ({ ...s, status: e.target.value }))}
          className="px-2 py-1 border rounded"
        >
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>

        <input
          placeholder="Search patient name or email"
          value={patientInput}
          onChange={(e) => setPatientInput(e.target.value)}
          className="px-2 py-1 border rounded flex-1 min-w-[180px]"
        />

        <input type="date" value={localFilters.dateFrom ?? ''} onChange={(e) => setLocalFilters((s) => ({ ...s, dateFrom: e.target.value || null }))} className="px-2 py-1 border rounded" />
        <input type="date" value={localFilters.dateTo ?? ''} onChange={(e) => setLocalFilters((s) => ({ ...s, dateTo: e.target.value || null }))} className="px-2 py-1 border rounded" />

        <input placeholder="Session type" value={localFilters.sessionType ?? ''} onChange={(e) => setLocalFilters((s) => ({ ...s, sessionType: e.target.value || null }))} className="px-2 py-1 border rounded min-w-[140px]" />

        <select value={localFilters.completion ?? 'all'} onChange={(e) => setLocalFilters((s) => ({ ...s, completion: (e.target.value as any) }))} className="px-2 py-1 border rounded">
          <option value="all">Any completion</option>
          <option value="complete">Complete</option>
          <option value="incomplete">Incomplete</option>
        </select>

        <button onClick={() => { setLocalFilters({ status: 'all', patient: '', dateFrom: null, dateTo: null, sessionType: null, completion: 'all' }); setPatientInput(''); setSearchParams({}, { replace: true }); }} className="px-3 py-1 bg-gray-100 rounded">Reset</button>
      </div>
      {infinite.isLoading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-md bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : !allItems.length ? (
        <div className="p-6 text-center text-gray-600">
          <div className="text-lg font-medium">No sessions yet</div>
          <div className="mt-2 text-sm">You don’t have any scheduled sessions. Use the schedule button to create one.</div>
        </div>
      ) : (
        <div className="divide-y border rounded">
          {allItems.map((s: TherapistSession) => (
            <SessionRow key={s.id} session={s} onOpen={onOpen} />
          ))}

          <div className="p-4 flex justify-center">
            {infinite.isFetchingNextPage ? (
              <div className="text-sm text-gray-600">Loading more…</div>
            ) : infinite.hasNextPage ? (
              <div ref={sentinelRef as any} className="text-sm text-blue-600 cursor-pointer" onClick={() => infinite.fetchNextPage()}>
                Load more
              </div>
            ) : (
              <div className="text-sm text-gray-500">End of list</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionList;
