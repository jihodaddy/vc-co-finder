import { z } from 'zod';

/**
 * DSAR submission schema — FOUND-12 / D-04.3.
 *
 * Field bounds MUST stay aligned with the `dsar_insert_public` RLS WITH CHECK
 * constraints in `supabase/migrations/0013_rls_user_scoped.sql` (Plan 03).
 * If you widen here without widening the policy, valid form submissions will
 * fail at the database layer with a confusing error.
 *
 * SSRF note: `evidenceUrl` requires `https://` so an attacker cannot point us
 * at `http://localhost:8080` or `file://`. The server NEVER fetches this URL —
 * it is stored as TEXT for an admin to inspect manually in a separate browser.
 */
export const DsarRequestSchema = z.object({
  requesterName: z.string().trim().min(1).max(100),
  requesterEmail: z.string().trim().email().min(5).max(320),
  requesterPhone: z.string().trim().max(40).optional().or(z.literal('')),
  requestType: z.enum(['access', 'rectification', 'erasure', 'restriction']),
  subjectDescription: z.string().trim().min(1).max(5000),
  evidenceUrl: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine((u) => u.startsWith('https://'), {
      message: 'URL must start with https://',
    })
    .optional()
    .or(z.literal('')),
});

export type DsarRequestInput = z.infer<typeof DsarRequestSchema>;
