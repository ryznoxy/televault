/**
 * Splits the run's file budget across the categories that still have files.
 *
 * `maxFilesPerRun` bounds the whole backup, not each category: applying it per
 * category let a 250 budget upload 250 files per category (500 with photos and
 * videos alone). Every category that has work still gets a slice, so no category
 * is starved by a bigger one, and the remainder goes to the earliest categories
 * in scan order to keep the total at or below the budget.
 */
export function shareBudget(counts: number[], budget: number): number[] {
  const cap = Math.max(1, Math.floor(budget));
  const active = counts.filter(count => count > 0).length;
  if (active === 0) {
    return counts.map(() => 0);
  }
  const base = Math.floor(cap / active);
  const remainder = cap - base * active;
  let seen = 0;
  return counts.map(count => {
    if (count <= 0) {
      return 0;
    }
    const quota = base + (seen < remainder ? 1 : 0);
    seen += 1;
    return Math.min(count, quota);
  });
}