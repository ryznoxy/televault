import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { UpdateAlert } from '../src/components/ui';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useUpdateStore } from '../src/state/updateStore';

const RELEASE = {
  tag: 'v9.9.9',
  apkUrl: 'https://x/app-release.apk',
  sha256: 'A'.repeat(64),
  size: 2 * 1024 * 1024,
};

function render(): ReactTestRenderer.ReactTestRenderer {
  let tree: ReactTestRenderer.ReactTestRenderer | null = null;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <UpdateAlert />
      </ThemeProvider>,
    );
  });
  if (!tree) {
    throw new Error('renderer did not mount');
  }
  return tree as unknown as ReactTestRenderer.ReactTestRenderer;
}

function shown(tree: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(tree.toJSON());
}

function setUpdate(state: {
  update?: typeof RELEASE | null;
  phase?: 'idle' | 'downloading' | 'opening';
  progress?: number;
}) {
  ReactTestRenderer.act(() => {
    useUpdateStore.setState({
      update: state.update === undefined ? null : state.update,
      phase: state.phase ?? 'idle',
      progress: state.progress ?? 0,
      cancelRequested: false,
    });
  });
}

beforeEach(() => {
  setUpdate({});
});

test('nothing is shown while no release is known', () => {
  expect(shown(render())).toBe('null');
});

test('a known release shows both choices', () => {
  setUpdate({ update: RELEASE });
  const text = shown(render());
  expect(text).toContain('Pembaruan v9.9.9 tersedia');
  expect(text).toContain('Perbarui');
  expect(text).toContain('Nanti');
  expect(text).toContain('2.0 MB');
});

test('a download in flight shows progress and a way out', () => {
  setUpdate({ update: RELEASE, phase: 'downloading', progress: 0.5 });
  const text = shown(render());
  expect(text).toContain('50%');
  expect(text).toContain('Batal');
});