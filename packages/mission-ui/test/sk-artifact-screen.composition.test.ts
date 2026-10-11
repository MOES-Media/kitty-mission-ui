// The host composition of the Artifact Viewer (IC-10): EV-8 (`sk-open-artifact` is consumed from the host, never re-emitted), the SC-002
// audit (every `sk-*` event dispatched anywhere during the whole composition is recorded; the names seen are a subset of the manifest's
// events and at least the five declared events were seen) and an unknown kind and an unknown code in a full host composition.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import manifest from '../custom-elements.json';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, contentAt, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps, PairingId } from '../src/elements/sk-artifact-screen/fixtures.js';
import { buildArtifactTree, pathOfArtifactNode } from '../src/logic/artifact-tree.js';
import type { SkShellTree } from '../src/elements/sk-shell-tree/sk-shell-tree.js';
import type { ShellNavigateDetail } from '../src/shell-types.js';

const DECLARED = ['sk-select-artifact', 'sk-open-link', 'sk-select-work-package', 'sk-open-mission', 'sk-retry-load'] as const;

/** Every event name the manifest declares, over all declarations. */
function manifestEvents(): Set<string> {
  const names = new Set<string>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value !== null && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (Array.isArray(record.events)) for (const e of record.events as { name?: unknown }[]) if (typeof e.name === 'string') names.add(e.name);
      Object.values(record).forEach(walk);
    }
  };
  walk(manifest);
  return names;
}

/** Records the type of every `sk-*` event dispatched on any target, whether or not anything listens, until `stop()` (the audit). */
function audit(): { seen: string[]; stop: () => void } {
  const original = EventTarget.prototype.dispatchEvent;
  const seen: string[] = [];
  EventTarget.prototype.dispatchEvent = function (this: EventTarget, event: Event): boolean {
    if (event.type.startsWith('sk-')) seen.push(event.type);
    return original.call(this, event);
  };
  return {
    seen,
    stop: () => {
      EventTarget.prototype.dispatchEvent = original;
    },
  };
}

