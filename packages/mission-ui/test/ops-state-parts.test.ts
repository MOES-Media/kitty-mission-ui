// The Ops state parts (WP07, IC-06): the loading, empty and error looks drawn on their own from a view-model. The part holds
// no copy and dispatches nothing: the retry handler arrives as an argument. The screen-level behaviour is in
// sk-ops-screen.states.test.ts.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'lit';
import type { TemplateResult } from 'lit';
import '@spec-kitty/tokens';
import '../src/index.js';
import { renderOpsEmpty, renderOpsError, renderOpsLoading } from '../src/elements/sk-ops-screen/ops-state-parts.js';
import type { OpsEmptyView, OpsErrorView, OpsLoadingView } from '../src/elements/sk-ops-screen/ops-state-parts.js';

afterEach(() => {
  document.body.replaceChildren();
});

const LOADING: OpsLoadingView = { label: 'Loading label', body: 'Loading sentence' };
const EMPTY: OpsEmptyView = { heading: 'Empty heading', body: 'Empty sentence' };
const ERROR: OpsErrorView = { heading: 'Error heading', body: 'Error sentence', refusalCode: 'code-1', retryLabel: 'Retry label' };

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.append(el);
  return el;
}
const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('the loading look', () => {
  it('draws the labelled indeterminate progress, the sentence and a focusable heading, busy', async () => {
    await page.viewport(1280, 900);
    const el = host();
    render(renderOpsLoading(LOADING), el);
    const region = el.querySelector('[aria-busy]');
    expect(region?.getAttribute('aria-busy')).toBe('true');
    const bar = el.querySelector('progress');
    expect(bar).not.toBeNull();
    // indeterminate: a valueless progress element
    expect(bar?.hasAttribute('value')).toBe(false);
    expect(el.querySelector('.sk-progress--indeterminate')).not.toBeNull();
    expect(text(el)).toContain(LOADING.label);
    expect(text(el)).toContain(LOADING.body);
    // the bar is named by the label (an accessible name that is the label text)
    expect(text(el.querySelector(`label[for="${bar?.id ?? ''}"]`))).toBe(LOADING.label);
    // the heading is the labelled progress row: a level-2 heading by role, focusable, so the label keeps its regular weight
    const heading = el.querySelector('[data-focus-target]');
    expect(heading?.getAttribute('role')).toBe('heading');
    expect(heading?.getAttribute('aria-level')).toBe('2');
    expect(heading?.getAttribute('tabindex')).toBe('-1');
    expect(heading?.contains(bar ?? null)).toBe(true);
    expect(el.querySelectorAll('[data-focus-target]').length).toBe(1);
  });

  it('draws no list, no count badge and no retry (positive control: the error look draws a retry)', () => {
    const el = host();
    render(renderOpsLoading(LOADING), el);
    expect(el.querySelector('ul, li, [data-count], [data-retry], sk-button')).toBeNull();
    const control = host();
    render(renderOpsError(ERROR, () => undefined), control);
    expect(control.querySelector('[data-retry]')).not.toBeNull();
  });
});

describe('the empty look', () => {
  it('draws the heading as the one focusable heading and the sentence, not busy', () => {
    const el = host();
    render(renderOpsEmpty(EMPTY), el);
    expect(text(el.querySelector('h2'))).toBe(EMPTY.heading);
    expect(el.querySelector('h2')?.getAttribute('tabindex')).toBe('-1');
    expect(el.querySelectorAll('[data-focus-target]').length).toBe(1);
    expect(text(el)).toContain(EMPTY.body);
    expect(el.querySelector('[aria-busy]')).toBeNull();
    expect(el.querySelector('ul, li, [data-count], [data-retry], progress')).toBeNull();
  });

  it('names the profile in mono only when one is given (paired)', () => {
    const named = host();
    render(renderOpsEmpty({ ...EMPTY, profile: 'profile-x' }), named);
    const code = named.querySelector('code[data-empty-profile]');
    expect(code?.textContent).toBe('profile-x');
    expect(named.querySelectorAll('code').length).toBe(1);
    const plain = host();
    render(renderOpsEmpty(EMPTY), plain);
    expect(plain.querySelector('code')).toBeNull();
    const nulled = host();
    render(renderOpsEmpty({ ...EMPTY, profile: null }), nulled);
    expect(nulled.querySelector('code')).toBeNull();
  });

  it('with a profile and skipped records: the headline, the profile code, then the skipped sentence, in that order (CONTRACT-002)', () => {
    const el = host();
    render(renderOpsEmpty({ ...EMPTY, body: 'No records for this profile.', profile: 'profile-x', skipped: 'Two records could not be read.' }), el);
    const card = el.querySelector('.sk-empty-state');
    expect([...(card?.children ?? [])].map((child) => child.tagName.toLowerCase() + (child.hasAttribute('data-empty-skipped') ? '[skipped]' : ''))).toEqual(['h2', 'p', 'code', 'p[skipped]']);
    expect(text(card?.children[1] ?? null)).toBe('No records for this profile.');
    expect(text(card?.children[2] ?? null)).toBe('profile-x');
    expect(text(card?.children[3] ?? null)).toBe('Two records could not be read.');
    expect(text(el)).toBe('Empty heading No records for this profile. profile-x Two records could not be read.');
  });

  it('without a profile the skipped sentence follows the headline in the same paragraph (paired)', () => {
    const el = host();
    render(renderOpsEmpty({ ...EMPTY, skipped: 'Two records could not be read.' }), el);
    expect(el.querySelectorAll('.sk-empty-state__body').length).toBe(1);
    expect(text(el.querySelector('.sk-empty-state__body'))).toBe('Empty sentence Two records could not be read.');
    expect(el.querySelector('[data-empty-skipped]')).toBeNull();
    const none = host();
    render(renderOpsEmpty({ ...EMPTY, profile: 'profile-x', skipped: null }), none);
    expect(none.querySelectorAll('.sk-empty-state__body').length).toBe(1);
    expect(none.querySelector('[data-empty-skipped]')).toBeNull();
  });

  it('draws a foreign profile as text, never as markup', () => {
    const el = host();
    render(renderOpsEmpty({ ...EMPTY, profile: '<b>bold</b>' }), el);
    expect(el.querySelector('code')?.textContent).toBe('<b>bold</b>');
    expect(el.querySelector('b')).toBeNull();
  });
});

