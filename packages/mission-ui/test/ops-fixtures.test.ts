// The Ops fixtures: the generated contract fixtures (counts by equality), the story-argument helpers of
// `elements/sk-ops-screen/fixtures.ts` (a shape test per helper) and the deterministic page builders.
import { describe, expect, it } from 'vitest';
import * as generated from '../src/contract/fixtures.generated.js';
import { makeOpsPage } from '../src/contract/bulk.js';
import type { OpsInvocationView } from '../src/contract/types.js';
import {
  OPS_INVOCATION_FIXTURES,
  OPS_PAGE_FIXTURES,
  OPS_PROFILE,
  OPS_REFUSAL_FIXTURES,
  opsAccumulated,
  opsPageOf,
  opsProps,
  opsRowProps,
} from '../src/elements/sk-ops-screen/fixtures.js';

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const HANDLE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;

describe('generated Ops fixtures', () => {
  it('the generated module exports 157 fixtures, 36 of them Ops (equality)', () => {
    const names = Object.keys(generated);
    expect(names.length).toBe(157);
    const ops = names.filter((n) => /^ops[A-Z]/.test(n) || n === 'opsCursorRefusal');
    expect(ops.length).toBe(36);
    expect(names.filter((n) => /^ops/.test(n)).length).toBe(36);
    expect(Object.keys(OPS_INVOCATION_FIXTURES).length).toBe(29);
    expect(Object.keys(OPS_PAGE_FIXTURES).length).toBe(5);
    expect(Object.keys(OPS_REFUSAL_FIXTURES).length).toBe(2);
    expect(29 + 5 + 2).toBe(ops.length);
  });

  it('every Ops fixture the helpers expose is a generated export, by identity', () => {
    const all = { ...OPS_INVOCATION_FIXTURES, ...OPS_PAGE_FIXTURES, ...OPS_REFUSAL_FIXTURES } as Record<string, unknown>;
    let ran = 0;
    for (const [name, value] of Object.entries(all)) {
      expect((generated as Record<string, unknown>)[name], name).toBe(value);
      ran += 1;
    }
    expect(ran).toBe(36);
  });

  it('the refusals carry the codes the screen branches on', () => {
    expect(OPS_REFUSAL_FIXTURES.opsRefusalUnreadable.code).toBe('ops_unreadable');
    expect(OPS_REFUSAL_FIXTURES.opsRefusalUnreadable.status).toBe(500);
    expect(OPS_REFUSAL_FIXTURES.opsCursorRefusal.code).toBe('invalid_page_cursor');
    expect(OPS_REFUSAL_FIXTURES.opsCursorRefusal.status).toBe(400);
  });
});

