// @vitest-environment happy-dom
import { afterEach, describe, it, expect } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Delta } from '@/components/metrics/Delta';

afterEach(() => cleanup());

// happy-dom preserves inline-style color as the authored hex string,
// whereas jsdom normalizes to rgb(...). Accept either form.
function colorMatches(actual: string, hex: string): boolean {
  const h = hex.toLowerCase();
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  const rgb = `rgb(${r}, ${g}, ${b})`;
  return actual.toLowerCase() === h || actual === rgb;
}

describe('Delta (Phase 3.1 Wave 2)', () => {
  it('renders ▲ + abs value with green color for positive', () => {
    const { container } = render(<Delta value={12.4} />);
    const span = container.querySelector('span') as HTMLSpanElement;
    expect(colorMatches(span.style.color, '#0C8A3A')).toBe(true);
    expect(container.textContent).toContain('▲');
    expect(container.textContent).toContain('12.4%');
  });

  it('renders ▼ + abs value with coral color for negative', () => {
    const { container } = render(<Delta value={-2.1} />);
    const span = container.querySelector('span') as HTMLSpanElement;
    expect(colorMatches(span.style.color, '#C03A3A')).toBe(true);
    expect(container.textContent).toContain('▼');
    expect(container.textContent).toContain('2.1%');
  });

  it('uses font-mono + tabular-nums utility classes', () => {
    const { container } = render(<Delta value={5} />);
    const span = container.querySelector('span') as HTMLSpanElement;
    expect(span.className).toContain('font-mono');
    expect(span.className).toContain('tabular-nums');
  });
});
