import { test } from 'node:test';
import * as assert from 'node:assert';
import { flatOrder, status, Project } from './registry';

const ps: Project[] = [
  { path: '/b', name: 'b' },
  { path: '/a', name: 'a', group: 'g' },
  { path: '/c', name: 'c', pinned: true },
  { path: '/z', name: 'z', group: 'g', pinned: true },
];

test('order: pinned first, ungrouped before groups', () => {
  assert.deepStrictEqual(flatOrder(ps).map(p => p.name), ['c', 'b', 'z', 'a']);
});

test('status: stale windows count as closed, dirty propagates', () => {
  const now = 100_000;
  const w = [{ path: '/a', dirty: true, seen: now - 1000 }, { path: '/b', dirty: false, seen: now - 60_000 }];
  assert.deepStrictEqual(status(ps[1], w, now), { running: true, dirty: true });
  assert.deepStrictEqual(status(ps[0], w, now), { running: false, dirty: false });
});
