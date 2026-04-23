import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * Phase 3.1 brand-domain primitive (D-02.4).
 *
 * Wraps shadcn Avatar with a square-with-rounded-corners silhouette
 * (shadcn Avatar defaults to circle — we override borderRadius). When
 * `src` is absent the AvatarFallback renders the first letter of `name`
 * on a company-colored background, Geist font, white text.
 *
 * Default `color` is ink (#14120E) so passing only `name` yields a
 * brand-safe tile. RESEARCH Assumption A5: color is per-company data —
 * the consumer decides palette (no hash-to-color algorithm in v1).
 */
type Props = {
  name: string;
  src?: string;
  color?: string;
  size?: number; // px
  radius?: number; // px
  className?: string;
};

export function LogoTile({
  name,
  src,
  color = '#14120E',
  size = 40,
  radius = 8,
  className,
}: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <Avatar
      className={cn('shrink-0', className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        boxShadow:
          '0 1px 2px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,.15)',
      }}
    >
      {src && (
        <AvatarImage
          src={src}
          alt={name}
          style={{ borderRadius: radius }}
        />
      )}
      <AvatarFallback
        style={{
          backgroundColor: color,
          color: '#FFFFFF',
          borderRadius: radius,
          fontFamily: 'var(--font-geist)',
          fontWeight: 700,
          fontSize: Math.round(size * 0.45),
        }}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
