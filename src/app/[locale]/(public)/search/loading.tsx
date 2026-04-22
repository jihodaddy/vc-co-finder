import { ResultsSkeleton } from '@/components/search/ResultsSkeleton';

/**
 * App Router reserved filename — rendered by Next while the `/search`
 * RSC (page.tsx) is still awaiting its data fetch. We default to
 * `view='table'` because that's the URL-omitted default (D-06); the
 * skeleton flips on first paint after `raw.view` resolves.
 */
export default function Loading() {
  return <ResultsSkeleton view="table" />;
}
