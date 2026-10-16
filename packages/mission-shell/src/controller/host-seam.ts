// The one place the controller calls a host member (WP03). WP04 replaces `ControllerHost` and `copyViaHost` with the
// `src/core/host.ts` wrapper in this one spot. Only the host call is guarded: a missing member, a throw or a rejection
// is the member's fallback; nothing of the controller's own is caught (NFR-007).

/** The host members this package of the controller calls. */
export interface ControllerHost {
  copyText?(text: string): Promise<'copied' | 'manual'>;
}

/** `host.copyText(text)`, or `'manual'` when the member is absent, throws or rejects (FR-012). */
export async function copyViaHost(host: ControllerHost, text: string): Promise<'copied' | 'manual'> {
  try {
    const answer = await host.copyText?.(text);
    return answer === 'copied' ? 'copied' : 'manual';
  } catch {
    return 'manual';
  }
}
