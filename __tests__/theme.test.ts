import { ELEVATION, RADIUS, SPACE, TG, TYPE, themes } from '../src/theme/theme';

describe('design tokens', () => {
  it('light mode is a light surface with dark ink', () => {
    expect(themes.light.bg).toBe('#F4F4F7');
    expect(themes.light.surface).toBe('#FFFFFF');
    expect(themes.light.ink).toBe('#111114');
  });

  it('dark mode is a dark surface with light ink', () => {
    expect(themes.dark.bg).toBe('#0B0B0F');
    expect(themes.dark.ink).toBe('#F5F5F7');
  });

  it('both modes share the same key set', () => {
    expect(Object.keys(themes.dark).sort()).toEqual(Object.keys(themes.light).sort());
  });

  it('every mode defines accent and glass tokens', () => {
    for (const theme of [themes.light, themes.dark]) {
      expect(theme.accent).toMatch(/^#|rgba/);
      expect(theme.glass).toContain('rgba');
      expect(theme.glassBorder).toContain('rgba');
    }
  });

  it('exposes the TeleVault (TG) palette alongside the legacy themes', () => {
    expect(TG.bg).toBe('#F8F9FF');
    expect(TG.card).toBe('#FFFFFF');
    expect(TG.primaryContainer).toBe('#229ED9');
  });

  it('spacing follows an 8-point grid', () => {
    for (const value of Object.values(SPACE)) {
      expect(value % 4).toBe(0);
    }
    expect(SPACE.md % 4).toBe(0);
    expect(RADIUS.pill).toBeGreaterThanOrEqual(999);
    expect(TYPE.display.fontSize).toBeGreaterThan(TYPE.body.fontSize);
    expect(ELEVATION.float.elevation).toBeGreaterThan(ELEVATION.card.elevation);
  });
});