describe('the error look', () => {
  it('is one danger notice with an assertive announcement, the heading, the sentence and the code as given', async () => {
    await page.viewport(1280, 900);
    const el = host();
    render(renderOpsError(ERROR, () => undefined), el);
    const notice = el.querySelector('sk-notice');
    expect(el.querySelectorAll('sk-notice').length).toBe(1);
    expect(notice?.getAttribute('tone')).toBe('danger');
    expect(notice?.getAttribute('announce')).toBe('assertive');
    expect(notice?.getAttribute('data-error-code')).toBe('code-1');
    expect(text(el.querySelector('h2'))).toBe(ERROR.heading);
    expect(el.querySelector('h2')?.getAttribute('tabindex')).toBe('-1');
    expect(text(el)).toContain(ERROR.body);
    expect(text(el.querySelector('[data-retry]'))).toBe(ERROR.retryLabel);
    // the notice renders its one role=alert region itself; the part adds no other live region
    await (notice as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(notice?.shadowRoot?.querySelectorAll('[role="alert"]').length).toBe(1);
    expect(el.querySelector('[role="status"], [aria-live]')).toBeNull();
  });

  it('a null refusal code draws an empty code attribute, not "null"', () => {
    const el = host();
    render(renderOpsError({ ...ERROR, refusalCode: null }, () => undefined), el);
    expect(el.querySelector('sk-notice')?.getAttribute('data-error-code')).toBe('');
  });

  it('the retry control calls the handler once per activation and the part dispatches nothing itself', () => {
    const el = host();
    let calls = 0;
    const seen: Event[] = [];
    const listener = (event: Event): void => {
      seen.push(event);
    };
    const names = ['sk-retry-load', 'sk-load-more'];
    for (const name of names) document.addEventListener(name, listener);
    try {
      render(renderOpsError(ERROR, () => { calls += 1; }), el);
      el.querySelector<HTMLElement>('[data-retry]')?.click();
      expect(calls).toBe(1);
      el.querySelector<HTMLElement>('[data-retry]')?.click();
      expect(calls).toBe(2);
      // the part never dispatches: a handler that dispatches is the screen's job (positive control: dispatching ourselves is seen)
      expect(seen.length).toBe(0);
      document.dispatchEvent(new CustomEvent('sk-retry-load'));
      expect(seen.length).toBe(1);
    } finally {
      for (const name of names) document.removeEventListener(name, listener);
    }
  });

  it('carries no path, no file format and no host name in its own markup, in every look', () => {
    const FORBIDDEN = /\.(jsonl?|ya?ml|md|toml)\b|kitty|https?:|[\\/]/i;
    const looks: Array<[string, TemplateResult]> = [
      ['loading', renderOpsLoading(LOADING)],
      ['empty', renderOpsEmpty(EMPTY)],
      ['error', renderOpsError(ERROR, () => undefined)],
    ];
    for (const [name, template] of looks) {
      const el = host();
      render(template, el);
      expect(el.querySelectorAll('[href], [src]').length, name).toBe(0);
      // the markup with the closing tags removed has no slash left to match, so the test reads the text and every attribute value
      const values = [...el.querySelectorAll('*')].flatMap((node) => [...node.attributes].map((attribute) => attribute.value));
      expect([el.textContent ?? '', ...values].filter((value) => FORBIDDEN.test(value)), name).toEqual([]);
    }
    // positive control: the matcher refuses what it is for, in text and in an attribute value
    expect(FORBIDDEN.test('kitty-ops/x.jsonl')).toBe(true);
    expect(FORBIDDEN.test('https://host.example')).toBe(true);
    expect(FORBIDDEN.test('a/b')).toBe(true);
    expect(FORBIDDEN.test(`${ERROR.heading} ${ERROR.body} ${LOADING.body}`)).toBe(false);
  });
});
