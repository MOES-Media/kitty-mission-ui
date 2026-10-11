// T029: the Ops row part as a pure function of the view-model. The part is rendered into a scratch list with lit's `render`
// (no screen, no listener): the DOM it makes is a function of the `OpsRowView` alone.
import { render } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { OPS_COPY } from '../src/defaults/ops-copy.js';
import { buildOpsRow } from '../src/logic/ops-row.js';
import type { OpsFact, OpsRowView } from '../src/logic/ops-row.js';
import { renderOpsRow } from '../src/elements/sk-ops-screen/ops-row-parts.js';
import { OPS_INVOCATION_FIXTURES } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsInvocationFixtureName } from '../src/elements/sk-ops-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
});

function draw(view: OpsRowView): HTMLLIElement {
  const list = document.createElement('ul');
  document.body.append(list);
  render(renderOpsRow(view), list);
  const row = list.querySelector('li');
  if (row === null) throw new Error('no li');
  return row;
}

/** The one predicate: the attributes of `node` that make an element interactive or loadable (handlers, role, tabindex, href, src, srcset). */
const forbiddenAttributes = (node: Element): string[] =>
  [...node.attributes].map((attribute) => attribute.name).filter((name) => /^on/.test(name) || ['role', 'tabindex', 'href', 'src', 'srcset'].includes(name));

const viewOf = (name: OpsInvocationFixtureName): OpsRowView => buildOpsRow(OPS_INVOCATION_FIXTURES[name]);
const factsOf = (row: HTMLElement): { term: string; dd: HTMLElement }[] =>
  [...row.querySelectorAll('dl > div')].map((pair) => ({
    term: pair.querySelector('dt')?.textContent?.trim() ?? '',
    dd: pair.querySelector('dd') as HTMLElement,
  }));

describe('the row is a plain list item', () => {
  it('draws an li with a head (id, badge) and a definition list, and nothing else at the top', async () => {
    await page.viewport(1280, 900);
    const row = draw(viewOf('opsClosedByAgent'));
    expect(row.tagName).toBe('LI');
    expect([...row.children].map((child) => child.tagName)).toEqual(['DIV', 'DL']);
    expect([...(row.firstElementChild as HTMLElement).children].map((child) => child.tagName)).toEqual(['STRONG', 'SK-PILL-TAG']);
  });

  it('carries the pinned data attributes on the id and the badge, and the id inside a bdi', () => {
    const row = draw(viewOf('opsClosedByAgent'));
    const id = row.querySelector('[data-ops-id]') as HTMLElement;
    expect(row.querySelectorAll('[data-ops-id]')).toHaveLength(1);
    expect(id.querySelector('bdi')?.textContent).toBe(OPS_INVOCATION_FIXTURES.opsClosedByAgent.invocationId);
    const badge = row.querySelector('[data-ops-badge]') as HTMLElement;
    expect(row.querySelectorAll('[data-ops-badge]')).toHaveLength(1);
    expect(badge.tagName).toBe('SK-PILL-TAG');
    expect(badge.querySelector('bdi')?.textContent).toBe('done');
    expect(badge.getAttribute('status')).toBe('success');
    expect(badge.getAttribute('title')).toBe('done');
  });

  it('the badge word and tone follow the view, for each tone of the vocabulary and for a foreign word', () => {
    const cases: [OpsInvocationFixtureName, string, string][] = [
      ['opsClosedByAgent', 'done', 'success'],
      ['opsFailed', 'failed', 'danger'],
      ['opsAbandoned', 'abandoned', 'attention'],
      ['opsOpen', 'open', 'neutral'],
      ['opsUnknownOutcome', 'paused', 'neutral'],
    ];
    let ran = 0;
    for (const [name, word, tone] of cases) {
      const badge = draw(viewOf(name)).querySelector('[data-ops-badge]') as HTMLElement;
      expect([badge.textContent?.trim(), badge.getAttribute('status')], name).toEqual([word, tone]);
      ran += 1;
    }
    expect(ran).toBe(5);
  });

  it('has no listener hook, role, tabindex or link on the row or anything in it', () => {
    let visited = 0;
    const names = Object.keys(OPS_INVOCATION_FIXTURES) as OpsInvocationFixtureName[];
    expect(names).toHaveLength(29);
    for (const name of names) {
      const row = draw(viewOf(name));
      for (const node of [row, ...row.querySelectorAll('*')]) {
        expect(forbiddenAttributes(node), `${name} ${node.tagName}`).toEqual([]);
        visited += 1;
      }
    }
    // Counted: the 29 fixture rows are 1314 nodes in all (a row is its li and its descendants).
    expect(visited).toBe(1314);
    // positive control: the same predicate, `forbiddenAttributes`, sees a planted tabindex, role, href and handler.
    const planted = draw(viewOf('opsOpen'));
    const target = planted.querySelector('dd') as HTMLElement;
    expect(forbiddenAttributes(target)).toEqual([]);
    for (const [attribute, value] of [['tabindex', '0'], ['role', 'button'], ['href', '#'], ['onclick', 'x']] as const) {
      target.setAttribute(attribute, value);
      expect(forbiddenAttributes(target), attribute).toEqual([attribute]);
      target.removeAttribute(attribute);
    }
  });
});

