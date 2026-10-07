// The design library's styles-only families, adopted as constructable sheets (D-15). Imported, not copied: the library
// owns the rules, including the reduced-motion and forced-colors handling. `progress-sheet.ts` is the precedent.
import breadcrumbsCss from '@spec-kitty/styles/breadcrumbs/sk-breadcrumbs.css?inline';
import emptyStateCss from '@spec-kitty/styles/empty-state/sk-empty-state.css?inline';
import eventTimelineCss from '@spec-kitty/styles/event-timeline/sk-event-timeline.css?inline';
import factsCss from '@spec-kitty/styles/facts/sk-facts.css?inline';
import segmentedChoiceCss from '@spec-kitty/styles/segmented-choice/sk-segmented-choice.css?inline';
import workflowBoardCss from '@spec-kitty/styles/workflow-board/sk-workflow-board.css?inline';
import workflowLaneCss from '@spec-kitty/styles/workflow-lane/sk-workflow-lane.css?inline';

function sheetOf(css: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
}

export const segmentedChoiceSheet: CSSStyleSheet = sheetOf(segmentedChoiceCss);
export const workflowBoardSheet: CSSStyleSheet = sheetOf(workflowBoardCss);
export const workflowLaneSheet: CSSStyleSheet = sheetOf(workflowLaneCss);
export const breadcrumbsSheet: CSSStyleSheet = sheetOf(breadcrumbsCss);
export const emptyStateSheet: CSSStyleSheet = sheetOf(emptyStateCss);
export const factsSheet: CSSStyleSheet = sheetOf(factsCss);
export const eventTimelineSheet: CSSStyleSheet = sheetOf(eventTimelineCss);
