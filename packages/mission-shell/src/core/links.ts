// The link-scheme check behind `sk-open-link` (FR-013, contracts/intent-map.md "The link scheme"). Pure: no imports.

/** The schemes the shell lets reach the host. */
export const ALLOWED_EXTERNAL_SCHEMES = ['http', 'https', 'mailto'] as const;

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

/**
 * True exactly when the scheme of `href` is `http`, `https` or `mailto`. The scheme is read at position 0 with no
 * trimming (a leading space or tab is no scheme), lower-cased, and compared for equality, so `HTTPS:` passes and
 * `httpx:`, `javascript:`, `//evil.example`, relative links and the empty string do not.
 */
export function isAllowedExternalHref(href: string): boolean {
  const match = SCHEME.exec(href);
  if (match === null) return false;
  const scheme = (match[1] ?? '').toLowerCase();
  return ALLOWED_EXTERNAL_SCHEMES.some((allowed) => allowed === scheme);
}
