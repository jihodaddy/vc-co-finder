// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => (key === 'logoAltSuffix' ? ' 로고' : key),
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => React.createElement('img', { 'data-testid': 'nextimg', ...props }),
}));

import { CompanyLogo } from '@/components/profile/CompanyLogo';

describe('CompanyLogo', () => {
  it('renders letter-avatar when logoUrl is null', async () => {
    const node = await CompanyLogo({ displayNameKo: '토스', logoUrl: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(node as any);
    const avatar = container.querySelector('[role="img"]');
    expect(avatar).not.toBeNull();
    expect(avatar!.textContent).toBe('토');
    expect(avatar!.getAttribute('aria-label')).toBe('토스 로고');
  });

  it('renders next/image when logoUrl is provided', async () => {
    const node = await CompanyLogo({
      displayNameKo: '토스',
      logoUrl: '/logos/toss.png',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { getByTestId } = render(node as any);
    const img = getByTestId('nextimg');
    expect(img.getAttribute('src')).toBe('/logos/toss.png');
    expect(img.getAttribute('alt')).toBe('토스 로고');
  });

  it('fallback uses first char of displayNameKo (Korean syllable)', async () => {
    const node = await CompanyLogo({ displayNameKo: '당근', logoUrl: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(node as any);
    expect(container.querySelector('[role="img"]')!.textContent).toBe('당');
  });
});
