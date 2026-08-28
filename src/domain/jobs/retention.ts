/**
 * Cap the jobs store so completed runs do not accumulate forever.
 *
 * Cards keep their own prompts; the job row is only needed while a run is
 * live (poll / busy / stop) and for a short window of full rerolls. Active
 * rows are never dropped, even if that means the store briefly exceeds the cap.
 */

export const JOB_RETENTION_LIMIT = 10;

/** Same set as `ACTIVE_JOB_STATES` in job-locks — in-flight rows must survive. */
const ACTIVE_STATES = new Set(['queued', 'tagging', 'generating']);

export interface JobRetentionRow {
  id: string;
  state?: string;
  created_at?: number;
  updated_at?: number;
}

export function jobRetentionStamp(row: JobRetentionRow): number {
  const updated = Number(row.updated_at);
  if (Number.isFinite(updated) && updated > 0) return updated;
  const created = Number(row.created_at);
  return Number.isFinite(created) && created > 0 ? created : 0;
}

/** Ids that fall outside the newest `limit` rows, excluding any still running. */
export function jobIdsToPrune(
  rows: readonly JobRetentionRow[],
  limit = JOB_RETENTION_LIMIT,
): string[] {
  if (rows.length <= limit) return [];
  const keep = new Set<string>();
  for (const row of rows) {
    const id = String(row.id || '');
    if (id && ACTIVE_STATES.has(String(row.state || ''))) keep.add(id);
  }
  const newest = [...rows].sort((a, b) => {
    const dt = jobRetentionStamp(b) - jobRetentionStamp(a);
    if (dt !== 0) return dt;
    return String(b.id).localeCompare(String(a.id));
  });
  for (const row of newest) {
    if (keep.size >= limit) break;
    const id = String(row.id || '');
    if (id) keep.add(id);
  }
  const drop: string[] = [];
  for (const row of rows) {
    const id = String(row.id || '');
    if (id && !keep.has(id)) drop.push(id);
  }
  return drop;
}
