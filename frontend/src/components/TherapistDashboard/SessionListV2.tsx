import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listMyTherapistSessions } from '../../api/therapistSessions.api';
import { TherapistSession, Paged } from '../../types/session.types';
import { useDashboardDispatch, useDashboardState } from '../../context/dashboardContext';
import SessionQuickActions from '../Therapist/SessionQuickActions';
import Sidebar from '../Sidebar/Sidebar';
import VirtualizedSessionList from '../VirtualizedSessionList';

type Props = {
  pageSize?: number;
  onOpen?: (id: string) => void;
};

const statusColor = (s: string) => {
  switch (s) {
    case 'past':
      return 'bg-gray-200 text-gray-700';
    case 'ongoing':
      return 'bg-green-100 text-green-800';
    case 'upcoming':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const SessionRowSmall: React.FC<{ session: TherapistSession; onOpen: (id: string) => void }> = ({ session, onOpen }) => {
  const dt = new Date(session.dateTime);
  const dateLabel = dt.toLocaleString();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(session.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(session.id);
        }
      }}
      aria-label={`Open session with ${session.patientName ?? 'patient'} scheduled ${dateLabel}`}
      className="p-3 border-b flex items-center justify-between gap-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full w-10 h-10 bg-indigo-50 flex items-center justify-center text-sm font-semibold">{session.patientName?.charAt(0) ?? '?'}</div>
        <div>
          <div className="font-medium">{session.title ?? 'Therapy session'}</div>
          <div className="text-sm text-gray-500">{session.patientName}</div>
        </div>
      </div>
        <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600">{dateLabel}</div>
        <div className={`px-2 py-1 rounded-full text-xs ${statusColor(session.status)}`}>{session.status}</div>
        <div className="ml-4">
          <SessionQuickActions sessionId={session.id} templateId={(session as any).raw?.templateId ?? (session as any).raw?.template?.id} />
        </div>
      </div>
    </div>
  );
};

const SessionListV2: React.FC<Props> = ({ pageSize = 20, onOpen: onOpenProp }) => {
  const dispatch = useDashboardDispatch();
  const onOpen = onOpenProp ?? ((id: string) => dispatch({ type: 'openDrawer', payload: { sessionId: id } }));
  const { filters } = useDashboardState();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('therapist:sidebarOpen') === '1';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('therapist:sidebarOpen', sidebarOpen ? '1' : '0');
    } catch (e) {
      // ignore
    }
  }, [sidebarOpen]);

  const infinite = useInfiniteQuery(
    // include filters in the cache key so the query refreshes when filters change
    ['therapistSessions', filters],
    ({ pageParam = 1 }) =>
      listMyTherapistSessions({
        page: pageParam,
        limit: pageSize,
        status: filters.status,
        search: filters.q,
        patient: filters.patient,
        from: filters.dateFrom ?? undefined,
        to: filters.dateTo ?? undefined,
        type: filters.sessionType ?? undefined,
        completion: filters.completion ?? undefined,
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

  // lazy load by observing the sentinel
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
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
  }, [infinite]);

  if (infinite.isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-md bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!allItems.length) {
    return (
      <div className="p-6 text-center text-gray-600">
        <div className="text-lg font-medium">No sessions yet</div>
        <div className="mt-2 text-sm">You don’t have any scheduled sessions. Use the schedule button to create one.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar + overlay */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header with hamburger */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          aria-label="Toggle navigation"
          onClick={() => setSidebarOpen((s) => !s)}
          className="p-2 rounded-md bg-white dark:bg-slate-800 shadow-sm"
        >
          <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* overlay when sidebar open on mobile */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/30 md:hidden" />}

      <main className="ml-0 md:ml-64 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Virtualized list for both mobile and desktop. Item height adapts to breakpoint. */}
        <div className="w-full">
          <VirtualizedSessionList
            items={allItems}
            itemHeight={window.matchMedia && window.matchMedia('(min-width: 768px)').matches ? 72 : 112}
            className=""
            renderItem={(s: TherapistSession) => (
              <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <SessionRowSmall session={s} onOpen={onOpen} />
              </div>
            )}
          />

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
      </main>
    </div>
  );
};

export default SessionListV2;
