import { cn } from '@/lib/utils';

/**
 * Phase 3.1 brand-domain primitive (D-02.4).
 *
 * Inline ▲/▼ + percent indicator. Green #0C8A3A for positive, coral
 * #C03A3A for negative (RESEARCH Assumption A4 — retained verbatim from
 * `.design-import/ui.jsx` lines 87-105 as primitive-internal values;
 * DESIGN.md §Delta documents these as component-scoped, not global tokens).
 *
 * Uses font-mono (Geist Mono via Wave 1) + tabular-nums so column
 * alignment is preserved when Delta indicators stack in a table cell.
 */
type Props = {
  value: number;
  size?: number; // font size in px (default 12)
  className?: string;
};

export function Delta({ value, size = 12, className }: Props) {
  const up = value >= 0;
  const color = up ? '#0C8A3A' : '#C03A3A';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-mono font-semibold tabular-nums',
        className,
      )}
      style={{ fontSize: size, color }}
    >
      <span style={{ fontSize: size - 2 }} aria-hidden>
        {up ? '▲' : '▼'}
      </span>
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}
