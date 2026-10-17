export type PassphraseStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
};

const CLASS = {
  lower: /[a-z]/,
  upper: /[A-Z]/,
  digit: /[0-9]/,
  symbol: /[^A-Za-z0-9]/,
};

/** Pure: score 0..4 from length + character classes. */
export function passphraseStrength(value: string): PassphraseStrength {
  if (!value) {
    return { score: 0, label: 'Kosong' };
  }
  let classes = 0;
  if (CLASS.lower.test(value)) classes += 1;
  if (CLASS.upper.test(value)) classes += 1;
  if (CLASS.digit.test(value)) classes += 1;
  if (CLASS.symbol.test(value)) classes += 1;

  const length = value.length;
  let score: 0 | 1 | 2 | 3 | 4 = 1;
  if (length >= 16 && classes >= 3) score = 4;
  else if (length >= 12 && classes >= 3) score = 3;
  else if (length >= 9 && classes >= 2) score = 2;
  else if (length < 1) score = 0;

  const labels = ['Kosong', 'Lemah', 'Sedang', 'Kuat', 'Sangat kuat'] as const;
  return { score, label: labels[score] };
}
