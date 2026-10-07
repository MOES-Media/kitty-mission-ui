R1 TESTS (debugger-debbie), 4 findings (probe-proven on a copy):
- TESTS-001 sev3: removing tierObserver.disconnect() leaves 161/161 green. Fix: a detach test (remove the screen, change the tier, no data-shell-mobile) plus a re-parent to a second shell test.
- TESTS-002 sev3: the keyed repeat() in chain-parts, files-parts and work-parts are unprotected (index key or .map gives 161/161 green); only history is proven. Fix: front-insertion identity tests for subtasks, files and chain, plus duplicate dependency-id and duplicate pattern cases pinning the intended output.
- TESTS-003 sev2: the tier follow test uses fixed 200 ms sleeps. Fix: expect.poll/vi.waitFor.
- TESTS-004 sev1: `ran` counters and a 200 ms median guard are non-assertions. Fix: drop or relax them.
Clean: no it.fails/skip/only/todo; focus and announcement reverts are well caught; S14.3/14.4 have positive and negative fixtures (mutation probe incomplete).
