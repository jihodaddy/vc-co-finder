import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * Company logo with letter-avatar fallback (D-Discretion-4).
 *
 * PNG only — Phase 2 does NOT enable images.dangerouslyAllowSVG in
 * next.config.ts (Research A7 resolution). If a future seed company
 * supplies only SVG, Phase 4a R2 migration handles optimization.
 *
 * Accessibility: alt text = "{displayNameKo} 로고" via
 * profile.hero.logoAltSuffix key.
 */
export async function CompanyLogo({
  displayNameKo,
  logoUrl,
  size = 72,
  priority = false,
}: {
  displayNameKo: string;
  logoUrl: string | null;
  size?: number;
  priority?: boolean;
}) {
  const t = await getTranslations('profile.hero');
  const alt = `${displayNameKo}${t('logoAltSuffix')}`;

  if (!logoUrl) {
    const letter = displayNameKo.trim().charAt(0) || '?';
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          'flex items-center justify-center rounded-md',
          'bg-muted text-muted-foreground font-semibold',
        )}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      >
        {letter}
      </div>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt={alt}
      width={size}
      height={size}
      className="rounded-md"
      priority={priority}
    />
  );
}