describe('story-argument helpers', () => {
  it('ready: the first page as given', () => {
    const p = opsProps.ready();
    const first = OPS_PAGE_FIXTURES.opsPageFirst;
    expect(p.status).toBe('ready');
    expect(p.items).toEqual(first.items);
    expect(p.pageInfo).toEqual(first.pageInfo);
    expect(p.totalCount).toBe(5);
    expect(p.skippedCount).toBe(1);
    expect(p.items.length).toBe(2);
    expect(p.profile).toBeNull();
    expect(p.loadingMore).toBe(false);
    expect(p.loadMoreError).toBeNull();
    expect(p.refusalCode).toBeNull();
  });

  it('loading: no items, the busy look', () => {
    const p = opsProps.loading();
    expect(p.status).toBe('loading');
    expect(p.items).toEqual([]);
    expect(p.pageInfo).toBeNull();
    expect(p.totalCount).toBe(0);
    expect(p.skippedCount).toBe(0);
  });

  it('loadingMore: the first page with the load-more request in flight', () => {
    const p = opsProps.loadingMore();
    expect(p.status).toBe('ready');
    expect(p.loadingMore).toBe(true);
    expect(p.pageInfo?.hasNextPage).toBe(true);
    expect(p.items).toEqual(opsProps.ready().items);
    expect(opsProps.ready().loadingMore).toBe(false);
  });

  it('lastPage: no next page and no cursor', () => {
    const p = opsProps.lastPage();
    expect(p.status).toBe('ready');
    expect(p.pageInfo?.hasNextPage).toBe(false);
    expect(p.pageInfo?.nextPageCursor).toBeNull();
    expect(p.items).toEqual(OPS_PAGE_FIXTURES.opsPageLast.items);
    expect(p.items.length).toBe(1);
  });

  it('loadMoreError: the first page with a code, and with no code', () => {
    const coded = opsProps.loadMoreError('ops_unreadable');
    expect(coded.status).toBe('ready');
    expect(coded.loadMoreError).toEqual({ code: 'ops_unreadable' });
    expect(coded.pageInfo?.hasNextPage).toBe(true);
    expect(opsProps.loadMoreError(null).loadMoreError).toEqual({ code: null });
    expect(opsProps.ready().loadMoreError).toBeNull();
  });

  it('refusedCursor: a load-more error whose code is the refusal fixture code', () => {
    const p = opsProps.refusedCursor();
    expect(p.status).toBe('ready');
    expect(p.loadMoreError).toEqual({ code: OPS_REFUSAL_FIXTURES.opsCursorRefusal.code });
    expect(p.loadMoreError?.code).toBe('invalid_page_cursor');
  });

  it('empty, emptySkipped and emptyProfile', () => {
    const e = opsProps.empty();
    expect(e.status).toBe('empty');
    expect(e.items).toEqual([]);
    expect(e.totalCount).toBe(0);
    expect(e.skippedCount).toBe(0);
    expect(e.profile).toBeNull();
    const s = opsProps.emptySkipped();
    expect(s.status).toBe('empty');
    expect(s.items).toEqual([]);
    expect(s.skippedCount).toBe(3);
    const f = opsProps.emptyProfile();
    expect(f.status).toBe('empty');
    expect(f.profile).toBe(OPS_PROFILE);
    expect(f.skippedCount).toBe(0);
    expect(opsProps.emptyProfile('another-profile').profile).toBe('another-profile');
    const both = opsProps.emptyProfileSkipped();
    expect(both.status).toBe('empty');
    expect(both.items).toEqual([]);
    expect(both.profile).toBe(OPS_PROFILE);
    expect(both.skippedCount).toBe(3);
    expect(opsProps.emptyProfileSkipped('another-profile').profile).toBe('another-profile');
  });

  it('error: one per refusal fixture, the code from the fixture', () => {
    const codes: string[] = [];
    for (const name of Object.keys(OPS_REFUSAL_FIXTURES) as Array<keyof typeof OPS_REFUSAL_FIXTURES>) {
      const p = opsProps.error(name);
      expect(p.status).toBe('error');
      expect(p.refusalCode).toBe(OPS_REFUSAL_FIXTURES[name].code);
      expect(p.items).toEqual([]);
      codes.push(p.refusalCode ?? '');
    }
    expect(codes).toEqual(['ops_unreadable', 'invalid_page_cursor']);
    expect(opsProps.ready().refusalCode).toBeNull();
  });

  it('mismatchedProfile: a ready page whose rows are of other profiles than the filter', () => {
    const p = opsProps.mismatchedProfile();
    expect(p.status).toBe('ready');
    expect(p.profile).toBe(OPS_PROFILE);
    expect(p.items.length).toBe(2);
    let other = 0;
    for (const item of p.items) {
      if (item.profileId !== OPS_PROFILE) other += 1;
    }
    expect(other).toBe(2);
    expect(opsProps.emptyProfile().profile).toBe(OPS_PROFILE);
  });

  it('every helper builds its own arrays (a story that edits one does not edit the fixture)', () => {
    const a = opsProps.ready();
    a.items.push(a.items[0] as OpsInvocationView);
    expect(opsProps.ready().items.length).toBe(2);
    expect(OPS_PAGE_FIXTURES.opsPageFirst.items.length).toBe(2);
  });
});

describe('row and page helpers', () => {
  it('opsRowProps: a single fixture as a ready page of one row, for every invocation fixture', () => {
    let ran = 0;
    for (const name of Object.keys(OPS_INVOCATION_FIXTURES) as Array<keyof typeof OPS_INVOCATION_FIXTURES>) {
      const p = opsRowProps(name);
      expect(p.status, name).toBe('ready');
      expect(p.items.length, name).toBe(1);
      expect(p.items[0], name).toEqual(OPS_INVOCATION_FIXTURES[name]);
      expect(p.totalCount, name).toBe(1);
      expect(p.pageInfo?.hasNextPage, name).toBe(false);
      ran += 1;
    }
    expect(ran).toBe(29);
  });

  it('opsPageOf: a page fixture as props; an empty page is the empty look, a page with rows the ready look', () => {
    const looks: string[] = [];
    for (const name of Object.keys(OPS_PAGE_FIXTURES) as Array<keyof typeof OPS_PAGE_FIXTURES>) {
      const p = opsPageOf(name);
      expect(p.items).toEqual(OPS_PAGE_FIXTURES[name].items);
      expect(p.totalCount).toBe(OPS_PAGE_FIXTURES[name].totalCount);
      expect(p.skippedCount).toBe(OPS_PAGE_FIXTURES[name].skippedCount);
      looks.push(`${name}:${p.status}`);
    }
    expect(looks).toEqual([
      'opsPageFirst:ready',
      'opsPageLast:ready',
      'opsPageEmpty:empty',
      'opsPageMixed:ready',
      'opsPageEmptySkipped:empty',
    ]);
  });

  it('the overlay fixtures keep the properties the stories name them for', () => {
    expect(OPS_INVOCATION_FIXTURES.opsActorNull.actor).toBeNull();
    expect(OPS_INVOCATION_FIXTURES.opsOpen.actor).not.toBeNull();
    expect(OPS_INVOCATION_FIXTURES.opsEvidence512.evidence?.value.length).toBe(512);
    expect(OPS_INVOCATION_FIXTURES.opsUnknownOutcome.outcome).toBe('paused');
    expect(OPS_INVOCATION_FIXTURES.opsOffsetStart.startedAt.endsWith('+02:00')).toBe(true);
  });
});

