import { shareBudget } from '../src/backup/fileBudget';

test('splits the budget across the categories that have files', () => {
  expect(shareBudget([300, 300], 250)).toEqual([125, 125]);
});

test('the remainder goes to the earliest categories', () => {
  expect(shareBudget([300, 300, 300], 250)).toEqual([84, 83, 83]);
});

test('a single category gets the whole budget', () => {
  expect(shareBudget([300], 250)).toEqual([250]);
});

test('a zero-count category keeps its slot and gets no share', () => {
  expect(shareBudget([5, 0, 7], 250)).toEqual([5, 0, 7]);
});

test('a budget smaller than the number of categories still moves the first ones', () => {
  expect(shareBudget([10, 10, 10], 2)).toEqual([1, 1, 0]);
  expect(shareBudget([10, 10, 10], 1)).toEqual([1, 0, 0]);
});

test('a zero budget still processes one file, and no categories means no work', () => {
  expect(shareBudget([10, 10], 0)).toEqual([1, 0]);
  expect(shareBudget([0, 0], 250)).toEqual([0, 0]);
});