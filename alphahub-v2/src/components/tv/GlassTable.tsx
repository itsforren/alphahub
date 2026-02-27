import { memo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassTableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface GlassTableProps<T> {
  data: T[];
  columns: GlassTableColumn<T>[];
  keyExtractor: (item: T, index: number) => string;
  showRank?: boolean;
  rankVariant?: 'success' | 'danger' | 'default';
  compact?: boolean;
  className?: string;
  emptyMessage?: string;
}

function RankBadge({ rank, variant = 'default' }: { rank: number; variant?: 'success' | 'danger' | 'default' }) {
  if (rank <= 3) {
    return (
      <div className={cn(
        'rank-badge',
        rank === 1 && 'rank-badge-1',
        rank === 2 && 'rank-badge-2',
        rank === 3 && 'rank-badge-3'
      )}>
        {rank}
      </div>
    );
  }
  
  return (
    <div className="rank-badge rank-badge-default">
      {rank}
    </div>
  );
}

export function GlassTable<T>({
  data,
  columns,
  keyExtractor,
  showRank = false,
  rankVariant = 'default',
  compact = false,
  className,
  emptyMessage = 'No data available',
}: GlassTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <table className={cn('glass-table', compact && 'compact', className)}>
      <tbody>
        {data.map((item, index) => (
          <motion.tr
            key={keyExtractor(item, index)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            className={cn('glass-table-row', compact && 'py-0.5')}
          >
            {showRank && (
              <td className={cn(compact ? 'w-8' : 'w-16')}>
                <RankBadge rank={index + 1} variant={rankVariant} />
              </td>
            )}
            {columns.map((col) => (
              <td
                key={String(col.key)}
                className={cn(
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.className
                )}
              >
                {col.render
                  ? col.render(item, index)
                  : String((item as Record<string, unknown>)[col.key as string] ?? '')}
              </td>
            ))}
          </motion.tr>
        ))}
      </tbody>
    </table>
  );
}

export default memo(GlassTable) as typeof GlassTable;
