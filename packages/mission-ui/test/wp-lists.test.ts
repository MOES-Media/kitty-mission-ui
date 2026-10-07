import { describe, expect, it } from 'vitest';
import type { WorkPackageDetailView, WorkPackageRecordView } from '../src/contract/types.js';
import { detailPopulated, wpPopulated, wpUnknownLane, detailUnknownChangeState, detailUnknownLanes, wpBulkHistory } from '../src/contract/fixtures.generated.js';
import { resolveLists } from '../src/logic/wp-lists.js';

const wp = wpPopulated as WorkPackageRecordView;
const detail = detailPopulated as WorkPackageDetailView;

describe('resolveLists', () => {
  it('uses the detail lists, source detail, when the detail matches', () => {
    const r = resolveLists(wp, detail);
    expect(r.source).toBe('detail');
    expect(r.detail).toBe(detail);
    expect(r.subtasks).toEqual(detail.subtasks.map((s) => ({ id: s.id, title: s.title, lane: s.statusLane })));
    expect(r.dependencies).toEqual(detail.dependencies.map((d) => ({ wpId: d.wpId, title: d.title, lane: d.statusLane })));
    expect(r.ownedFiles).toEqual(detail.ownedFiles.map((f) => ({ pattern: f.pattern, isGlob: f.isGlob, changeState: f.changeState })));
    expect(r.subtasks.length).toBe(3);
    expect(r.ownedFiles.length).toBe(3);
  });

  it('degrades to the bare 1.0 forms from the Work Package when the detail is null', () => {
    const r = resolveLists(wp, null);
    expect(r.source).toBe('bare');
    expect(r.detail).toBeNull();
    expect(r.subtasks).toEqual(Object.entries(wp.subtasks).map(([id, lane]) => ({ id, title: null, lane })));
    expect(r.dependencies).toEqual(wp.dependencies.map((id) => ({ wpId: id, title: null, lane: null })));
    expect(r.ownedFiles).toEqual(wp.ownedFiles.map((pattern) => ({ pattern, isGlob: false, changeState: null })));
    expect(r.subtasks.length).toBe(Object.keys(wp.subtasks).length);
    expect(r.subtasks.length).toBeGreaterThan(0);
  });

  it('never mixes the payloads: when both are present and differ, the detail wins and no bare entry leaks in', () => {
    const different: WorkPackageRecordView = { ...wp, subtasks: { X1: 'planned' }, dependencies: ['WP99'], ownedFiles: ['bare-only.py'] };
    const r = resolveLists(different, detail);
    expect(r.source).toBe('detail');
    expect(r.subtasks.map((s) => s.id)).toEqual(['T017', 'T018', 'T019']);
    expect(r.dependencies.map((d) => d.wpId)).toEqual(['WP03']);
    expect(r.ownedFiles.map((f) => f.pattern)).not.toContain('bare-only.py');
  });

  it('treats a detail for another Work Package as omitted and returns detail null', () => {
    const other = { ...detail, wpId: 'WP77' } as WorkPackageDetailView;
    const r = resolveLists(wp, other);
    expect(r.source).toBe('bare');
    expect(r.detail).toBeNull();
    expect(r.subtasks.every((s) => s.title === null)).toBe(true);
  });

  it('keeps every list in input order: no sort, filter or count', () => {
    const shuffled = {
      ...detail,
      subtasks: [detail.subtasks[2], detail.subtasks[0], detail.subtasks[1]],
      ownedFiles: [detail.ownedFiles[2], detail.ownedFiles[0], detail.ownedFiles[1]],
    } as WorkPackageDetailView;
    const r = resolveLists(wp, shuffled);
    expect(r.subtasks.map((s) => s.id)).toEqual(['T019', 'T017', 'T018']);
    expect(r.ownedFiles.map((f) => f.pattern)).toEqual([detail.ownedFiles[2]?.pattern, detail.ownedFiles[0]?.pattern, detail.ownedFiles[1]?.pattern]);
    const bare = resolveLists({ ...wp, dependencies: ['WP09', 'WP02', 'WP05'], ownedFiles: ['z', 'a', 'm'], subtasks: { T9: 'planned', T1: 'planned' } }, null);
    expect(bare.dependencies.map((d) => d.wpId)).toEqual(['WP09', 'WP02', 'WP05']);
    expect(bare.ownedFiles.map((f) => f.pattern)).toEqual(['z', 'a', 'm']);
    expect(bare.subtasks.map((s) => s.id)).toEqual(['T9', 'T1']);
  });

  it('passes foreign lanes and change states through untouched (raw text survives)', () => {
    const r = resolveLists(wpUnknownLane as WorkPackageRecordView, null);
    expect(Object.values(wpUnknownLane.subtasks)).toContain('on_hold');
    expect(r.subtasks.map((s) => s.lane)).toContain('on_hold');
    const d = resolveLists(wp, { ...detailUnknownLanes, wpId: wp.wpId } as WorkPackageDetailView);
    expect(d.dependencies.length + d.subtasks.length).toBeGreaterThan(0);
    const states = resolveLists({ ...wp, wpId: detailUnknownChangeState.wpId } as WorkPackageRecordView, detailUnknownChangeState as WorkPackageDetailView);
    expect(states.ownedFiles.map((f) => f.changeState)).toEqual(['unknown', 'unknown', 'unknown']);
  });

  it('handles empty bare lists and a large Work Package without truncation', () => {
    const empty = resolveLists({ ...wp, subtasks: {}, dependencies: [], ownedFiles: [] }, null);
    expect(empty.subtasks).toEqual([]);
    expect(empty.dependencies).toEqual([]);
    expect(empty.ownedFiles).toEqual([]);
    expect(resolveLists(wpBulkHistory as WorkPackageRecordView, null).subtasks.length).toBe(Object.keys(wpBulkHistory.subtasks).length);
  });
});