describe('the facts', () => {
  it('come in the view order, with the terms from the view', () => {
    const view = viewOf('opsClosedByAgent');
    const row = draw(view);
    expect(factsOf(row).map((fact) => fact.term)).toEqual(view.facts.map((fact) => fact.term));
    expect(factsOf(row).map((fact) => fact.term)).toEqual([
      OPS_COPY.termProfile,
      OPS_COPY.termAction,
      OPS_COPY.termActor,
      OPS_COPY.termStarted,
      OPS_COPY.termCompleted,
      OPS_COPY.termEvidence,
      OPS_COPY.termMission,
      OPS_COPY.termWorkPackage,
      OPS_COPY.termMode,
    ]);
  });

  it('keeps the order of a view built by hand in a reversed order (the part never sorts)', () => {
    const view = viewOf('opsClosedByAgent');
    const reversed: OpsRowView = { ...view, facts: [...view.facts].reverse() };
    expect(factsOf(draw(reversed)).map((fact) => fact.term)).toEqual([...view.facts].reverse().map((fact) => fact.term));
  });

  it('a text fact is its value in a bdi, with the full text in the title; mono facts take the mono class', () => {
    const row = draw(viewOf('opsClosedByAgent'));
    const profile = factsOf(row)[0]?.dd as HTMLElement;
    expect(profile.querySelector('bdi')?.textContent).toBe(OPS_INVOCATION_FIXTURES.opsClosedByAgent.profileId);
    expect(profile.getAttribute('title')).toBe(OPS_INVOCATION_FIXTURES.opsClosedByAgent.profileId);
    expect(profile.hasAttribute('data-ops-mono')).toBe(true);
    const mode = factsOf(row).find((fact) => fact.term === OPS_COPY.termMode)?.dd as HTMLElement;
    expect(mode.hasAttribute('data-ops-mono')).toBe(false);
    expect(mode.querySelector('bdi')?.textContent).toBe(mode.textContent?.trim());
  });

  it('a time fact is a mono time element whose datetime is the served string; an unparseable value prints as given without one', () => {
    const served = OPS_INVOCATION_FIXTURES.opsOffsetStart.startedAt;
    const view = viewOf('opsOffsetStart');
    const started = factsOf(draw(view)).find((fact) => fact.term === OPS_COPY.termStarted)?.dd as HTMLElement;
    const time = started.querySelector('time') as HTMLTimeElement;
    expect(time.getAttribute('datetime')).toBe(served);
    expect(time.hasAttribute('data-ops-mono')).toBe(true);
    expect(time.textContent?.trim()).toBe(view.facts.find((fact) => fact.term === OPS_COPY.termStarted)?.value);

    const unreadable: OpsFact = { term: OPS_COPY.termStarted, value: 'last Tuesday', mono: true, kind: 'time', datetime: null };
    const odd = draw({ ...view, facts: [unreadable] });
    const bare = odd.querySelector('time') as HTMLTimeElement;
    expect(bare.textContent?.trim()).toBe('last Tuesday');
    expect(bare.hasAttribute('datetime')).toBe(false);
  });

  it('a quiet fact is a quiet word that is not mono, and a null actor says Not shown', () => {
    const row = draw(viewOf('opsActorNull'));
    const actor = factsOf(row).find((fact) => fact.term === OPS_COPY.termActor)?.dd as HTMLElement;
    expect(actor.textContent?.trim()).toBe(OPS_COPY.quietActor);
    expect(actor.hasAttribute('data-ops-quiet')).toBe(true);
    expect(actor.hasAttribute('data-ops-mono')).toBe(false);
    const profile = factsOf(row)[0]?.dd as HTMLElement;
    expect(profile.hasAttribute('data-ops-quiet')).toBe(false);
  });

  it('draws Mission and Work Package only when the view has them (paired present and absent)', () => {
    const present = factsOf(draw(viewOf('opsOpen'))).map((fact) => fact.term);
    const absent = factsOf(draw(viewOf('opsNoMissionNoWp'))).map((fact) => fact.term);
    expect(present).toContain(OPS_COPY.termMission);
    expect(present).toContain(OPS_COPY.termWorkPackage);
    expect(absent).not.toContain(OPS_COPY.termMission);
    expect(absent).not.toContain(OPS_COPY.termWorkPackage);
    expect(absent).toHaveLength(present.length - 2);
  });

  it('a swept Op carries the Closed by fact and an agent-closed Op does not', () => {
    const swept = factsOf(draw(viewOf('opsClosedBySweep')));
    const closed = factsOf(draw(viewOf('opsClosedByAgent')));
    expect(swept.find((fact) => fact.term === OPS_COPY.termClosedBy)?.dd.textContent?.trim()).toBe('sweep');
    expect(closed.some((fact) => fact.term === OPS_COPY.termClosedBy)).toBe(false);
  });

  it('an open Op says not recorded yet for Completed and Evidence', () => {
    const facts = factsOf(draw(viewOf('opsOpen')));
    expect(facts.find((fact) => fact.term === OPS_COPY.termCompleted)?.dd.textContent?.trim()).toBe(OPS_COPY.quietCompletedOpen);
    expect(facts.find((fact) => fact.term === OPS_COPY.termEvidence)?.dd.textContent?.trim()).toBe(OPS_COPY.quietEvidenceOpen);
  });

  it('shows the raw word for an unknown mode and an unknown closer', () => {
    expect(factsOf(draw(viewOf('opsUnknownMode'))).find((fact) => fact.term === OPS_COPY.termMode)?.dd.textContent?.trim()).toBe('pairing');
    expect(factsOf(draw(viewOf('opsUnknownCloser'))).find((fact) => fact.term === OPS_COPY.termClosedBy)?.dd.textContent?.trim()).toBe('operator');
  });
});

