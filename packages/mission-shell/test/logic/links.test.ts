import { describe, expect, it } from 'vitest';
import { createFixtureClient } from '../../src/client/fixture';
import { createShellController } from '../../src/controller/shell-controller';
import { ALLOWED_EXTERNAL_SCHEMES, isAllowedExternalHref } from '../../src/core/links';
import type { ShellHost } from '../../src/core/host';
import { createFakeScheduler, flushMicrotasks } from '../support/fake-scheduler';

const PASSING = ['https://example.test/x', 'HTTPS://example.test/x', 'http://example.test', 'mailto:noreply@example.test'];

const NEGATIVES = [
  'httpx://example.test',
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'data:text/html,x',
  'file:///etc/hosts',
  'vbscript:msgbox(1)',
  ' https://example.test',
  '\thttps://example.test',
  '//evil.example',
  'relative/path.md',
  '',
];

describe('the link scheme (FR-013)', () => {
  it('names exactly http, https and mailto', () => {
    expect([...ALLOWED_EXTERNAL_SCHEMES]).toEqual(['http', 'https', 'mailto']);
  });

  it('tables the pure check over the same list', () => {
    for (const href of PASSING) expect(isAllowedExternalHref(href), href).toBe(true);
    for (const href of NEGATIVES) expect(isAllowedExternalHref(href), JSON.stringify(href)).toBe(false);
  });

  it.each(['desktop', 'dashboard'] as const)('reaches the host only for an allowed scheme on the %s, with the positive control in the same test', async (mode) => {
    const fake = createFakeScheduler();
    const opened: string[] = [];
    const host: ShellHost = { openExternalLink: (href) => void opened.push(href) };
    const controller = createShellController({ client: createFixtureClient({ scheduler: fake }), mode, route: '/missions', scheduler: fake, host });
    const send = async (href: string): Promise<void> => {
      await controller.intent('sk-artifact-screen', 'sk-open-link', { href });
      await flushMicrotasks();
    };

    await send(PASSING[0] ?? '');
    expect(opened).toEqual(['https://example.test/x']); // positive control: the recording host is wired

    let count = opened.length;
    for (const href of PASSING.slice(1)) {
      await send(href);
      expect(opened.length, href).toBe(count + 1);
      expect(opened.at(-1)).toBe(href); // passed unchanged, not lower-cased
      count = opened.length;
    }
    const before = controller.snapshot();
    for (const href of NEGATIVES) {
      await send(href);
      expect(opened.length, JSON.stringify(href)).toBe(count);
    }
    expect(controller.snapshot()).toEqual(before); // no state change either
    controller.destroy();
  });
});
