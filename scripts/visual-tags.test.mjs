// The visual harness reads `vh-<n>` beside `vw-<n>`: parsed, applied, and a story without it keeps the default height.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_HEIGHT, tagNumber, viewportFor } from '../apps/storybook/tests/visual/tags.mjs';

test('vh-<n> is parsed like vw-<n>, and only an exact tag counts', () => {
  assert.equal(tagNumber(['wp-01', 'vw-1280', 'vh-1600'], 'vh'), 1600);
  assert.equal(tagNumber(['wp-01', 'vw-1280', 'vh-1600'], 'vw'), 1280);
  assert.equal(tagNumber(['vh-16x', 'xvh-9', 'vh-'], 'vh'), undefined);
  assert.equal(tagNumber(undefined, 'vh'), undefined);
});

test('a height tag is applied with the tagged (or current) width', () => {
  assert.deepEqual(viewportFor(['vw-1280', 'vh-1600'], 800), { width: 1280, height: 1600 });
  assert.deepEqual(viewportFor(['vh-1200'], 777), { width: 777, height: 1200 });
});

test('a story without a height tag keeps 800; a story with neither tag gets no override', () => {
  assert.equal(DEFAULT_HEIGHT, 800);
  assert.deepEqual(viewportFor(['vw-1100'], 800), { width: 1100, height: 800 });
  assert.equal(viewportFor(['wp-01'], 800), undefined);
});