describe('the evidence fact', () => {
  it('holds the value in a mono span with the pinned attributes, inside a bdi, and the class word as a quiet label', () => {
    const row = draw(viewOf('opsEvidenceRepoPath'));
    const evidence = row.querySelector('[data-ops-evidence]') as HTMLElement;
    expect(row.querySelectorAll('[data-ops-evidence]')).toHaveLength(1);
    expect(evidence.hasAttribute('data-evidence-value')).toBe(true);
    expect(evidence.hasAttribute('data-ops-mono')).toBe(true);
    expect(evidence.querySelector('bdi')?.textContent).toBe(OPS_INVOCATION_FIXTURES.opsEvidenceRepoPath.evidence?.value);
    const label = row.querySelector('[data-ops-evidence-class]') as HTMLElement;
    expect(label.textContent?.trim()).toBe('path');
  });

  it('the changed word and its description appear only for a redacted value (paired)', () => {
    const redacted = draw(viewOf('opsRedactedMarkers'));
    const word = redacted.querySelector('[data-ops-changed]') as HTMLElement;
    expect(word.textContent?.trim()).toBe(OPS_COPY.redactedWord);
    expect(word.getAttribute('aria-description')).toBe(OPS_COPY.redactedDescription);
    const plain = draw(viewOf('opsEvidenceRepoPath'));
    expect(plain.querySelector('[data-ops-changed]')).toBeNull();
  });

  it('a null evidence draws only the quiet word: no value span, no class label', () => {
    const row = draw(viewOf('opsEvidenceNull'));
    expect(row.querySelector('[data-ops-evidence]')).toBeNull();
    expect(row.querySelector('[data-ops-evidence-class]')).toBeNull();
    const evidence = factsOf(row).find((fact) => fact.term === OPS_COPY.termEvidence)?.dd as HTMLElement;
    expect(evidence.textContent?.trim()).toBe(OPS_COPY.quietEvidenceClosed);
    expect(evidence.hasAttribute('data-ops-quiet')).toBe(true);
  });

  it('shows an unknown evidence kind as the raw word', () => {
    const row = draw(viewOf('opsUnknownEvidenceKind'));
    expect((row.querySelector('[data-ops-evidence-class]') as HTMLElement).textContent?.trim()).toBe('screenshot');
  });
});

describe('the part is a pure function of the view', () => {
  it('draws the same markup twice for the same view, and different markup for a different one', () => {
    const view = viewOf('opsEvidenceTextRedacted');
    const strip = (row: HTMLElement): string => row.innerHTML.replace(/<!--[\s\S]*?-->/g, '');
    expect(strip(draw(view))).toBe(strip(draw(view)));
    expect(strip(draw(view))).not.toBe(strip(draw(viewOf('opsFailed'))));
  });
});
