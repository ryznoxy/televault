import { parseClampedInt } from '../src/components/number';

describe('parseClampedInt', () => {
  it('returns fallback for empty string', () => {
    expect(parseClampedInt('', 1, 168, 42)).toBe(42);
  });

  it('returns fallback for non-numeric text', () => {
    expect(parseClampedInt('abc', 1, 168, 42)).toBe(42);
  });

  it('clamps below min up to min', () => {
    expect(parseClampedInt('0', 1, 168, 42)).toBe(1);
  });

  it('clamps above max down to max', () => {
    expect(parseClampedInt('999', 1, 168, 42)).toBe(168);
  });

  it('keeps a valid value in range', () => {
    expect(parseClampedInt('24', 1, 168, 42)).toBe(24);
  });
});
