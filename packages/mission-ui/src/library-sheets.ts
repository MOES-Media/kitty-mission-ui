// The design library's styles-only families, adopted as constructable sheets (D-15). Imported, not copied: the library
// owns the rules, including the reduced-motion and forced-colors handling. `progress-sheet.ts` is the precedent.
import breadcrumbsCss from '@spec-kitty/styles/breadcrumbs/sk-breadcrumbs.css?inline';
import dataTableCss from '@spec-kitty/styles/data-table/sk-data-table.css?inline';
import emptyStateCss from '@spec-kitty/styles/empty-state/sk-empty-state.css?inline';
import eventTimelineCss from '@spec-kitty/styles/event-timeline/sk-event-timeline.css?inline';
import factsCss from '@spec-kitty/styles/facts/sk-facts.css?inline';
import pillTagCss from '@spec-kitty/styles/pill-tag/sk-pill-tag.css?inline';
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
/**
 * The pill-tag family for a raw `button.sk-pill-tag` (E-29). The library's sheet also styles the `sk-pill-tag` ELEMENT host
 * (`:host { display: inline-flex }`); adopted into a screen's shadow root that rule would restyle the screen's own host, so the host
 * rules are dropped and only the class rules stay.
 */
function classRulesOf(css: string): CSSStyleSheet {
  const sheet = sheetOf(css);
  for (let i = sheet.cssRules.length - 1; i >= 0; i -= 1) {
    const rule = sheet.cssRules[i];
    if (rule instanceof CSSStyleRule && rule.selectorText.includes(':host')) sheet.deleteRule(i);
  }
  return sheet;
}

export const pillTagSheet: CSSStyleSheet = classRulesOf(pillTagCss);
export const dataTableSheet: CSSStyleSheet = sheetOf(dataTableCss);
