// Normalize an address for fuzzy dedup lookup on Customer creation. The raw
// value stays in customers.address — this is only for comparison.

const SUFFIX_MAP: Record<string, string> = {
  street: 'st',
  avenue: 'ave',
  road: 'rd',
  drive: 'dr',
  boulevard: 'blvd',
  court: 'ct',
  lane: 'ln',
  place: 'pl',
  terrace: 'ter',
  parkway: 'pkwy',
  highway: 'hwy',
  circle: 'cir',
};

export function normalizeAddress(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw.toLowerCase().trim();
  // Strip punctuation except digits/letters/spaces
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  // Expand full suffixes to their short form so "Street" and "St" match
  const tokens = s.split(' ').map((t) => SUFFIX_MAP[t] ?? t);
  return tokens.join(' ');
}

// Cheap Levenshtein for short strings. Used to catch typos in the street line
// (e.g. "Pasadna" vs "Pasadena") during customer dedup. O(m*n) but m,n < 60.
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : Math.min(prev + 1, dp[j] + 1, dp[j - 1] + 1);
      prev = temp;
    }
  }
  return dp[b.length];
}

export function addressesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeAddress(a);
  const nb = normalizeAddress(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Accept small typo distance, scaled to length so short strings don't false-positive
  const maxLen = Math.max(na.length, nb.length);
  const threshold = maxLen > 20 ? 3 : maxLen > 10 ? 2 : 1;
  return levenshtein(na, nb) <= threshold;
}
