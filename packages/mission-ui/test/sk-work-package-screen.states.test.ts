// The states of the Work Package screen (IC-07, T050): the region sets of SC-004, the detail input rule, the empty line, the
// refusal words, the payload rule branch by branch, the focus order of the retry and return states and the focus
// restoration of the whole-screen retry. The Retry of a refused detail and the dependency nodes belong to the integration
// work package, because the h1 they restore focus to is drawn by the header work package.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import {
  DETAIL_FIXTURES,
  REFUSAL_FIXTURES,
  WORK_PACKAGE_FIXTURES,
  pairDetail,
  pairingProps,
  refusalProps,
  sampleMission,
  stateProps,
  workPackageFrame,
} from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import {
  DETAIL_REFUSAL_GENERIC,
  DETAIL_REFUSAL_HEADING,
  DETAIL_REFUSAL_WORDS,
  DETAIL_RETRY_LABEL,
  NOTHING_SELECTED_HEADING,
  RETURN_TO_PIPELINE_LABEL,
  WP_EMPTY_BODY,
  WP_EMPTY_HEADING,
  announceLoading,
} from '../src/defaults/index.js';

const EVENT_NAMES = ['sk-select-work-package', 'sk-open-mission', 'sk-open-artifact', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkWorkPackageScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}
async function mount(props: Partial<WpScreenProps> = {}): Promise<SkWorkPackageScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-01'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}
function root(el: Element): ShadowRoot {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
}
const regionIds = (screen: SkWorkPackageScreen): string[] => [...root(screen).querySelectorAll('[data-region]')].map((el) => el.getAttribute('data-region') ?? '');
const text = (el: Element | ShadowRoot): string => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const buttons = (screen: SkWorkPackageScreen): HTMLElement[] => [...root(screen).querySelectorAll<HTMLElement>('sk-button')];
const buttonNamed = (screen: SkWorkPackageScreen, name: string): HTMLElement => {
  const found = buttons(screen).find((b) => text(b) === name);
  if (found === undefined) throw new Error(`no button ${name}`);
  return found;
};
function listenAll(screen: SkWorkPackageScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.parentElement?.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}

const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
const READY = ['header', 'facts', 'assignment', 'frontmatter', 'owned-files', 'history', 'review-summary', 'review-cycles', 'evidence-chain', 'dependency-chain', 'subtasks', 'workspace', 'artifact-links'];
const DETAIL_ONLY = ['review-cycles', 'workspace', 'artifact-links'];

