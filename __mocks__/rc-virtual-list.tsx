/**
 * Minimal test double for rc-virtual-list.
 *
 * The real VirtualList relies on DOM measurements (clientHeight, scrollHeight)
 * which are not available in jsdom.  This mock renders all items directly so
 * component tests can assert on list content without real viewport geometry.
 */
import React from 'react';

interface VirtualListProps<T> {
    data: T[];
    itemKey: string | ((item: T) => string | number);
    children: (item: T) => React.ReactNode;
    height?: number;
    itemHeight?: number;
    onScroll?: React.UIEventHandler<HTMLElement>;
}

function VirtualList<T>({data, children, itemKey, onScroll}: VirtualListProps<T>) {
    const getKey = (item: T, index: number): string | number => {
        if (typeof itemKey === 'function') return itemKey(item);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const k = (item as any)[itemKey];
        return k !== undefined ? k : index;
    };

    return (
            <div data-testid="virtual-list" onScroll={onScroll}>
                {data.map((item, index) => (
                        <div key={getKey(item, index)}>{children(item)}</div>
                ))}
            </div>
    );
}

export default VirtualList;

