export type TrackedFile = {
  last_backup: number | null;
  modified_at: number;
};

export type CandidateFile = {
  modifiedAt: number;
};

/**
 * mtime fast-path: a file whose stored `modified_at` still matches is skipped
 * without hashing it. `files.hash` holds the SHA-256 of the source file itself
 * (PRD §5.6), so a content-based check can be layered on later; it is not the
 * archive hash.
 */
export function needsBackup(existing: TrackedFile | null, candidate: CandidateFile): boolean {
  if (!existing) {
    return true;
  }
  if (existing.last_backup == null) {
    return true;
  }
  return existing.modified_at !== candidate.modifiedAt;
}
