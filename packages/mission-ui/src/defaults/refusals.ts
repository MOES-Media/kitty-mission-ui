// Detail refusal copy (provisional until CP-1). The input is the `detailRefusalCode` property; a code that is not a key shows raw.
export const DETAIL_REFUSAL_WORDS: Readonly<Record<string, string>> = {
  not_found: 'The Work Package detail was not found.',
  source_unreadable: 'A source of the Work Package detail could not be read.',
};

/** Used when the detail is refused and the host gave no code: the screen never claims a code the host did not give. */
export const DETAIL_REFUSAL_GENERIC = 'The Work Package detail could not be loaded.';
export const DETAIL_REFUSAL_HEADING = 'Work Package detail unavailable';
export const DETAIL_RETRY_LABEL = 'Try again';
export const DETAIL_LOADING_LABEL = 'Loading Work Package detail';
