// The single place custom elements are registered. Element modules do not self-register, so importing one (from a
// test, a story or another package) never throws on a duplicate definition; the guard makes this entry idempotent.
import { SkMissionSample } from './elements/sk-mission-sample/sk-mission-sample.js';

if (!customElements.get('sk-mission-sample')) {
  customElements.define('sk-mission-sample', SkMissionSample);
}

export { SkMissionSample };
export type { SkMissionOpenDetail, SkMissionRetryDetail } from './elements/sk-mission-sample/sk-mission-sample.js';
export type { MissionSummary, ViewState } from './view-state.js';
