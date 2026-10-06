// The state parts on their own (IC-07, T047 and T048): what `renderStatusContent` and `renderDetailNotice` draw for each
// whole-screen state and each regional detail state, without the screen around them. Handlers are plain counters here; the
// events the screen builds from them are proved in the screen-level tests.
import { afterEach, describe, expect, it } from 'vitest';
import '@spec-kitty/tokens';
import '../src/index.js';
import { render } from 'lit';
import { renderDetailNotice, renderStatusContent } from '../src/elements/sk-work-package-screen/state-parts.js';
import type { DetailNoticeView, StatusContentView, StatusHandlers, WholeScreenState } from '../src/elements/sk-work-package-screen/state-parts.js';
import {
  BREADCRUMB_LABEL,
  DETAIL_LOADING_LABEL,
  DETAIL_REFUSAL_HEADING,
  DETAIL_RETRY_LABEL,
  LANE_COUNT_TEXT,
  NOTHING_SELECTED_EYEBROW,
  NOTHING_SELECTED_HEADING,
  NOT_FOUND_BODY,
  NOT_FOUND_HEADING,
  RETURN_TO_PIPELINE_LABEL,
  WP_EMPTY_BODY,
  WP_EMPTY_HEADING,
  WP_ERROR_BODY,
} from '../src/defaults/index.js';

const host = (): HTMLElement => {
  const box = document.createElement('div');
  document.body.append(box);
  return box;
};
afterEach(() => document.body.replaceChildren());

const view = (state: WholeScreenState, over: Partial<StatusContentView> = {}): StatusContentView => ({
  state,
  wpId: 'WP04',
  breadcrumb: { missionLabel: 'Sample mission', wpId: 'WP04', inert: false },
  errorMessage: '',
  mission: { name: 'Sample mission', slug: 'sample-mission-01', workPackageCount: 6 },
  inert: false,
  retryInert: false,
  ...over,
});

interface Calls {
  open: number;
  retry: number;
}
function draw(v: StatusContentView): { box: HTMLElement; calls: Calls } {
  const calls: Calls = { open: 0, retry: 0 };
  const handlers: StatusHandlers = { onOpenMission: () => (calls.open += 1), onRetry: () => (calls.retry += 1) };
  const box = host();
  render(renderStatusContent(v, handlers), box);
  return { box, calls };
}
const text = (el: Element): string => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const buttons = (box: Element): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('sk-button')];
const buttonNamed = (box: Element, name: string): HTMLElement => {
  const found = buttons(box).find((b) => text(b) === name);
  if (found === undefined) throw new Error(`no button ${name}`);
  return found;
};
const regions = (box: Element): string[] => [...box.querySelectorAll('[data-region]')].map((el) => el.getAttribute('data-region') ?? '');

describe('loading', () => {
  it('draws the data-less header band (crumb and an h1 with the id), a labelled busy indicator and nothing else', () => {
    const { box } = draw(view('loading'));
    expect(regions(box)).toEqual(['header']);
    const header = box.querySelector('[data-region="header"]') as HTMLElement;
    expect(header.querySelectorAll('sk-page-header')).toHaveLength(1);
    expect(header.querySelectorAll('nav[aria-label]')).toHaveLength(1);
    expect(header.querySelector('nav')?.getAttribute('aria-label')).toBe(BREADCRUMB_LABEL);
    const h1s = box.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0] as Element)).toBe('WP04');
    expect(box.querySelectorAll('sk-card')).toHaveLength(0);
    const busy = box.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    const bar = box.querySelector<HTMLProgressElement>('progress.sk-progress__bar');
    expect(bar).not.toBeNull();
    expect(bar?.hasAttribute('value')).toBe(false);
    const label = box.querySelector<HTMLLabelElement>('label.sk-progress__label');
    expect(label?.htmlFor).toBe(bar?.id);
    expect(bar?.id).not.toBe('');
  });

  it('carries no live role of its own: the one live region belongs to the screen', () => {
    const { box } = draw(view('loading'));
    expect(box.querySelectorAll('[role="status"],[role="alert"],[aria-live]')).toHaveLength(0);
  });

  it('an empty id gives "Choose a Work Package" as the h1, a given id gives the id (paired)', () => {
    const none = draw(view('loading', { wpId: '', breadcrumb: { missionLabel: 'Sample mission', wpId: '', inert: false } })).box;
    expect(text(none.querySelector('h1') as Element)).toBe(NOTHING_SELECTED_HEADING);
    const given = draw(view('loading', { wpId: 'WP07' })).box;
    expect(text(given.querySelector('h1') as Element)).toBe('WP07');
  });

  it('draws the crumb with the given inert flag: a Mission-bound crumb activates, an inert one does not', () => {
    const live = draw(view('loading'));
    buttonNamed(live.box, 'Sample mission').click();
    expect(live.calls.open).toBe(1);
    const inert = draw(view('loading', { inert: true, breadcrumb: { missionLabel: 'Mission', wpId: 'WP04', inert: true } }));
    const crumb = buttonNamed(inert.box, 'Mission');
    expect(crumb.hasAttribute('disabled')).toBe(true);
    crumb.click();
    expect(inert.calls.open).toBe(0);
  });
});

