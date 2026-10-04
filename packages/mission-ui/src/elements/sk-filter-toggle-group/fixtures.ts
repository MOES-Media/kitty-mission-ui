import { FILTER_GROUP_LABEL, FILTERS } from '../../defaults/index.js';
import type { FilterOption } from '../../logic/index.js';

// The group knows no vocabulary: the default options come from the defaults module, the rest is synthetic.
export const groupLabel: string = FILTER_GROUP_LABEL;

export const defaultOptions: FilterOption[] = FILTERS.map(({ id, label }) => ({ id, label }));

// Labels long enough to wrap inside one button and to push the group onto several rows.
export const longLabelOptions: FilterOption[] = [
  { id: 'first', label: 'Missions waiting for a decision from the maintainers of the shared repository' },
  { id: 'second', label: 'Missions whose work packages were reassigned to a different implementation agent' },
  { id: 'third', label: 'Supercalifragilisticexpialidocious-reconciliation-of-cross-repository-release-readiness' },
];

// Options that match no default: proves the element renders and presses whatever it is given.
export const syntheticOptions: FilterOption[] = [
  { id: 'x', label: 'Option X' },
  { id: 'y', label: 'Option Y' },
  { id: 'z', label: 'Option Z' },
];
