// Local inline icons for the app shell. Gap G-08: the design library ships no icon set yet; sunset this file when it
// ships `sk-icon`. Rules: viewBox set, stroke="currentColor", fill="none", no width/height (the host sizes the icon),
// decorative (aria-hidden, not focusable).
import { html, svg } from 'lit';
import type { TemplateResult } from 'lit';
import type { ShellIcon } from './shell-types.js';

const PATHS: Record<ShellIcon, TemplateResult> = {
  missions: svg`<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>`,
  drift: svg`<path d="M4 8h10"/><path d="M4 16h16"/><path d="M14 5l3 3-3 3"/>`,
  ops: svg`<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>`,
  projects: svg`<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>`,
  pipeline: svg`<circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M8 12h8"/>`,
  'work-packages': svg`<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/>`,
  artifacts: svg`<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h6"/>`,
  file: svg`<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>`,
  folder: svg`<path d="M3 6h7l2 2h9v11H3z"/>`,
  menu: svg`<path d="M4 7h16M4 12h16M4 17h16"/>`,
  close: svg`<path d="M6 6l12 12M18 6L6 18"/>`,
  back: svg`<path d="M15 5l-7 7 7 7"/>`,
};

/** Renders the named icon as a decorative inline SVG that inherits the current text colour. */
export function renderIcon(name: ShellIcon): TemplateResult {
  return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}
