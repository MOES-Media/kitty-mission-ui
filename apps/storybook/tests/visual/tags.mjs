// Story tags that steer the visual harness: `vw-<n>` the viewport width, `vh-<n>` the viewport height, `tab-<n>` the number
// of Tab presses. A story with no `vh-<n>` keeps the harness default height.
export const DEFAULT_HEIGHT = 800;

/** The number of the first tag named `<prefix>-<digits>`, or undefined. */
export function tagNumber(tags, prefix) {
  const tag = (tags ?? []).find((t) => new RegExp(`^${prefix}-\\d+$`).test(t));
  return tag === undefined ? undefined : Number(tag.slice(prefix.length + 1));
}

/** The viewport to set before a story, or undefined when neither tag is present (the project default applies). */
export function viewportFor(tags, currentWidth) {
  const width = tagNumber(tags, 'vw');
  const height = tagNumber(tags, 'vh');
  if (width === undefined && height === undefined) return undefined;
  return { width: width ?? currentWidth, height: height ?? DEFAULT_HEIGHT };
}
