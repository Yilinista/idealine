// Page-level checks on saved real-term snapshots and the gallery (see scripts/check_pages.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pages, checkPage } from '../scripts/check_pages.mjs';

for (const p of pages()) {
  test(`page is consistent: ${p.name}`, () => {
    assert.deepEqual(p.stale || [], [], 'rebuild the gallery: uv run python scripts/build_gallery.py');
    assert.deepEqual(checkPage(p.data, { expect: p.expect }), []);
  });
}

test('the checks catch the paid-tester problems', () => {
  // Takeoff after the data date, a card after it, the same paper twice.
  const d = { generated: '2026-11-17', counts: [[2020, 1], [2021, 1], [2022, 1], [2023, 1], [2024, 30], [2025, 60], [2026, 90]], quotes: [], milestones: [
    { year: 2020, kind: 'origin', title: 'A', why: 'One of the earliest uses found.', url: 'https://example.org/a' },
    { year: 2024, kind: 'popularized', title: 'A', why: 'Cited 5 times.', url: 'https://example.org/a' },
  ] };
  assert.deepEqual(checkPage(d), []);  // one paper is shown once, not twice
  assert.match(checkPage(d, { expect: { takeoff: 2026 } }).join('\n'), /takeoff is 2024, the snapshot expects 2026/);
});
