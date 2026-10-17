// The props every screen binding takes. They are all the same so the SCREENS table is a plain lookup; a binding reads
// its own slice of the snapshot and tolerates another destination's (it falls back to the element's own defaults).
import type { ShellController, ShellSnapshot } from '../../controller/shell-controller';

export interface ScreenProps {
  snapshot: ShellSnapshot;
  controller: ShellController;
}
