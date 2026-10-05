import { afterEach, describe, expect, it } from 'vitest';
import '@spec-kitty/tokens';
import '../src/index.js';
import { implementInProgress } from '../src/elements/sk-pipeline-screen/fixtures.js';
import { BRANCH, NOW, mixedMissions, mixedPageInfo, project } from '../src/elements/sk-missions-screen/fixtures.js';

afterEach(() => document.body.replaceChildren());

const PROPS = ['position', 'inlineSize', 'blockSize', 'marginTop', 'marginLeft', 'paddingTop', 'paddingLeft', 'overflowX', 'overflowY'] as const;

function declared(el: Element): string {
  const style = getComputedStyle(el);
  return JSON.stringify(PROPS.map((prop) => style[prop]));
}

async function settled(tag: string, props: object): Promise<HTMLElement> {
  const el = document.createElement(tag);
  Object.assign(el, props);
  document.body.append(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el;
}

describe('one visually hidden style for the five screen-reader-only texts (D-09)', () => {
  it('the search label, the live region, the board heading, a lane count and a phase status share it and take no room', async () => {
    const missions = await settled('sk-missions-screen', { status: 'ready', project, branch: BRANCH, missions: mixedMissions, pageInfo: mixedPageInfo, now: NOW });
    const pipeline = await settled('sk-pipeline-screen', { status: 'ready', mission: implementInProgress });
    await (missions.shadowRoot?.querySelector('sk-form-input') as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const board = pipeline.shadowRoot?.querySelector('sk-work-package-board') as HTMLElement;
    const bar = pipeline.shadowRoot?.querySelector('sk-phase-bar') as HTMLElement;
    await (board as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await (bar as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    const input = missions.shadowRoot?.querySelector('sk-form-input') as HTMLElement;
    const hidden: Element[] = [
      input.shadowRoot?.querySelector('[part="label"]') as Element,
      missions.shadowRoot?.querySelector('[data-live]') as Element,
      board.shadowRoot?.querySelector('h2') as Element,
      board.shadowRoot?.querySelector('[data-lane-count-text]') as Element,
      bar.shadowRoot?.querySelector('[data-phase-status]') as Element,
    ];
    expect(hidden.every((el) => el instanceof Element)).toBe(true);
    const styles = hidden.map(declared);
    expect(new Set(styles).size, styles.join('\n')).toBe(1);
    const sample = getComputedStyle(hidden[0] as Element);
    expect([sample.position, sample.overflowX, sample.inlineSize, sample.blockSize]).toEqual(['absolute', 'hidden', '0px', '0px']);
    for (const el of hidden) expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });
});