describe('error', () => {
  it('is one assertive danger notice with the default body, a Retry control and no header, no h1, no panel', () => {
    const { box } = draw(view('error'));
    const notices = box.querySelectorAll('sk-notice');
    expect(notices).toHaveLength(1);
    expect((notices[0] as Element).getAttribute('announce')).toBe('assertive');
    expect((notices[0] as Element).getAttribute('tone')).toBe('danger');
    expect(text(notices[0] as Element)).toContain(WP_ERROR_BODY);
    expect(regions(box)).toEqual([]);
    expect(box.querySelectorAll('h1')).toHaveLength(0);
    expect(buttons(box)).toHaveLength(1);
  });

  it('the host text replaces the default body; an empty text uses the default (paired)', () => {
    const given = draw(view('error', { errorMessage: 'The host said no.' })).box;
    expect(text(given.querySelector('sk-notice') as Element)).toContain('The host said no.');
    expect(text(given.querySelector('sk-notice') as Element)).not.toContain(WP_ERROR_BODY);
    expect(text(draw(view('error', { errorMessage: '' })).box)).toContain(WP_ERROR_BODY);
  });

  it('a very long unbroken-by-space message is kept whole (it wraps between words in CSS, never truncated)', () => {
    const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ');
    expect(text(draw(view('error', { errorMessage: long })).box.querySelector('sk-notice') as Element)).toContain(long);
  });

  it('Retry calls the handler once; an inert Retry is disabled and calls nothing (with the live sibling as control)', () => {
    const live = draw(view('error'));
    const retry = buttons(live.box)[0] as HTMLElement;
    expect(retry.hasAttribute('disabled')).toBe(false);
    retry.click();
    expect(live.calls).toEqual({ open: 0, retry: 1 });
    const inert = draw(view('error', { retryInert: true }));
    const dead = buttons(inert.box)[0] as HTMLElement;
    expect(dead.hasAttribute('disabled')).toBe(true);
    dead.click();
    expect(inert.calls).toEqual({ open: 0, retry: 0 });
  });
});

describe('empty', () => {
  it('is the shared empty form: body first, heading second, no header, no h1, no control', () => {
    const { box } = draw(view('empty'));
    const form = box.querySelector('.sk-empty-state') as HTMLElement;
    expect(form).not.toBeNull();
    expect(text(form.querySelector('.sk-empty-state__body') as Element)).toBe(WP_EMPTY_BODY);
    expect(text(form.querySelector('.sk-empty-state__heading') as Element)).toBe(WP_EMPTY_HEADING);
    expect(regions(box)).toEqual([]);
    expect(box.querySelectorAll('h1')).toHaveLength(0);
    expect(buttons(box)).toHaveLength(0);
  });
});

describe('not-found', () => {
  it('draws the data-less header (crumb and the id only, no title, no badge), the panel and one Return control', () => {
    const { box } = draw(view('not-found', { wpId: 'WP09', breadcrumb: { missionLabel: 'Sample mission', wpId: 'WP09', inert: false } }));
    expect(regions(box)).toEqual(['header']);
    expect(text(box.querySelector('h1') as Element)).toBe('WP09');
    expect(box.querySelectorAll('h1')).toHaveLength(1);
    expect(box.querySelectorAll('sk-badge,sk-pill-tag,sk-status-indicator')).toHaveLength(0);
    const form = box.querySelector('.sk-empty-state') as HTMLElement;
    expect(text(form.querySelector('.sk-empty-state__heading') as Element)).toBe(NOT_FOUND_HEADING);
    expect(text(form.querySelector('.sk-empty-state__body') as Element)).toBe(NOT_FOUND_BODY);
    expect(box.querySelectorAll('sk-card')).toHaveLength(0);
    // the crumb button and the Return button are the two controls
    expect(buttons(box).map(text)).toEqual(['Sample mission', RETURN_TO_PIPELINE_LABEL]);
  });

  it('Return calls onOpenMission once and never onRetry; an inert Return is disabled (paired)', () => {
    const live = draw(view('not-found'));
    buttonNamed(live.box, RETURN_TO_PIPELINE_LABEL).click();
    expect(live.calls).toEqual({ open: 1, retry: 0 });
    const inert = draw(view('not-found', { inert: true, breadcrumb: { missionLabel: 'Mission', wpId: 'WP04', inert: true } }));
    const dead = buttonNamed(inert.box, RETURN_TO_PIPELINE_LABEL);
    expect(dead.hasAttribute('disabled')).toBe(true);
    dead.click();
    expect(inert.calls).toEqual({ open: 0, retry: 0 });
  });
});

