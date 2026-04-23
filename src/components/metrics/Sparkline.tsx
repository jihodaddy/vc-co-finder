'use client';

import { Area, AreaChart } from 'recharts';
import {
  ChartContainer,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

/**
 * Phase 3.1 brand-domain primitive (D-02.4).
 *
 * Thin wrapper around shadcn ChartContainer + Recharts AreaChart. Ships
 * as a PRIMITIVE — actual time-series data wiring lives in Phase 6.
 * `color` accepts either a raw hex or a `var(--color-chart-*)` reference;
 * the ChartContainer injects it as `--color-v` into a scoped stylesheet.
 *
 * Tooltip is intentionally omitted in v1 per RESEARCH Open Q #2
 * (primitive stays minimal; Phase 6 consumer can compose ChartTooltip).
 */
export type SparklineProps = {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
};

type Point = { v: number };

export function Sparkline({
  data,
  color = 'var(--color-chart-1)',
  width = 120,
  height = 36,
  className,
}: SparklineProps) {
  const chartData: Point[] = data.map((v) => ({ v }));
  const config = {
    v: { color, label: 'Trend' },
  } satisfies ChartConfig;

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto', className)}
      style={{ width, height }}
    >
      <AreaChart
        data={chartData}
        margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
      >
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-v)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-v)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="var(--color-v)"
          strokeWidth={1.5}
          fill="url(#spark-fill)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
