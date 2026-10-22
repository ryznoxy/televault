import { noteRateLimited, noteSendOk, resetThrottle, sendGapMs } from '../src/net/throttle';

beforeEach(() => {
  resetThrottle();
});

test('starts at the floor and stays there while sends succeed', () => {
  expect(sendGapMs()).toBe(1000);
  noteSendOk();
  expect(sendGapMs()).toBe(1000);
});

test('a 429 raises the gap to the window it asked for', () => {
  noteRateLimited(5);
  expect(sendGapMs()).toBe(5000);
});

test('a 429 without a window at least doubles the gap, capped', () => {
  noteRateLimited();
  expect(sendGapMs()).toBe(2000);
  noteRateLimited();
  expect(sendGapMs()).toBe(4000);
  for (let i = 0; i < 10; i += 1) {
    noteRateLimited();
  }
  expect(sendGapMs()).toBe(30_000);
});

test('clean sends halve the gap back to the floor', () => {
  noteRateLimited(8);
  expect(sendGapMs()).toBe(8000);
  noteSendOk();
  expect(sendGapMs()).toBe(4000);
  noteSendOk();
  noteSendOk();
  expect(sendGapMs()).toBe(1000);
});

test('a nonsense window does not move the gap below the floor', () => {
  noteRateLimited(0);
  expect(sendGapMs()).toBe(2000);
  noteRateLimited(-3);
  expect(sendGapMs()).toBe(4000);
});