describe('nothing-selected', () => {
  it('draws the eyebrow, the h1, the slug and the count as given, and no region id', () => {
    const { box } = draw(view('nothing-selected'));
    expect(regions(box)).toEqual([]);
    expect(text(box.querySelector('h1') as Element)).toBe(NOTHING_SELECTED_HEADING);
    const all = text(box);
    expect(all).toContain(NOTHING_SELECTED_EYEBROW);
    expect(all).toContain('sample-mission-01');
    expect(all).toContain(LANE_COUNT_TEXT(6));
    expect(buttons(box)).toHaveLength(0);
  });

  it('the count is as given: one reads "1 Work Package", zero reads "0 Work Packages"', () => {
    const one = draw(view('nothing-selected', { mission: { name: 'M', slug: 's', workPackageCount: 1 } })).box;
    expect(text(one)).toContain('1 Work Package');
    expect(text(one)).not.toContain('1 Work Packages');
    expect(text(draw(view('nothing-selected', { mission: { name: 'M', slug: 's', workPackageCount: 0 } })).box)).toContain('0 Work Packages');
  });

  it('with no Mission it draws the heading with no slug, no count and no "undefined" or "null"', () => {
    const { box } = draw(view('nothing-selected', { mission: null }));
    expect(text(box.querySelector('h1') as Element)).toBe(NOTHING_SELECTED_HEADING);
    expect(text(box)).not.toContain('undefined');
    expect(text(box)).not.toContain('null');
    expect(text(box)).not.toMatch(/\d/);
  });
});

describe('every whole-screen state draws the h1 the contract names', () => {
  it('loading, not-found and nothing-selected draw exactly one; error and empty none', () => {
    const expected: [WholeScreenState, number][] = [
      ['loading', 1],
      ['not-found', 1],
      ['nothing-selected', 1],
      ['error', 0],
      ['empty', 0],
    ];
    let ran = 0;
    for (const [state, count] of expected) {
      expect(draw(view(state)).box.querySelectorAll('h1'), state).toHaveLength(count);
      ran += 1;
    }
    expect(ran).toBe(5);
  });
});

describe('the regional detail notice', () => {
  const noticeView = (over: Partial<DetailNoticeView> = {}): DetailNoticeView => ({ kind: 'error', refusalText: 'The source could not be read.', retryInert: false, ...over });
  const drawNotice = (v: DetailNoticeView): { box: HTMLElement; retries: number[] } => {
    const retries: number[] = [];
    const box = host();
    render(renderDetailNotice(v, () => retries.push(1)), box);
    return { box, retries };
  };

  it('loading: a labelled busy indicator, no notice, no control, no live role', () => {
    const { box } = drawNotice(noticeView({ kind: 'loading', refusalText: '' }));
    expect(text(box)).toContain(DETAIL_LOADING_LABEL);
    expect(box.querySelectorAll('progress')).toHaveLength(1);
    expect(box.querySelector('label')?.htmlFor).toBe(box.querySelector('progress')?.id);
    expect(box.querySelectorAll('sk-notice')).toHaveLength(0);
    expect(buttons(box)).toHaveLength(0);
    expect(box.querySelectorAll('[role],[aria-live]')).toHaveLength(0);
    expect(box.querySelectorAll('[data-region]')).toHaveLength(0);
  });

  it('error and not-found: one notice headed by the refusal heading, naming the refusal, with no live role and one Retry', () => {
    let ran = 0;
    for (const kind of ['error', 'not-found'] as const) {
      const { box, retries } = drawNotice(noticeView({ kind, refusalText: 'Words for the refusal.' }));
      const notices = box.querySelectorAll('sk-notice');
      expect(notices, kind).toHaveLength(1);
      expect((notices[0] as Element).getAttribute('announce'), kind).toBe('off');
      expect(text(box.querySelector('[slot="heading"]') as Element), kind).toBe(DETAIL_REFUSAL_HEADING);
      expect(text(notices[0] as Element), kind).toContain('Words for the refusal.');
      expect(box.querySelectorAll('[role="alert"],[role="status"],[aria-live]'), kind).toHaveLength(0);
      expect(box.querySelectorAll('[data-region]'), kind).toHaveLength(0);
      expect(buttons(box).map(text), kind).toEqual([DETAIL_RETRY_LABEL]);
      (buttons(box)[0] as HTMLElement).click();
      expect(retries, kind).toHaveLength(1);
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('an inert Retry is disabled and calls nothing', () => {
    const { box, retries } = drawNotice(noticeView({ retryInert: true }));
    const retry = buttons(box)[0] as HTMLElement;
    expect(retry.hasAttribute('disabled')).toBe(true);
    retry.click();
    expect(retries).toHaveLength(0);
  });

  it('shows the words the screen resolved, raw text included, never "undefined"', () => {
    const { box } = drawNotice(noticeView({ refusalText: 'a_code_nobody_planned' }));
    expect(text(box)).toContain('a_code_nobody_planned');
    expect(text(box)).not.toContain('undefined');
  });
});
