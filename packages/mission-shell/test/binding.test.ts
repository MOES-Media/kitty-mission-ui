// The permanent Svelte–Lit binding check (WP06, FR-001, FR-002, SC-001, R-06). The real `sk-missions-screen` is mounted
// through the Svelte 5 harness exactly as the shell mounts it, then proven to receive its data as values (a list as a
// list, a non-default primitive as a property, no stray attribute) and to deliver every intent it declares. The oracles
// are independent of the output under test: the page items of contracts/fixtures/mission-status.fixtures.json, and the
// declared events and attributes of packages/mission-ui/custom-elements.json.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { flushSync, mount, unmount } from 'svelte';
import type { MissionOverviewView, SkMissionsScreen } from '@moes-media/mission-ui';
import fixtures from '../../../contracts/fixtures/mission-status.fixtures.json' with { type: 'json' };
import manifestJson from '../../mission-ui/custom-elements.json' with { type: 'json' };
import BindingHarness from '../src/harness/BindingHarness.svelte';

const TAG = 'sk-missions-screen';

interface ManifestMember {
  kind: string;
  name: string;
  attribute?: string;
  reflects?: boolean;
}
interface ManifestDeclaration {
  tagName?: string;
  events?: { name: string }[];
  members?: ManifestMember[];
}
interface Manifest {
  modules: { declarations?: ManifestDeclaration[] }[];
}

/** The manifest declaration of the screen, read from custom-elements.json (the independent source of its surface). */
function declaration(): ManifestDeclaration {
  const found = (manifestJson as Manifest).modules.flatMap((module) => module.declarations ?? []).filter((d) => d.tagName === TAG);
  expect(found.length).toBe(1);
  return found[0] as ManifestDeclaration;
}
const member = (name: string): ManifestMember | undefined => declaration().members?.find((m) => m.kind === 'field' && m.name === name);

/** The page items of a valid MissionOverviewPage fixture: the data oracle (read directly, not through the adapter). */
const fixturePage = fixtures.pageFirst;
const fixtureItems = fixturePage.value.items as MissionOverviewView[];

const STATUS_GIVEN = 'ready';
const onIntent = vi.fn<(name: string, detail: unknown) => void>();
let harness: ReturnType<typeof mount> | undefined;
let el: SkMissionsScreen;

beforeAll(async () => {
  await page.viewport(1024, 768);
  expect(fixturePage.schema).toBe('MissionOverviewPage');
  harness = mount(BindingHarness, {
    target: document.body,
    // A fresh copy: the element must receive an equal list, and the oracle must stay untouched by the mount.
    props: { missions: structuredClone(fixtureItems), status: STATUS_GIVEN, loadingMore: true, onIntent },
  });
  flushSync();
  await customElements.whenDefined(TAG);
  const found = document.querySelectorAll<SkMissionsScreen>(TAG);
  expect(found.length).toBe(1);
  el = found[0] as SkMissionsScreen;
  await el.updateComplete;
  // A generous hook timeout: under the registration-order plant the screen module loads only after mount, inside this
  // hook, and a loaded machine must still reach the loadingMore assertion rather than time out here.
}, 60_000);

afterAll(() => {
  if (harness) unmount(harness);
  document.body.replaceChildren();
});

// Runs first (D4): a mount before registration fails here, before any row count is asserted.
describe('data path: a non-default primitive arrives as a property, with no stray attribute', () => {
  it('sets loadingMore as a property and leaves no attribute a wrong binding would create', () => {
    // Svelte sets an object as a property even on an unregistered element, so only a non-default primitive can tell a
    // mount-before-registration apart: it would fall back to setAttribute('loadingMore'), which Lit never observes.
    expect(el.loadingMore, 'binding: loadingMore not set as property').toBe(true);
    expect(member('loadingMore')?.attribute).toBe('loading-more');
    // Lower-cased prop names (the setAttribute fallback) and the declared attribute of loadingMore are all absent.
    // `status` is the mandatory exception: custom-elements.json declares it `reflects: true` (the `status` field of
    // sk-missions-screen), so its attribute is expected and asserted below rather than treated as stray.
    for (const stray of ['missions', 'loadingmore', 'loading-more']) {
      expect(el.hasAttribute(stray), `binding: stray attribute ${stray}`).toBe(false);
    }
    expect(member('status')?.reflects).toBe(true);
    expect(el.getAttribute('status')).toBe(STATUS_GIVEN);
    // Positive control: the same check sees an attribute that is present.
    el.setAttribute('loadingmore', 'x');
    expect(el.hasAttribute('loadingmore')).toBe(true);
    el.removeAttribute('loadingmore');
    expect(el.hasAttribute('loadingmore')).toBe(false);
  });

  it('sets status to the value given', () => {
    expect(el.status).toBe(STATUS_GIVEN);
  });
});

describe('data path: the list arrives as a list', () => {
  it('receives the fixture page items as an Array and renders exactly one row per item', async () => {
    expect(fixtureItems.length).toBe(2);
    expect(Array.isArray(el.missions)).toBe(true);
    expect(el.missions).toEqual(fixtureItems);
    const screen = page.elementLocator(el);
    // No pageInfo is given, so the list holds the rows only (no Load more item).
    expect(screen.getByRole('listitem').elements().length).toBe(fixtureItems.length);
    let located = 0;
    for (const item of fixtureItems) {
      expect(screen.getByRole('button', { name: item.friendlyName }).elements().length).toBe(1);
      located += 1;
    }
    expect(located).toBe(fixtureItems.length);
  });
});

describe('intent path: every declared intent reaches the shell with its detail', () => {
  /** A typed sample detail for each intent dispatched from the element. */
  const samples: Record<string, unknown> = {
    'sk-search': { query: 'binding sample' },
    'sk-load-more': { cursor: 'binding-cursor' },
    'sk-filter-change': { filter: 'binding-filter' },
  };
  const VIA_UI = 'sk-open-mission';

  it('delivers the declared events: one through real UI, the rest dispatched from the element', async () => {
    const declared = (declaration().events ?? []).map((event) => event.name);
    expect(declared.length).toBe(4);
    expect(declared).toContain(VIA_UI);
    onIntent.mockClear();

    // Real UI: activate the second row with a pointer click on its accessible button.
    const target = fixtureItems[1] as MissionOverviewView;
    await userEvent.click(page.elementLocator(el).getByRole('button', { name: target.friendlyName }));
    expect(onIntent.mock.calls.filter(([name]) => name === VIA_UI), `binding: intent ${VIA_UI} not delivered`).toEqual([
      [VIA_UI, { missionId: target.missionId, slug: target.slug }],
    ]);

    let dispatched = 0;
    for (const name of declared.filter((event) => event !== VIA_UI)) {
      expect(Object.keys(samples), `binding: no sample detail for ${name}`).toContain(name);
      const detail = samples[name];
      el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
      expect(onIntent.mock.calls.filter(([called]) => called === name), `binding: intent ${name} not delivered`).toEqual([[name, detail]]);
      dispatched += 1;
    }
    expect(dispatched).toBe(declared.length - 1);
    // No extra calls: one per declared intent, exactly.
    expect(onIntent).toHaveBeenCalledTimes(declared.length);
  });
});
