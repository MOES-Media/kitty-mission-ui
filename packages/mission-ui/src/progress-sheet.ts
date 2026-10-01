// The library's own `.sk-progress` stylesheet (@spec-kitty/styles), adopted by the shell's shadow root. Imported, not
// copied: the library owns the rules, including the reduced-motion and forced-colors handling of the sweep.
import progressCss from '@spec-kitty/styles/progress/sk-progress.css?inline';

export const progressSheet: CSSStyleSheet = new CSSStyleSheet();
progressSheet.replaceSync(progressCss);
