// @vitest-environment happy-dom
import { afterEach, describe, it, expect } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Sparkline } from '@/components/metrics/Sparkline';

afterEach(() => cleanup());

describe('Sparkline (Phase 3.1 Wave 2)', () => {
  // NOTE: Recharts' ResponsiveContainer depends on ResizeObserver + real
  // element dimensions, which happy-dom reports as 0. As a result the
  // inner <svg> does not render in this environment. We therefore assert
  // on the ChartContainer wrapper and style propagation — that's the
  // unit-testable contract. Full SVG render is covered in e2e / visual.

  it('renders ChartContainer wrapper with inline width/height style when provided', () => {
    const { container } = render(
      <Sparkline data={[1, 2, 3, 4, 5]} width={120} height={36} />,
    );
    const chart = container.querySelector('[data-chart]') as HTMLElement;
    expect(chart).toBeTruthy();
    expect(chart.style.width).toBe('120px');
    expect(chart.style.height).toBe('36px');
  });

  it('applies default dimensions (120×36) when width/height omitted', () => {
    const { container } = render(<Sparkline data={[10, 20]} />);
    const chart = container.querySelector('[data-chart]') as HTMLElement;
    expect(chart).toBeTruthy();
    expect(chart.style.width).toBe('120px');
    expect(chart.style.height).toBe('36px');
  });
});