let stopAudit: (() => void) | null = null;
afterEach(() => {
  stopAudit?.();
  stopAudit = null;
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

const frames = async (n = 2): Promise<void> => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};

interface Host {
  box: HTMLElement;
  screen: SkArtifactScreen;
  show(id: PairingId): Promise<void>;
  open(path: string): Promise<void>;
}
/** The TEST host: the shell with the tree, the screen in its slot, and the two handlers a real host owns (`sk-navigate`, `sk-open-artifact`). */
async function mountHost(id: PairingId): Promise<Host> {
  await page.viewport(1280, 900);
  const box = document.createElement('div');
  document.body.append(box);
  const screen = document.createElement('sk-artifact-screen');
  let props: ArtifactScreenProps = pairingProps(id);
  Object.assign(screen, props);
  const paint = (): void => {
    const tree = buildArtifactTree(props.listing?.entries ?? [], { selectedPath: props.selectedPath });
    render(artifactFrame(html`${screen}`, { items: tree.nodes, current: tree.current }), box);
  };
  const host: Host = {
    box,
    screen,
    async show(next) {
      props = pairingProps(next);
      Object.assign(screen, props);
      paint();
      await screen.updateComplete;
      await frames();
    },
    async open(path) {
      props = { ...props, selectedPath: path, content: props.content === null ? null : contentAt(props.content, path) };
      Object.assign(screen, props);
      paint();
      await screen.updateComplete;
      await frames();
    },
  };
  box.addEventListener('sk-navigate', (event) => {
    const target = pathOfArtifactNode((event as CustomEvent<ShellNavigateDetail>).detail.id);
    if (target !== null) void host.open(target);
  });
  box.addEventListener('sk-open-artifact', (event) => {
    const detail = (event as CustomEvent<{ path: string }>).detail;
    void host.open(detail.path);
  });
  paint();
  await screen.updateComplete;
  await frames();
  return host;
}
const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
const link = (screen: Element, text: string): HTMLElement => {
  const found = Array.from(root(screen).querySelectorAll<HTMLElement>('a[data-md="link"]')).find((a) => (a.textContent ?? '').startsWith(text));
  if (found === undefined) throw new Error(`no link ${text}`);
  return found;
};
const sk = (el: HTMLElement | null | undefined): HTMLElement => {
  const inner = el?.shadowRoot?.querySelector('button');
  if (inner === null || inner === undefined) throw new Error('no inner button');
  return inner;
};

describe('EV-8: sk-open-artifact is consumed from the host and never re-emitted', () => {
  it('opens the artifact the host was told to, and the screen dispatches no event of that name (control: an event from the screen would show here)', async () => {
    const host = await mountHost('AV-03');
    const log = audit();
    stopAudit = log.stop;
    const onBox: CustomEvent[] = [];
    host.box.addEventListener('sk-open-artifact', (event) => onBox.push(event as CustomEvent));
    const fromScreen: Event[] = [];
    document.addEventListener('sk-open-artifact', (event) => fromScreen.push(event), true);
    host.box.dispatchEvent(new CustomEvent('sk-open-artifact', { detail: { missionId: 'm', path: 'data-model.md', kind: 'data_model' }, bubbles: true, composed: true }));
    await frames(4);
    expect(root(host.screen).querySelector('[data-region="document-pane"]')?.getAttribute('aria-label')).toBe('Document: data-model.md');
    expect(log.seen.filter((name) => name === 'sk-open-artifact')).toHaveLength(1);
    expect(onBox).toHaveLength(1);
    expect(fromScreen).toHaveLength(1);
    // The positive control on the same recorder: an activation that DOES emit is seen by it.
    link(host.screen, 'the project site').click();
    expect(log.seen.filter((name) => name === 'sk-open-link')).toHaveLength(1);
    expect(log.seen.filter((name) => name === 'sk-open-artifact')).toHaveLength(1);
    log.stop();
    stopAudit = null;
  });
});

describe('SC-002 audit over the whole composition', () => {
  it('sees the five declared events and nothing outside the manifest, and the unknown kind and the unknown code render in the host', async () => {
    const declared = manifestEvents();
    for (const name of DECLARED) expect(declared.has(name), name).toBe(true);
    const log = audit();
    stopAudit = log.stop;
    const host = await mountHost('AV-03');
    // sk-select-artifact (an internal link), sk-open-link (an external one), sk-select-work-package (a pill).
    link(host.screen, 'data model').click();
    await frames(3);
    await host.show('AV-03');
    link(host.screen, 'the project site').click();
    root(host.screen).querySelector<HTMLElement>('[data-region="inspector"] button.sk-pill-tag')?.click();
    // sk-navigate and sk-tree-toggle belong to the shell tree and are among the manifest's events.
    const tree = host.box.querySelector<SkShellTree>('sk-shell-tree');
    const row = Array.from(tree?.shadowRoot?.querySelectorAll<HTMLElement>('sk-action-row[href]') ?? []).find((r) => (r.textContent ?? '').trim().startsWith('spec.md'));
    row?.click();
    await frames(3);
    // sk-retry-load (a retryable refusal) and sk-open-mission (a Mission that was not found).
    await host.show('AV-13');
    sk(root(host.screen).querySelector<HTMLElement>('[data-refusal] sk-button')).click();
    await host.show('AV-23');
    sk(root(host.screen).querySelector<HTMLElement>('[data-state-panel] sk-button')).click();
    await frames(2);
    // An unknown kind and an unknown refusal code render in the full composition.
    await host.show('AV-29');
    expect(root(host.screen).textContent).toContain('diagram');
    await host.show('AV-29');
    Object.assign(host.screen, { content: null, contentStatus: 'refused', refusalCode: 'artifact_made_up_code' });
    await host.screen.updateComplete;
    await frames(2);
    expect(root(host.screen).querySelector('[data-refusal] h1')).not.toBeNull();
    log.stop();
    stopAudit = null;

    const seen = new Set(log.seen);
    for (const name of DECLARED) expect(seen.has(name), `${name} was seen`).toBe(true);
    expect([...seen].filter((name) => !declared.has(name)), 'every name seen is a manifest event').toEqual([]);
    expect(seen.size).toBeGreaterThanOrEqual(5);
    // The control: the audit finds an undeclared name when one is dispatched.
    const control = audit();
    document.body.dispatchEvent(new CustomEvent('sk-not-a-declared-event'));
    control.stop();
    expect(control.seen.filter((name) => !declared.has(name))).toEqual(['sk-not-a-declared-event']);
  });
});
