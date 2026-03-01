import React from 'react';
import { FixedSizeList as List } from 'react-window';

type VirtualizedSessionListProps<T> = {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
};

function VirtualizedSessionList<T>({ items, itemHeight, renderItem, className }: VirtualizedSessionListProps<T>) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    return (
      <div style={style} className="px-0">
        {renderItem(item as T, index)}
      </div>
    );
  };

  // provide a reasonable max height; AutoSizer will shrink if container smaller
  const estimatedHeight = Math.min(items.length * itemHeight, 800);

  return (
    <div style={{ height: estimatedHeight }} className={className}>
      <List height={estimatedHeight} itemCount={items.length} itemSize={itemHeight} width="100%">
        {Row}
      </List>
    </div>
  );
}

export default VirtualizedSessionList;
