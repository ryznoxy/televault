/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | null = null;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<App />);
  });
  // Unmount, or the tree's PulsingDot Animated.loop keeps a handle alive and the
  // worker never exits.
  await ReactTestRenderer.act(() => {
    tree?.unmount();
  });
});
