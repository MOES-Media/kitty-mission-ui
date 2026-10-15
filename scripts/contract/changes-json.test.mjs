// contracts/fixtures/mission-status.changes.json (WP03 T017; FR-011, NFR-004, R2-05): the authored change sequence the
// stub streams and the shell's fixture adapter replays. Each invariant of the gate has a negative case built from the
// committed file and the committed file itself as the positive control.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT } from './common.mjs';
import { changesProblems } from './check.mjs';
import { FIXTURE_FILES } from './generate.mjs';

const TOKEN = 'change sequence';
const committed = JSON.parse(readFileSync(join(ROOT, FIXTURE_FILES.changes), 'utf8'));
const copy = () => structuredClone(committed);
const messages = async (doc) => {
  const problems = await changesProblems(doc);
  for (const p of problems) assert.equal(p.token, TOKEN);
  return problems.map((p) => p.message);
};
const indexOf = (doc, event) => doc.items.findIndex((i) => i.event === event);

/** The mutated copy fails with exactly one message containing `expected`; the committed file passes. */
async function failsWith(mutate, expected) {
  const doc = copy();
  mutate(doc);
  const got = await messages(doc);
  assert.equal(got.length, 1, got.join('\n'));
  assert.ok(got[0].includes(expected), got[0]);
}

test('positive control: the committed sequence passes every invariant', async () => {
  assert.deepEqual(await messages(copy()), []);
});

test('the committed sequence: five items in the specified order, delays 0 then 250, one mission id from the vendored examples', () => {
  assert.deepEqual(committed.items.map((i) => i.event), ['mission-lifecycle', 'status-transition', 'status-transition', 'log-truncated', 'status-transition']);
  assert.deepEqual(committed.items.map((i) => i.delayMs), [0, 250, 250, 250, 250]);
  assert.equal(committed.missionId, '01JZAB3C4D5E6F7G8H9JKMNPQR');
  const lanes = committed.items.filter((i) => i.event === 'status-transition').map((i) => [i.data.fromStatusLane, i.data.toStatusLane]);
  assert.deepEqual(lanes.slice(0, 2), [['planned', 'claimed'], ['claimed', 'in_progress']]);
  assert.equal(lanes.length, 3);
});

test('invariant data: a data field outside its event schema is refused, naming the schema', () =>
  failsWith((d) => {
    d.items[indexOf(d, 'status-transition')].data.extra = true;
  }, 'StatusTransitionEvent'));

test('invariant data: lifecycle and truncation data are each checked against their own schema', async () => {
  await failsWith((d) => {
    d.items[indexOf(d, 'mission-lifecycle')].data.eventType = 'NotAType';
  }, 'MissionLifecycleEvent');
  await failsWith((d) => {
    d.items[indexOf(d, 'log-truncated')].data.reason = 'unknown';
  }, 'LogTruncatedEvent');
});

test('invariant kinds: a sequence without a log-truncated item is refused', () =>
  failsWith((d) => {
    d.items.splice(indexOf(d, 'log-truncated'), 1);
  }, 'has no log-truncated item'));

test('invariant kinds: an unknown event name is refused', () =>
  failsWith((d) => {
    d.items.push({ ...structuredClone(d.items[d.items.length - 1]), event: 'heartbeat' });
    delete d.items[d.items.length - 1].scopedId;
  }, 'unknown event heartbeat'));

test('invariant mission: an item of another mission is refused', () =>
  failsWith((d) => {
    d.items[1].data.missionId = '01JZAB3C4D5E6F7G8H9JKMNPQS';
  }, 'names mission 01JZAB3C4D5E6F7G8H9JKMNPQS'));

test('invariant offsets: a scopedId offset that does not increase is refused', () =>
  failsWith((d) => {
    const [a, b] = d.items.filter((i) => i.scopedId);
    b.scopedId = a.scopedId;
    b.data.streamCursor = structuredClone(a.data.streamCursor);
  }, 'does not increase'));

test('invariant truncation: a log-truncated item with a scopedId is refused', () =>
  failsWith((d) => {
    d.items[indexOf(d, 'log-truncated')].scopedId = `0:${'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}`;
  }, 'log-truncated item carries scopedId'));

test('invariant scoped: a status-transition item without a scopedId is refused', () =>
  failsWith((d) => {
    delete d.items[indexOf(d, 'status-transition')].scopedId;
  }, 'lacks a scopedId'));

test('invariant pattern: a scopedId that is not a StreamCursorString is refused (leading zero, upper-case hex)', async () => {
  await failsWith((d) => {
    const item = d.items[indexOf(d, 'status-transition')];
    item.scopedId = `0${item.scopedId}`;
  }, 'is not a StreamCursorString');
  await failsWith((d) => {
    const item = d.items[indexOf(d, 'status-transition')];
    item.scopedId = item.scopedId.toUpperCase();
  }, 'is not a StreamCursorString');
});

test('invariant cursor: a scopedId that differs from the cursor inside its data is refused', () =>
  failsWith((d) => {
    const item = d.items[indexOf(d, 'mission-lifecycle')];
    item.scopedId = `1:${item.scopedId.split(':')[1]}`;
  }, 'differs from its data streamCursor'));

test('invariant envelope: a negative delay, an extra item field and a missing items list are refused', async () => {
  await failsWith((d) => {
    d.items[1].delayMs = -1;
  }, 'delayMs');
  await failsWith((d) => {
    d.items[1].note = 'x';
  }, 'unexpected field note');
  const got = await messages({ missionId: committed.missionId });
  assert.equal(got.length, 1);
  assert.ok(got[0].includes('items'), got[0]);
});