describe('SC-004: the region sets', () => {
  it('ready with the detail draws exactly the 13 ids (the positive control and the anti-vacuity floor)', async () => {
    const ids = regionIds(await mount());
    expect(ids).toHaveLength(13);
    expect([...ids].sort()).toEqual([...READY].sort());
  });

  it('a pending or refused detail leaves the 1.0 regions and replaces exactly the detail-only ones with one notice', async () => {
    const expected = [...READY.filter((id) => !DETAIL_ONLY.includes(id)), 'detail-notice'].sort();
    expect(expected).toHaveLength(11);
    let ran = 0;
    for (const detailStatus of ['loading', 'error', 'not-found'] as const) {
      const ids = regionIds(await mount({ detailStatus }));
      expect([...ids].sort(), detailStatus).toEqual(expected);
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('ready with the detail omitted draws the 1.0 regions only and no notice', async () => {
    const ids = regionIds(await mount({ detail: null }));
    expect([...ids].sort()).toEqual(READY.filter((id) => !DETAIL_ONLY.includes(id)).sort());
    expect(ids).toHaveLength(10);
    expect(ids).not.toContain('detail-notice');
  });

  it('the whole-screen states draw the header band only (loading, not-found) or no id at all', async () => {
    const cases: [WpScreenProps, string[]][] = [
      [stateProps.loading(), ['header']],
      [stateProps.notFound(), ['header']],
      [stateProps.error(), []],
      [stateProps.empty(), []],
      [stateProps.nothingSelected(), []],
    ];
    let ran = 0;
    for (const [props, expected] of cases) {
      const screen = await mount(props);
      expect(regionIds(screen), props.status).toEqual(expected);
      expect(root(screen).querySelectorAll('sk-card'), props.status).toHaveLength(0);
      ran += 1;
    }
    expect(ran).toBe(5);
  });
});

describe('the detail input rule: a populated detail under a pending or refused status never shows its forms', () => {
  // A Work Package whose bare lists carry ids only, paired with a detail whose entries have titles and change states.
  const detail = pairDetail(wp, DETAIL_FIXTURES.detailPopulated, { cycles: 'none' });
  const subtaskTitle = detail.subtasks[0]?.title ?? '';
  const dependencyTitle = detail.dependencies[0]?.title ?? '';
  const stateBadges = (screen: SkWorkPackageScreen): number => root(screen).querySelectorAll('[data-region="owned-files"] sk-pill-tag[slot="marker"]').length;

  it('ready with the detail shows the titles and the change-state badges (positive control)', async () => {
    const screen = await mount({ detail });
    expect(subtaskTitle).not.toBe('');
    expect(dependencyTitle).not.toBe('');
    expect(text(root(screen))).toContain(subtaskTitle);
    expect(text(root(screen))).toContain(dependencyTitle);
    expect(stateBadges(screen)).toBeGreaterThan(0);
  });

  it('loading, error and not-found with the detail still passed show the bare lists: ids only, no title, no badge, no detail-only region', async () => {
    let ran = 0;
    for (const detailStatus of ['loading', 'error', 'not-found'] as const) {
      const screen = await mount({ detail, detailStatus });
      const all = text(root(screen));
      expect(all, detailStatus).not.toContain(subtaskTitle);
      expect(all, detailStatus).not.toContain(dependencyTitle);
      expect(stateBadges(screen), detailStatus).toBe(0);
      expect(all, detailStatus).toContain(Object.keys(wp.subtasks)[0] ?? '?');
      expect(all, detailStatus).toContain(wp.dependencies[0] ?? '?');
      expect(all, detailStatus).toContain(wp.ownedFiles[0] ?? '?');
      for (const id of DETAIL_ONLY) expect(regionIds(screen), `${detailStatus} ${id}`).not.toContain(id);
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('a null detail with detailStatus ready draws the bare lists, no detail-only region, no notice and no "none" claim', async () => {
    const screen = await mount({ detail: null });
    const ids = regionIds(screen);
    expect(ids).not.toContain('detail-notice');
    for (const id of DETAIL_ONLY) expect(ids, id).not.toContain(id);
    expect(text(root(screen))).not.toContain(subtaskTitle);
    expect(text(root(screen))).toContain(wp.dependencies[0] ?? '?');
    expect(text(root(screen))).not.toContain(DETAIL_REFUSAL_HEADING);
  });
});

describe('the empty line and the whole-screen copy', () => {
  it('WP-40 draws the frame and the neutral empty copy, no header and no h1', async () => {
    const screen = await mount(stateProps.empty());
    expect(text(root(screen).querySelector('.sk-empty-state__body') as Element)).toBe(WP_EMPTY_BODY);
    expect(text(root(screen).querySelector('.sk-empty-state__heading') as Element)).toBe(WP_EMPTY_HEADING);
    expect(root(screen).querySelectorAll('h1')).toHaveLength(0);
    // ready with no Work Package is the same state
    const readyNull = await mount({ status: 'ready', workPackage: null, detail: null });
    expect(text(root(readyNull).querySelector('.sk-empty-state__body') as Element)).toBe(WP_EMPTY_BODY);
  });

  it('WP-43 is the screen as shell content with nothing selected: the heading, the slug and the count', async () => {
    const screen = await mount(stateProps.nothingSelected());
    expect(text(root(screen).querySelector('h1') as Element)).toBe(NOTHING_SELECTED_HEADING);
    expect(text(root(screen))).toContain(sampleMission.slug);
    expect(text(root(screen))).toContain('6 Work Packages');
  });
});

describe('the refusal in words', () => {
  const noticeText = (screen: SkWorkPackageScreen): string => text(root(screen).querySelector('[data-region="detail-notice"]') as Element);

  it('names each refusal fixture in its words', async () => {
    let ran = 0;
    for (const name of Object.keys(REFUSAL_FIXTURES) as (keyof typeof REFUSAL_FIXTURES)[]) {
      const code = REFUSAL_FIXTURES[name].code;
      const screen = await mount(refusalProps(name));
      const words = DETAIL_REFUSAL_WORDS[code];
      expect(words, code).toBeDefined();
      expect(noticeText(screen)).toContain(words ?? '?');
      expect(noticeText(screen)).toContain(DETAIL_REFUSAL_HEADING);
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('a foreign code shows its raw text and a null code the generic wording, never "undefined"', async () => {
    const foreign = await mount({ detailStatus: 'error', detailRefusalCode: 'a_code_nobody_planned' });
    expect(noticeText(foreign)).toContain('a_code_nobody_planned');
    expect(noticeText(foreign)).not.toContain('undefined');
    expect(noticeText(foreign)).not.toContain(DETAIL_REFUSAL_GENERIC);
    const none = await mount({ detailStatus: 'error', detailRefusalCode: null });
    expect(noticeText(none)).toContain(DETAIL_REFUSAL_GENERIC);
    expect(noticeText(none)).not.toContain('undefined');
    expect(noticeText(none)).not.toContain('null');
  });

  it('the notice carries no live role of its own: the screen has exactly one status region and no alert for a refused detail', async () => {
    const screen = await mount({ detailStatus: 'error', detailRefusalCode: null });
    expect(root(screen).querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(root(screen).querySelectorAll('[role="alert"]')).toHaveLength(0);
    expect(root(screen).querySelector('[data-region="detail-notice"] sk-notice')?.getAttribute('announce')).toBe('off');
  });

  it('the busy indicators draw no status role either (loading whole-screen and regional)', async () => {
    const whole = await mount(stateProps.loading());
    expect(root(whole).querySelectorAll('[role="status"]')).toHaveLength(1);
    const regional = await mount({ detailStatus: 'loading' });
    expect(root(regional).querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(regionIds(regional)).toContain('detail-notice');
    expect(root(regional).querySelectorAll('[data-region="detail-notice"] progress')).toHaveLength(1);
  });
});

describe('the payload rule through the retry and return controls, one test per branch', () => {
  const retryOnce = async (props: Partial<WpScreenProps>): Promise<CustomEvent[]> => {
    const screen = await mount({ status: 'error', workPackage: null, detail: null, wpId: '', ...props });
    const events = listenAll(screen);
    buttons(screen)[0]?.click();
    return events;
  };
  const expectRetry = (events: CustomEvent[], wpId: string, target: string): void => {
    expect(events).toHaveLength(1);
    expect((events[0] as CustomEvent).detail).toEqual({ missionId: sampleMission.missionId, wpId, target });
  };

  it('the wpId property wins', async () => {
    expectRetry(await retryOnce({ wpId: 'WP11', workPackage: wp, detail: { ...pairDetail(wp, DETAIL_FIXTURES.detailPopulated), wpId: wp.wpId } }), 'WP11', 'work-package');
  });
  it('the Work Package id is used when the property is empty', async () => {
    expectRetry(await retryOnce({ workPackage: wp }), wp.wpId, 'work-package');
  });
  it('the detail id is the last resort', async () => {
    expectRetry(await retryOnce({ detail: { ...pairDetail(wp, DETAIL_FIXTURES.detailPopulated), wpId: 'WP08' } }), 'WP08', 'work-package');
  });
  it('a detail for another Work Package counts as omitted: bare lists, no notice when ready, and the notice retry uses the Work Package id', async () => {
    const mismatched = { ...pairDetail(wp, DETAIL_FIXTURES.detailPopulated), wpId: 'WP99' };
    const ready = await mount({ detail: mismatched });
    expect(regionIds(ready)).not.toContain('detail-notice');
    for (const id of DETAIL_ONLY) expect(regionIds(ready), id).not.toContain(id);
    expect(text(root(ready))).not.toContain(DETAIL_FIXTURES.detailPopulated.subtasks[0]?.title ?? '');
    const refused = await mount({ detail: mismatched, detailStatus: 'error', wpId: '' });
    const events = listenAll(refused);
    buttonNamed(refused, DETAIL_RETRY_LABEL).click();
    expectRetry(events, wp.wpId, 'detail');
  });
  it('the retry of a refused detail emits target detail for each refusal status (error and not-found)', async () => {
    let ran = 0;
    for (const name of Object.keys(REFUSAL_FIXTURES) as (keyof typeof REFUSAL_FIXTURES)[]) {
      const screen = await mount(refusalProps(name));
      const events = listenAll(screen);
      buttonNamed(screen, DETAIL_RETRY_LABEL).click();
      expectRetry(events, wp.wpId, 'detail');
      ran += 1;
    }
    expect(ran).toBe(2);
  });
  it('with no Mission the crumb, Retry and Return are drawn inert and emit nothing; with a Mission each emits once', async () => {
    const cases: [WpScreenProps, string[]][] = [
      [{ ...stateProps.error(), wpId: 'WP04' }, [DETAIL_RETRY_LABEL]],
      [stateProps.notFound(), [RETURN_TO_PIPELINE_LABEL, 'Mission']],
      [{ ...refusalProps('detailRefusalNotFound') }, [DETAIL_RETRY_LABEL]],
    ];
    let ran = 0;
    for (const [props, names] of cases) {
      const inert = await mount({ ...props, mission: null });
      const none = listenAll(inert);
      for (const name of names) {
        const control = buttonNamed(inert, name);
        expect(control.hasAttribute('disabled'), `${props.status} ${name}`).toBe(true);
        control.click();
      }
      expect(none, props.status).toHaveLength(0);
      const live = await mount(props);
      const heard = listenAll(live);
      for (const name of names.filter((n) => n !== 'Mission')) buttonNamed(live, name).click();
      expect(heard, props.status).toHaveLength(names.filter((n) => n !== 'Mission').length);
      ran += 1;
    }
    expect(ran).toBe(3);
  });
});

describe('the focus order of the retry and return states', () => {
  // The library button delegates focus to its native button: the ring is that button's `:focus-visible`.
  const ringed = (control: HTMLElement): boolean => control.shadowRoot?.querySelector('button')?.matches(':focus-visible') === true;
  const focusRoot = (screen: SkWorkPackageScreen): void => (root(screen).querySelector('[data-root]') as HTMLElement).focus();

  it('error: Tab reaches Retry, the one control, with a visible focus ring', async () => {
    const screen = await mount({ ...stateProps.error(), wpId: 'WP04' });
    focusRoot(screen);
    await userEvent.tab();
    const retry = buttons(screen)[0] as HTMLElement;
    expect(buttons(screen)).toHaveLength(1);
    expect(root(screen).activeElement).toBe(retry);
    expect(ringed(retry)).toBe(true);
  });

  it('not-found: Tab reaches the Mission crumb, then Return to Pipeline, in that order', async () => {
    const screen = await mount(stateProps.notFound());
    focusRoot(screen);
    await userEvent.tab();
    expect(root(screen).activeElement).toBe(buttonNamed(screen, sampleMission.friendlyName));
    await userEvent.tab();
    const back = buttonNamed(screen, RETURN_TO_PIPELINE_LABEL);
    expect(root(screen).activeElement).toBe(back);
    expect(ringed(back)).toBe(true);
    expect(buttons(screen)).toHaveLength(2);
  });

  it('an inert control is no tab stop: with no Mission Tab leaves the screen without stopping on any control', async () => {
    const screen = await mount({ ...stateProps.notFound(), mission: null });
    focusRoot(screen);
    await userEvent.tab();
    expect(root(screen).activeElement).toBeNull();
    // positive control: with a Mission the same Tab lands on a control inside the screen
    const live = await mount(stateProps.notFound());
    focusRoot(live);
    await userEvent.tab();
    expect(root(live).activeElement).not.toBeNull();
  });
});

describe('focus restoration for the whole-screen retry', () => {
  it('error to loading: the detached Retry gives focus to the h1 of the loading header', async () => {
    const screen = await mount({ ...stateProps.error(), wpId: 'WP04' });
    const retry = buttons(screen)[0] as HTMLElement;
    retry.focus();
    expect(root(screen).activeElement).toBe(retry);
    screen.status = 'loading';
    await settle(screen);
    expect(retry.isConnected).toBe(false);
    const h1 = root(screen).querySelector('h1') as HTMLElement;
    expect(h1).not.toBeNull();
    expect(root(screen).activeElement).toBe(h1);
    expect(h1.getAttribute('tabindex')).toBe('-1');
  });

  it('the loading header draws an h1 that can take focus (the target is sound; only the timing of the move mattered)', async () => {
    const screen = await mount({ ...stateProps.loading() });
    const h1 = root(screen).querySelector('h1') as HTMLElement;
    h1.tabIndex = -1;
    h1.focus();
    expect(root(screen).activeElement).toBe(h1);
  });

  it('negative control: when the focused Retry survives the update (no status change), focus stays on it', async () => {
    const screen = await mount({ ...stateProps.error(), wpId: 'WP04' });
    const retry = buttons(screen)[0] as HTMLElement;
    retry.focus();
    screen.errorMessage = 'A new message';
    await settle(screen);
    expect(retry.isConnected).toBe(true);
    expect(root(screen).activeElement).toBe(retry);
  });

  it('a change into error or empty draws no h1, so focus falls back to the root', async () => {
    let ran = 0;
    for (const status of ['error', 'empty'] as const) {
      const screen = await mount();
      const inner = document.createElement('button');
      inner.textContent = 'inside';
      root(screen).querySelector('[data-region="facts"]')?.append(inner);
      inner.focus();
      expect(root(screen).activeElement).toBe(inner);
      screen.status = status;
      await settle(screen);
      expect(inner.isConnected, status).toBe(false);
      expect(root(screen).querySelectorAll('h1'), status).toHaveLength(0);
      expect(root(screen).activeElement, status).toBe(root(screen).querySelector('[data-root]'));
      ran += 1;
    }
    expect(ran).toBe(2);
  });
});

describe('the announcement sequence moves one step per announced transition', () => {
  const seqOf = (screen: SkWorkPackageScreen): number => Number(root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq') ?? '-1');

  it('ready to loading and back advances the sequence by one each; into error it does not move', async () => {
    const screen = await mount();
    screen.status = 'loading';
    await settle(screen);
    const first = seqOf(screen);
    expect(text(root(screen).querySelector('[data-live]') as Element)).toBe(announceLoading('WP04'));
    screen.status = 'ready';
    await settle(screen);
    expect(seqOf(screen)).toBe(first + 1);
    screen.status = 'error';
    await settle(screen);
    expect(seqOf(screen)).toBe(first + 1);
  });
});
