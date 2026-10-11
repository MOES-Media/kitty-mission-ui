// Focus rule 8 (IC-08, PLAN-FRESH4-002 (a)): when an update removes the control that held focus (Retry, an internal link that swaps
// the content), focus lands on the document pane after `updateComplete` plus one animation frame and never on the body; focus that
// sits anywhere else is left alone. The tests wait `updateComplete` and two frames: the screen's own frame is queued after its update,
// so a single frame of the test can run before it. The tree-driven swap is tested in the host composition (the one place the shell tree exists).
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps, PairingId } from '../src/elements/sk-artifact-screen/fixtures.js';
import { contentFeatures } from '../src/contract/fixtures.generated.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

const frames = async (n: number): Promise<void> => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};
async function settle(screen: SkArtifactScreen): Promise<void> {
  await screen.updateComplete;
  await frames(3);
}
async function mount(id: PairingId, props: Partial<ArtifactScreenProps> = {}): Promise<SkArtifactScreen> {
  await page.viewport(1280, 900);
  const outside = document.createElement('button');
  outside.id = 'outside';
  outside.textContent = 'outside';
  document.body.append(outside);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps(id), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}
const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
const pane = (screen: Element): HTMLElement => {
  const found = root(screen).querySelector<HTMLElement>('[data-region="document-pane"]');
  if (found === null) throw new Error('no pane');
  return found;
};
/** The innermost focused element, looking through the screen's shadow root. */
const focused = (screen: Element): Element | null => {
  const active = document.activeElement;
  return active === screen ? root(screen).activeElement : active;
};
const retryButton = (screen: Element): HTMLElement => {
  const found = root(screen).querySelector<HTMLElement>('[data-refusal] sk-button');
  if (found === null) throw new Error('no retry');
  return found;
};
const link = (screen: Element, text: string): HTMLElement => {
  const found = Array.from(root(screen).querySelectorAll<HTMLElement>('a[data-md="link"]')).find((a) => (a.textContent ?? '').startsWith(text));
  if (found === undefined) throw new Error(`no link ${text}`);
  return found;
};

describe('Retry activated: the refusal block is replaced', () => {
  it('lands focus on the pane after the update and one frame, never on the body', async () => {
    const screen = await mount('AV-13');
    // The host's answer to Retry: it starts reading again, so the screen goes to the loading look and the refusal block goes.
    screen.addEventListener('sk-retry-load', () => {
      screen.contentStatus = 'loading';
      screen.refusalCode = null;
    });
    const button = retryButton(screen);
    (button.shadowRoot?.querySelector('button') ?? button).focus();
    expect(root(screen).activeElement).toBe(button);
    await userEvent.click(button);
    await screen.updateComplete;
    await frames(2);
    expect(root(screen).querySelector('[data-refusal]')).toBeNull();
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(screen);
    expect(focused(screen)).toBe(pane(screen));
  });

  it('leaves the focus alone when it sits outside the screen (positive control: the same swap with focus inside moves it)', async () => {
    const screen = await mount('AV-13');
    const outside = document.getElementById('outside') as HTMLElement;
    outside.focus();
    expect(document.activeElement).toBe(outside);
    screen.contentStatus = 'loading';
    screen.refusalCode = null;
    await settle(screen);
    expect(root(screen).querySelector('[data-refusal]')).toBeNull();
    expect(document.activeElement).toBe(outside);
    // Control: with focus on Retry the same change moves it to the pane.
    const inside = await mount('AV-13');
    const button = retryButton(inside);
    (button.shadowRoot?.querySelector('button') ?? button).focus();
    inside.contentStatus = 'loading';
    inside.refusalCode = null;
    await settle(inside);
    expect(focused(inside)).toBe(pane(inside));
  });
});

describe('a link activation that swaps the content', () => {
  // CR-1 (ruled): the swap is followed by a second, property-less update (the overflow measurement asks for one). A restore that has
  // started is carried across updates, so that update cannot cancel it.
  it('lands focus on the pane after the update and one frame, never on the body', async () => {
    const screen = await mount('AV-03');
    screen.addEventListener('sk-select-artifact', (event) => {
      const detail = (event as CustomEvent<{ path: string }>).detail;
      // The host shows the target: a new selection, the new document, and the old document (with its link) is gone.
      Object.assign(screen, { selectedPath: detail.path, content: { ...contentFeatures, path: detail.path, content: '# Target\n\nNo links here.' } });
    });
    const target = link(screen, 'data model');
    target.focus();
    expect(root(screen).activeElement).toBe(target);
    await userEvent.keyboard('{Enter}');
    await screen.updateComplete;
    await frames(2);
    expect(root(screen).querySelector('a[data-md="link"]')).toBeNull();
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(screen);
    expect(focused(screen)).toBe(pane(screen));
  });

  it('leaves focus on the control that still exists (the selected tab) when an update changes nothing under it', async () => {
    const screen = await mount('AV-01');
    const tab = root(screen).querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (tab === null) throw new Error('no selected tab');
    tab.focus();
    expect(root(screen).activeElement).toBe(tab);
    screen.now = '2026-09-25T10:00:00Z';
    await settle(screen);
    expect(root(screen).activeElement).toBe(tab);
    expect(focused(screen)).not.toBe(pane(screen));
  });

  it('moves nothing when the update was not a swap and focus was never in the screen (control above: it moves when it falls to the body)', async () => {
    const screen = await mount('AV-03');
    expect(document.activeElement).toBe(document.body);
    Object.assign(screen, { selectedPath: 'plan.md', content: { ...contentFeatures, path: 'plan.md' } });
    await settle(screen);
    expect(document.activeElement).toBe(document.body);
  });

  it('does not take focus back from an element outside that the user moved to while the restore was pending', async () => {
    const screen = await mount('AV-03');
    screen.addEventListener('sk-select-artifact', (event) => {
      const detail = (event as CustomEvent<{ path: string }>).detail;
      Object.assign(screen, { selectedPath: detail.path, content: { ...contentFeatures, path: detail.path, content: '# Target\n\nNo links here.' } });
    });
    const target = link(screen, 'data model');
    target.focus();
    await userEvent.keyboard('{Enter}');
    const outside = document.getElementById('outside') as HTMLElement;
    outside.focus();
    await screen.updateComplete;
    await frames(3);
    expect(root(screen).querySelector('a[data-md="link"]')).toBeNull();
    expect(document.activeElement).toBe(outside);
  });

  it('does not pull focus after a completed restore: a later update with focus on the body leaves it there (control: the first swap did restore)', async () => {
    const screen = await mount('AV-03');
    screen.addEventListener('sk-select-artifact', (event) => {
      const detail = (event as CustomEvent<{ path: string }>).detail;
      Object.assign(screen, { selectedPath: detail.path, content: { ...contentFeatures, path: detail.path, content: '# Target\n\nNo links here.' } });
    });
    link(screen, 'data model').focus();
    await userEvent.keyboard('{Enter}');
    await screen.updateComplete;
    await frames(3);
    // The restore completed: focus is on the pane.
    expect(focused(screen)).toBe(pane(screen));
    // The user moves focus to the body; a later update changes only the clock.
    (document.activeElement as HTMLElement | null)?.blur();
    (root(screen).activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
    screen.now = '2026-09-26T10:00:00Z';
    await settle(screen);
    await frames(3);
    expect(document.activeElement).toBe(document.body);
  });
});
