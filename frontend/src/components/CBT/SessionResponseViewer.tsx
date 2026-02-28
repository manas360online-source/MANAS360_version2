import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import useResizeObserver from '@react-hook/resize-observer';
import ResponseRow from './ResponseRow';
import { useSessionDetail } from '../../hooks/useSessionDetail';
import { exportMyTherapistSession } from '../../api/therapistSessions.api';

type Props = {
  sessionId: string;
};

// Simple hook to track sizes for VariableSizeList
function useSizeMap() {
  const sizeMap = useRef<Record<number, number>>({});
  const setSize = useCallback((index: number, size: number) => {
    sizeMap.current[index] = size;
  }, []);
  const getSize = useCallback((index: number) => sizeMap.current[index] || 120, []);
  const reset = useCallback(() => { sizeMap.current = {}; }, []);
  return { setSize, getSize, reset, sizeMap: sizeMap.current };
}

const RowWrapper: React.FC<{ index: number; style: React.CSSProperties; data: any; setSize: (i: number, s: number) => void }> = ({ index, style, data, setSize }) => {
  const item = data.items[index];
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const h = elRef.current.getBoundingClientRect().height;
    setSize(index, Math.max(80, Math.round(h)));
  }, [index, data.items, setSize]);

  return (
    <div style={style}>
      <div ref={elRef}>
        <ResponseRow item={item} sessionId={data.sessionId} />
      </div>
    </div>
  );
};

const SessionResponseViewer: React.FC<Props> = ({ sessionId }) => {
  const { data, isLoading, error } = useSessionDetail(sessionId);
  const items = useMemo(() => data?.timeline ?? [], [data]);
  const { setSize, getSize, reset } = useSizeMap();
  const listRef = useRef<any | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useResizeObserver(containerRef, () => {
    // when container resizes, force reset cached sizes
    reset();
    listRef.current?.resetAfterIndex(0, true);
  });

  useEffect(() => {
    // when items change, reset sizes
    reset();
    listRef.current?.resetAfterIndex(0, true);
  }, [items.length, reset]);

  const itemKey = useCallback((index: number, data: any) => data.items[index].id || `${index}`, []);

  const exportCsv = useCallback(async () => {
    try {
      const blob = await exportMyTherapistSession(sessionId, 'csv');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${sessionId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      alert('Export failed (server export not implemented)');
    }
  }, [sessionId]);

  if (isLoading) return <div className="p-4">Loading responses…</div>;
  if (error) return <div className="p-4 text-red-600">Error loading responses</div>;

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      <div className="flex items-center justify-between p-3 border-b">
        <div className="font-semibold">Session responses ({items.length})</div>
        <div>
          <button onClick={exportCsv} className="px-3 py-1 border rounded text-sm">Export CSV</button>
        </div>
      </div>

      <div className="flex-1" style={{ minHeight: 200 }}>
        <List
          height={600}
          itemCount={items.length}
          itemSize={(index: number) => getSize(index)}
          width={'100%'}
          itemKey={itemKey}
          ref={(r: any) => (listRef.current = r)}
          itemData={{ items, sessionId }}
        >
          {({ index, style, data }: any) => (
            <RowWrapper index={index} style={style} data={data} setSize={setSize} />
          )}
        </List>
      </div>
    </div>
  );
};

export default SessionResponseViewer;
