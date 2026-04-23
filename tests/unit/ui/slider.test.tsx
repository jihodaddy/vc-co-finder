// @vitest-environment happy-dom
import { afterEach, describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Slider } from '@/components/ui/slider';

afterEach(() => cleanup());

/**
 * Phase 3.1 Wave 2 — D-02.3: shadcn Slider with dual-thumb range support.
 *
 * Radix Slider supports array-valued `value` natively but the shadcn
 * CLI-generated slider.tsx only renders a single <Thumb />. Task 1 patched
 * it to render one <Thumb /> per value-array entry.
 *
 * This test guards that patch — FacetRangeInputs (Wave 4) depends on
 * `value={[min, max]}` rendering two a11y-accessible handles.
 */

describe('Slider — dual-thumb range (Phase 3.1 Wave 2)', () => {
  it('renders 2 thumbs when value is an array of 2', () => {
    render(
      <Slider value={[10, 50]} min={0} max={100} onValueChange={() => {}} />,
    );
    const thumbs = screen.getAllByRole('slider');
    expect(thumbs).toHaveLength(2);
  });

  it('renders 1 thumb in single-value mode (regression)', () => {
    render(
      <Slider value={[30]} min={0} max={100} onValueChange={() => {}} />,
    );
    const thumbs = screen.getAllByRole('slider');
    expect(thumbs).toHaveLength(1);
  });

  it('thumbs carry aria-valuemin and aria-valuemax from props', () => {
    render(
      <Slider value={[10, 90]} min={0} max={100} onValueChange={() => {}} />,
    );
    const thumbs = screen.getAllByRole('slider');
    expect(thumbs[0].getAttribute('aria-valuemin')).toBe('0');
    expect(thumbs[0].getAttribute('aria-valuemax')).toBe('100');
  });
});
