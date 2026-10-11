# Defaults and copy (provisional until CP-1)

New module `src/defaults/drift-copy.ts` (exported from `src/defaults/index.ts`, one line). Every word the screen draws comes from
here or from `labels`; a key the screen has never seen shows the raw value in the neutral tone. Copy asserts nothing the contract
does not (spec Gaps 3, 8, 12, 16, 17).

| Export | Shape | Content |
|---|---|---|
| `DRIFT_TITLE`, `DRIFT_SUBTITLE` | string | "Drift"; "Derived state checked against the event log and git" |
| `RESCAN_LABEL`, `RESCANNING_LABEL`, `RESCANNING_ANNOUNCEMENT` | string | "Rescan"; "Rescanning"; "Rescanning" (the one polite line when a rescan starts) |
| `LAST_SCAN_TEXT(rel)` | fn | `last scan ${rel}` |
| `FINDINGS_COUNT_TEXT(n)` | fn | "1 finding" / "N findings" |
| `SEVERITY_WORDS` | `Record<string, {word, plural, tone}>` | `error` -> "error"/"errors", danger; `warning` -> "warning"/"warnings", attention. Unknown: raw, neutral, no plural. |
| `SEVERITY_ROLLUP_TEXT(parts)` | fn | "2 errors, 3 warnings" built from the severity words present, in first-seen order; a word with no plural (unknown, or from a label hook) reads "critical: 2" |
| `ROLLUP_SHOWN_TEXT(rollup)` | fn | `Among the shown findings: ${rollup}` (the roll-up of a truncated report, FR-018) |
| `KIND_COPY` | `Record<kind, { kicker, explanation?, bySourceCode?: Record<code, string> }>` | kicker "Snapshot disagrees" / "Status file missing" / "Lane branch missing"; explanations below |
| `AUTHORITY_WORDS` | `Record<authority, string>` | `event_log` -> "The Mission's status event log"; `git` -> "Local git branches" |
| `DERIVED_SIDE_WORDS` | `Record<side, string>` | `status_json` -> "status.json (the status snapshot)"; `lanes_json` -> "lanes.json (the lane manifest)" |
| `REMEDY_COMMANDS` | `Record<remedy, (slug) => string>` | `materialize_status` -> `spec-kitty agent status materialize --mission ${slug}` |
| `NOT_PRESENT_WORD` | string | "not present" |
| `LANE_TABLE_HEADERS` | tuple | "Work Package", "status.json", "Event log" |
| `CORRUPT_JSON_NOTE` | string | "The snapshot is not a valid JSON object, so there are no lanes to compare." (keyed by `sourceCode`, see `LANE_NOTES`) |
| `UNKNOWN_MISSION_COMMAND_NOTE` | string | "This Mission was not found in the Missions list, so no command is shown." |
| `COPY_LABEL`, `COPY_ACCESSIBLE_LABEL`, `COPY_RESULT_TEXT` | string / record | "Copy"; "Copy command" (the accessible name, starting with the visible word); `copied` -> "Copied"; `manual` -> "Copy it with your keyboard: the command is selected." |
| `DRIFT_AUTHORITY_TITLE`, `DRIFT_FACTS_TITLE`, `DRIFT_RESOLUTION_TITLE` (prefixed: `FACTS_TITLE` exists in #5's `wp-copy.ts`) | string | "Authoritative side"; "Facts"; "Suggested resolution" (the eyebrows of the detail panels and region, CP-1 F-6) |
| `DRIFT_FACT_MISSION`, `DRIFT_FACT_FILE`, `DRIFT_FACT_DERIVED_SIDE` | string | "Mission"; "File"; "Derived side" (the Facts rows) |
| `LANE_TABLE_LABEL`, `LANE_TABLE_SCROLLER_LABEL` | string | "Status lane comparison"; "Status lane comparison, scrollable" (the table's name, and the name of its scroller while it overflows; C-009) |
| `COPY_MANUAL_FALLBACK` | string | "Select the command and copy it with your keyboard." Shown instead of the `manual` words when the read-back of the selection differs from the command (S5, A-7); it never says the command is selected |
| `CLEAN_HEADING`, `CLEAN_BODY` | string | "No drift found"; "The last scan found no disagreement between the status files and the event log, and no missing lane branch it could check." |
| `TRUNCATION_TEXT(n)` | fn | `Showing the first ${n} findings.` |
| `CHOOSE_HEADING`, `STALE_SELECTION_NOTE` | string | "Choose a finding"; "The selected finding is not in this scan." |
| `FINDINGS_LIST_LABEL` | string | "Drift findings" (the accessible name of the finding listbox) |
| `REFUSAL_WORDS`, `REFUSAL_GENERIC`, `RETRY_LABEL` | record / string | `drift_scan_unreadable` -> "The scan could not read a Mission, so no report is shown."; generic "The drift scan could not be loaded."; "Try again" |
| `DRIFT_NOT_FOUND_HEADING/BODY` (prefixed: the unprefixed names already exist in #5's `wp-copy.ts`), `RETURN_TO_MISSIONS_LABEL` | string | "Mission not found"; "No Mission has this identity."; "Return to Missions" |
| `DRIFT_LOADING_LABEL` (prefixed: `LOADING_LABEL` already exists in `lifecycle.ts`), `RESCANNED_TEXT` | string / fn | "Loading drift scan"; announcement strings (live region) |
| `RESCAN_UNCHANGED_ANNOUNCEMENT` | string | "Rescan complete: no changes" (the one polite line that ends a rescan whose report, state and words are what they were when it started; every state; said in the update where `rescanning` falls) |

## Explanations (by kind, overridden by source code)

- `snapshot_disagrees_with_event_log`: "status.json differs from what the event log gives when it is replayed at the snapshot's own generation."
  - `SNAPSHOT_DRIFT_PROVENANCE`: "Only provenance fields differ; the lanes agree."
  - `SNAPSHOT_DRIFT_TERMINAL`: "The files differ and every work package is done."
  - `CORRUPT_JSON`: "status.json could not be read as a JSON object."
- `snapshot_or_event_log_missing`: "One of status.json and status.events.jsonl is missing. The event log is the record that decides." (never says which file is missing, Gap 16)
- `lane_branch_missing`: "A lane or Mission branch the lane manifest relies on has no local branch. No branch is created or changed from this view." (never names a branch)

## `LabelHooks` additions (IC-02, additive, optional)

`kind?(kind): string | undefined` (kicker), `severity?(sev): StateBadge | undefined`, `authority?(a): string | undefined`,
`derivedSide?(s): string | undefined`, `refusal?(code): string | undefined`. The existing `lane` and `time` hooks serve the lane
table and the last-scan time. A hook that returns undefined falls through to the defaults table, then to the raw value.

## Data-driven gate scope for these words (IC-02)

Read from the vendored schemas: the members of the enums `DriftKind`, `DriftAuthority`, `DriftSide`, `DriftRemedy` and `DriftRefusalCode`.
`sourceCode` has NO enum schema (`DriftFinding.sourceCode` is a string with a pattern; the four values exist only in its description), so
the gate holds the four codes in an explicit constant, guarded by a self-test that fails when a code in the constant is absent from the
`DriftFinding.sourceCode` description in the vendored file (and when the description names a code the constant lacks). Underscored members (`snapshot_disagrees_with_event_log`, `event_log`, `status_json`, `materialize_status`, ...)
and the four capitalised source codes are matched as literals outside `defaults/`. NOT gated: `error`, `warning`, `git` (`error` is a
view-state word and a severity word; `git` is an everyday word), the same collision class as the verdict `approved`. They are
covered by foreign-value tests and the reviewer self-check list, and the limitation is written into the gate header comment.
