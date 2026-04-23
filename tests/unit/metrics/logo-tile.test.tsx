// @vitest-environment happy-dom
import { afterEach, describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LogoTile } from '@/components/metrics/LogoTile';

afterEach(() => cleanup());

// happy-dom keeps style.backgroundColor as authored hex; jsdom converts
// to rgb(...). Accept either form.
function bgMatches(actual: string, hex: string): boolean {
  const h = hex.toLowerCase();
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return (
    actual.toLowerCase() === h ||
    actual === `rgb(${r}, ${g}, ${b})`
  );
}

describe('LogoTile (Phase 3.1 Wave 2)', () => {
  it('falls back to first letter of name when no src', () => {
    render(<LogoTile name="Toss" />);
    // AvatarFallback shows synchronously in happy-dom because no image
    // attempt is made. Radix AvatarImage delays; without src, fallback is immediate.
    expect(screen.getByText('T')).toBeTruthy();
  });

  it('accepts custom color for fallback background', () => {
    render(<LogoTile name="Toss" color="#0066FF" />);
    // The element carrying the initial letter is exactly the AvatarFallback span
    // (LogoTile renders no other element containing "T"). Querying by text is
    // the most robust selector across Radix versions.
    const fallback = screen.getByText('T');
    expect(bgMatches(fallback.style.backgroundColor, '#0066FF')).toBe(true);
  });

  it('honors size and radius props', () => {
    const { container } = render(<LogoTile name="Toss" size={64} radius={12} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.width).toBe('64px');
    expect(root.style.height).toBe('64px');
    expect(root.style.borderRadius).toBe('12px');
  });
});
