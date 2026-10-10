// The eyebrow half of AV-29 (PLAN-FRESH4-001): the raw kind word of an unknown kind is the document eyebrow, read through the screen on
// the merged chains. A known kind shows its table word (control: the same screen, one kind apart).
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import { ARTIFACT_KIND_WORDS } from '../src/defaults/index.js';
import { contentUnknownKind } from '../src/contract/fixtures.generated.js';

afterEach(() => document.body.replaceChildren());

async function mount(props: ArtifactScreenProps): Promise<SkArtifactScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await screen.updateComplete;
  for (let i = 0; i < 3; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
const eyebrow = (screen: Element): string => (screen.shadowRoot?.querySelector('article[data-scroll="article"] > p')?.textContent ?? '').trim();

describe('AV-29: the document eyebrow of an unknown kind', () => {
  it('is the raw kind word of the content, and the inspector names the same word', async () => {
    const props = pairingProps('AV-29');
    expect(contentUnknownKind.kind).toBe('diagram');
    expect(props.content?.kind).toBe('diagram');
    const screen = await mount(props);
    expect(eyebrow(screen)).toBe('diagram');
    expect((screen.shadowRoot?.querySelector('[data-region="inspector"]')?.textContent ?? '')).toContain('diagram');
  });

  it('is the table word for a known kind (control: the same document with the kind of AV-01)', async () => {
    const props = pairingProps('AV-29');
    const known = await mount({ ...props, content: props.content === null ? null : { ...props.content, kind: 'spec' } });
    expect(eyebrow(known)).toBe(ARTIFACT_KIND_WORDS.spec.label);
    expect(eyebrow(known)).not.toBe('diagram');
  });
});
