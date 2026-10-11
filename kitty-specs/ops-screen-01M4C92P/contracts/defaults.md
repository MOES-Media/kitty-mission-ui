# Contract: `defaults/ops-copy.ts` (English defaults; every string overridable through `labels`)

| Key | Default |
|---|---|
| header eyebrow / title / badge | "Project" / "Ops" / "Read only" |
| header supporting line | `<project name><separator><tail>`: separator " · " (`headerSeparator`) and tail "invocation records" (`headerSupportingTail`), both overridable through `labels.copy`; host-neutral, so no "local" (DO-3); no line when the project is null or its name is empty |
| source notice | "Read from this project's Ops directory and sorted by start time, newest first. Viewing Ops never invokes an agent." |
| section eyebrow / heading | "Invocation records" / "Newest records" |
| count text | "{loaded} of {total}"; equal: "{total} records"; one record: "{total} record" (`countAllOne`) |
| profile fact | "Profile: {profile}" |
| outcome words, tones | done success; failed danger; abandoned attention |
| status words, tones | open neutral ("open"); closed neutral ("closed") |
| closer words | doctor_sweep "sweep"; agent "agent" (not drawn) |
| mode words | task_execution "task execution"; advisory "advisory"; mission_step "mission step"; query "query" |
| evidence class words | repo_path "path"; url "address"; text "text" |
| facts terms | Profile, Action, Actor, Started, Completed, Evidence, Mission, Work Package, Mode, Closed by |
| quiet words | evidence closed "Not recorded"; evidence open "Not recorded yet"; actor "Not shown"; completed open "Not recorded yet"; completed closed "Not recorded" (`quietCompletedClosed`; an unknown status falls back to it) |
| redacted word / description | "changed" / "Host paths and e-mail addresses are replaced, or the text was cut." |
| skipped | "{n} record in this project could not be read and is not shown." / "{n} records in this project could not be read and are not shown." |
| load more | "Load more" |
| load-more error / retry | "The next records could not be loaded." / "Try again" |
| refused cursor / action | "This position in the list is no longer valid." / "Refresh from the newest" |
| empty heading / body | "No invocation records" / "No invocation records are available for this project." |
| empty, profile | "No records for this profile." (a full sentence; the profile code is drawn directly after it, and the skipped sentence follows the code) |
| empty, skipped | not a wording of its own (CP-1): the skipped sentence ("in this project" wording) is shown whenever `skippedCount` is above 0, after the headline in one paragraph without a profile, and as its own paragraph AFTER the profile code with a profile (two sentences, the profile between them; OP-21a); the unused `emptySkipped` key was removed in the WP07 fix round |
| loading label / body | "Reading invocation records" / "Reading the project's Ops records. No agent is invoked." |
| error heading / body | "Invocation records unavailable" / "The Ops records could not be read. No invocation rows are shown." |
| error by code | ops_unreadable: the body above; unknown or null: the same generic body (refusal copy stays generic for every code, the 2026-10-11 ruling; the table is injectable in `opsErrorText`) |
| announcements | loading "Loading invocation records"; loaded "{loaded} of {total} records loaded" (one: `announceLoadedOne` "{loaded} of {total} record loaded"); more "{n} more records loaded" (one: `announceMoreOne` "{n} more record loaded"); Load more started "Loading more records" (`announceLoadingMore`, announced once when Load more goes busy, before the rows arrive) |
| months | Jan..Dec |
| constants | `CURSOR_REFUSAL_CODE`, `ERROR_RETRY_LABEL` |

Final sentences are tuned at the operator's Storybook review.
