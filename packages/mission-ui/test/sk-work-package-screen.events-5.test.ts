// EV-5 (IC-06, T045): "Open spec.md" and "Open prompt" each emit `sk-open-artifact` exactly once with
// `{ missionId, path, kind }`; the `kind` is passed through unbranched. Real pointer and keyboard input on the real
// controls; every no-event and absence case carries its positive control.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { DETAIL_FIXTURES, WORK_PACKAGE_FIXTURES, pairDetail, pairingProps, sampleMission, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WorkPackageDetailView } from '../src/contract/types.js';
import { OPEN_PROMPT_LABEL, OPEN_SPEC_LABEL } from '../src/defaults/index.js';

const EVENT_NAMES = ['sk-select-work-package', 'sk-open-mission', 'sk-open-artifact', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function mount(props: Partial<WpScreenProps> = {}): Promise<SkWorkPackageScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-34'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}

const links = (screen: SkWorkPackageScreen): HTMLElement[] => [...(screen.shadowRoot?.querySelectorAll<HTMLElement>('[data-region="artifact-links"] sk-button') ?? [])];
const labelOf = (control: HTMLElement): string => (control.textContent ?? '').trim();
const controlNamed = (screen: SkWorkPackageScreen, name: string): HTMLElement => {
  const found = links(screen).find((control) => labelOf(control) === name);
  if (found === undefined) throw new Error(`no control ${name}`);
  return found;
};

function listenAll(screen: SkWorkPackageScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.parentElement?.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}

function expectOne(events: CustomEvent[], path: string, kind: string): void {
  expect(events).toHaveLength(1);
  const [event] = events as [CustomEvent];
  expect(event.type).toBe('sk-open-artifact');
  expect(event.bubbles).toBe(true);
  expect(event.composed).toBe(true);
  expect(event.cancelable).toBe(false);
  expect(event.detail).toEqual({ missionId: sampleMission.missionId, path, kind });
}

const references = DETAIL_FIXTURES.detailPopulated.artifactReferences;

describe('EV-5: artifact links', () => {
  it('"Open spec.md" and "Open prompt" each emit once with their own path and kind (pointer)', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    expect(links(screen)).toHaveLength(2);
    expect(references.spec).not.toBeNull();
    expect(references.prompt).not.toBeNull();
    const cases: [string, { path: string; kind: string } | null][] = [
      [OPEN_SPEC_LABEL, references.spec],
      [OPEN_PROMPT_LABEL, references.prompt],
    ];
    let visited = 0;
    for (const [name, reference] of cases) {
      events.length = 0;
      await userEvent.click(controlNamed(screen, name));
      expectOne(events, reference?.path ?? '?', reference?.kind ?? '?');
      visited += 1;
    }
    expect(visited).toBe(2);
  });

  it('Enter and Space on a focused control each emit once', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    const control = controlNamed(screen, OPEN_SPEC_LABEL);
    let visited = 0;
    for (const key of ['{Enter}', ' ']) {
      events.length = 0;
      control.focus();
      expect(screen.shadowRoot?.activeElement).toBe(control);
      await userEvent.keyboard(key);
      expectOne(events, references.spec?.path ?? '?', references.spec?.kind ?? '?');
      visited += 1;
    }
    expect(visited).toBe(2);
  });

  it('passes a kind the screen never saw through unchanged', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    const detail = {
      ...pairDetail(wp, DETAIL_FIXTURES.detailPopulated, { cycles: 'none' }),
      artifactReferences: { spec: { path: 'notes/odd.md', kind: 'a-kind-the-screen-never-saw' }, prompt: references.prompt },
    } as unknown as WorkPackageDetailView;
    const screen = await mount({ detail });
    const events = listenAll(screen);
    await userEvent.click(controlNamed(screen, OPEN_SPEC_LABEL));
    expectOne(events, 'notes/odd.md', 'a-kind-the-screen-never-saw');
  });

  it('draws no control for a null reference (DOM absence), paired with the present sibling that still emits', async () => {
    const screen = await mount(pairingProps('WP-35a'));
    expect(links(screen).map(labelOf)).toEqual([OPEN_SPEC_LABEL]);
    expect(screen.shadowRoot?.textContent).not.toContain(OPEN_PROMPT_LABEL);
    const events = listenAll(screen);
    await userEvent.click(controlNamed(screen, OPEN_SPEC_LABEL));
    expectOne(events, references.spec?.path ?? '?', references.spec?.kind ?? '?');
    document.body.replaceChildren();

    const noSpec = await mount(pairingProps('WP-35b'));
    expect(links(noSpec).map(labelOf)).toEqual([OPEN_PROMPT_LABEL]);
    expect(noSpec.shadowRoot?.textContent).not.toContain(OPEN_SPEC_LABEL);
  });

  it('is inert with no Mission: a click emits nothing; the same listener hears it once the Mission is set', async () => {
    const screen = await mount({ mission: null });
    const events = listenAll(screen);
    expect(links(screen)).toHaveLength(2);
    expect(links(screen).every((control) => control.hasAttribute('disabled'))).toBe(true);
    links(screen).forEach((control) => control.click());
    expect(events).toHaveLength(0);

    screen.mission = sampleMission;
    await screen.updateComplete;
    expect(links(screen).some((control) => control.hasAttribute('disabled'))).toBe(false);
    events.length = 0;
    controlNamed(screen, OPEN_PROMPT_LABEL).click();
    expectOne(events, references.prompt?.path ?? '?', references.prompt?.kind ?? '?');
  });

  it('hovering emits nothing, and no other sk-* event is heard while a link is activated', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    await userEvent.hover(controlNamed(screen, OPEN_SPEC_LABEL));
    expect(events).toHaveLength(0);
    await userEvent.click(controlNamed(screen, OPEN_SPEC_LABEL));
    expect(events.map((event) => event.type)).toEqual(['sk-open-artifact']);
  });
});
