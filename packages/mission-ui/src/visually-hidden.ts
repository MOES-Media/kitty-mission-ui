import { css } from 'lit';

/**
 * The one "visually hidden" declaration block: the element stays in the accessibility tree and takes no room. Every
 * screen-reader-only text of this package (the search label, the result-count live region, the board heading, the lane
 * counts and the phase statuses) interpolates it into its own selector, so the five cannot drift apart. Library gap:
 * a `sk-visually-hidden` utility in the design library would replace it.
 */
export const visuallyHidden = css`
  position: absolute;
  inline-size: 0;
  block-size: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
`;
