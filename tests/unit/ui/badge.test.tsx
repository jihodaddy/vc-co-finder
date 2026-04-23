// @vitest-environment happy-dom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

// Vitest does not auto-import Testing Library's afterEach cleanup when there
// is no setup file. Without this, previous test's DOM leaks into `document.body`
// and screen queries find stale nodes (Phase 2 pattern per other *.test.tsx files).
afterEach(() => cleanup());

/**
 * Phase 3.1 Wave 2 — D-02.2: Badge `filter-chip` variant + dismissible prop.
 *
 * Tests contract:
 *  1. filter-chip renders label text
 *  2. dismissible + onDismiss renders <button aria-label> and click invokes callback
 *  3. without `dismissible`, no button rendered
 *  4. existing variants (secondary) still render (regression guard)
 *  5. dismissAriaLabel omitted — button still renders (empty-string fallback)
 */

describe('Badge — filter-chip variant (Phase 3.1 Wave 2)', () => {
  it('renders filter-chip label', () => {
    render(<Badge variant="filter-chip">Fintech</Badge>);
    expect(screen.getByText('Fintech')).toBeTruthy();
  });

  it('renders dismiss button when dismissible + onDismiss provided, and invokes callback on click', () => {
    const fn = vi.fn();
    render(
      <Badge variant="filter-chip" dismissible onDismiss={fn} dismissAriaLabel="remove Fintech">
        Fintech
      </Badge>,
    );
    const btn = screen.getByRole('button', { name: 'remove Fintech' });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT render dismiss button when dismissible is false/absent', () => {
    render(<Badge variant="filter-chip">Fintech</Badge>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('existing secondary variant still renders (regression guard)', () => {
    render(<Badge variant="secondary">Old</Badge>);
    const el = screen.getByText('Old');
    expect(el.getAttribute('data-slot')).toBe('badge');
  });
});
