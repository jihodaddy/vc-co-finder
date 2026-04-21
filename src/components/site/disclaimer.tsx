import { useTranslations } from 'next-intl';

/**
 * TRUST-06 disclaimer (footer.disclaimerText).
 *
 * Per D-04.7, this component must appear on every page footer so that users
 * see the disclaimer before drawing conclusions from rendered data. Copy is
 * sourced from `footer.disclaimerText` in `messages/ko.json` (D-05.4
 * Korean-as-source-of-truth) — the Korean string must NEVER appear in JSX.
 *
 * Rendered as a `<p role="note">` so assistive tech announces it as a
 * non-critical advisory rather than silent body text.
 */
export function Disclaimer() {
  const t = useTranslations('footer');
  return (
    <p role="note" className="text-xs text-neutral-600 leading-relaxed">
      {t('disclaimerText')}
    </p>
  );
}