describe('deterministic page builders', () => {
  const rows = (count: number, start = 0): OpsInvocationView[] => makeOpsPage(count, true, start).items;

  it('a page of 200 rows: unique ULIDs, handles that fit the patterns, instants, service order', () => {
    const page = opsProps.longPage();
    expect(page.items.length).toBe(200);
    expect(page.status).toBe('ready');
    const ids = new Set<string>();
    let previous = '';
    let ran = 0;
    for (const item of page.items) {
      expect(ULID.test(item.invocationId), item.invocationId).toBe(true);
      expect(HANDLE.test(item.profileId), item.profileId).toBe(true);
      expect(HANDLE.test(item.action), item.action).toBe(true);
      expect(INSTANT.test(item.startedAt), item.startedAt).toBe(true);
      const key = `${item.startedAt}|${item.invocationId}`;
      if (previous !== '') expect(key < previous, `${key} follows ${previous}`).toBe(true);
      previous = key;
      ids.add(item.invocationId);
      ran += 1;
    }
    expect(ran).toBe(200);
    expect(ids.size).toBe(200);
    expect(page.totalCount).toBe(200);
    expect(page.pageInfo?.hasNextPage).toBe(true);
    expect(page.pageInfo?.pageSize).toBe(200);
  });

  it('open Ops have no closure fields; closed Ops have all four; the rows cover both', () => {
    let open = 0;
    let closed = 0;
    for (const item of rows(200)) {
      if (item.status === 'open') {
        expect([item.outcome, item.closedBy, item.completedAt, item.evidence], item.invocationId).toEqual([null, null, null, null]);
        open += 1;
      } else {
        expect(item.outcome, item.invocationId).not.toBeNull();
        expect(item.closedBy, item.invocationId).not.toBeNull();
        expect(item.completedAt, item.invocationId).not.toBeNull();
        closed += 1;
      }
    }
    expect(open + closed).toBe(200);
    expect(open).toBeGreaterThan(0);
    expect(closed).toBeGreaterThan(0);
  });

  it('is deterministic: two builds are equal, and a different start gives different rows (positive control)', () => {
    expect(rows(30)).toEqual(rows(30));
    expect(rows(30, 30)).not.toEqual(rows(30));
    expect(rows(30, 30)[0]?.invocationId).not.toBe(rows(30)[0]?.invocationId);
  });

  it('a last page has no cursor; a page of zero rows is empty', () => {
    const last = makeOpsPage(3, false, 0);
    expect(last.pageInfo.hasNextPage).toBe(false);
    expect(last.pageInfo.nextPageCursor).toBeNull();
    expect(makeOpsPage(3, true, 0).pageInfo.nextPageCursor).not.toBeNull();
    expect(makeOpsPage(0, false, 0).items).toEqual([]);
  });

  it('the 1,000-row accumulator: five pages of 200, unique ids, one strict order across the joins', () => {
    const acc = opsAccumulated();
    expect(acc.items.length).toBe(1000);
    expect(acc.pageInfo?.hasNextPage).toBe(false);
    expect(new Set(acc.items.map((i) => i.invocationId)).size).toBe(1000);
    let ran = 0;
    for (let i = 1; i < acc.items.length; i += 1) {
      const a = acc.items[i - 1] as OpsInvocationView;
      const b = acc.items[i] as OpsInvocationView;
      expect(`${b.startedAt}|${b.invocationId}` < `${a.startedAt}|${a.invocationId}`, `row ${i}`).toBe(true);
      ran += 1;
    }
    expect(ran).toBe(999);
    expect(opsAccumulated(2).items.length).toBe(400);
  });

  it('no builder value is an absolute path, an e-mail address or a credential-shaped string', () => {
    const text = JSON.stringify(rows(200));
    expect(text.length).toBeGreaterThan(20000);
    expect(/(^|[^a-z])\/(home|Users|root|tmp)\//.test(text)).toBe(false);
    expect(/[A-Za-z0-9._-]+@[A-Za-z0-9-]+\.[a-z]{2,}/.test(text)).toBe(false);
    expect(/gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/.test(text)).toBe(false);
  });
});
