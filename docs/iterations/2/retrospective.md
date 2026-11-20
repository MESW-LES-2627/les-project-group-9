# Retrospective - Iteration 2

## Did Well

- **Features were merged with automated tests.** The PRs for preferred colours and materials (US-067, #161), preference editing, export and deletion (US-068 #165, US-071 #166), restricted customization setup (US-025, #160), front-camera try-on and the multi-piece look (US-017/US-018 #163, US-021 #170) and verified-buyer ratings (US-058, #172) all added or changed tests. Coverage thresholds and PR coverage reports were added to CI (TASK-005, #167).
- **Review feedback led to focused fixes with regression tests.** For example, the PR #172 review found that the order page reloaded after a rating was saved and dropped the confirmation. The fix was limited to that behaviour and is covered by `tests/components/account/OrderRatingsRevalidation.test.tsx`.
- **Story boundaries were kept explicit.** US-058 records which behaviour belongs to later stories (comments US-059, public display US-060, sorting/filtering US-061, moderation US-062), and the change of entry point to the order page is documented as an owner-approved clarification rather than silently changing the story.
- **Verification layers were recorded separately.** The ratings documentation distinguishes automated tests with fakes, manual checks on the branch deployment and checks still to run against a real store, instead of presenting mocked tests as proof of the live integration.

## Do Differently

- **Documentation drifted behind the implementation.** Some PRs updated `docs/` (#160, #163, #165, #170, #172) and others did not (#161, #166, #167). The audit at the end of the iteration found that the iteration 2 vision and MVP were copies of iteration 1 (old spelling, old counts, claims of unrestricted customization and allergen safety), that the README still reported a variable as missing from `.env.example`, and that the testing guide did not mention the coverage step. These were corrected on `docs/iter-2`.
- **Issue state and delivered code diverged.** Some open stories already have working code (US-019 multi-piece try-on, US-026 engraving), and a closed story still has an open bug (US-001 with BUG-001, the fallback Trending link). The review suggests checking issue state against the code when closing or reviewing stories.
- **Much of the integration happened at the end of the iteration.** Of the 14 PRs merged after the `iter-1` tag date (2026-11-06), 8 were merged on 2026-11-19 and 2026-11-20 (#160, #163, #165, #166, #167, #169, #170, #172), and the documentation branch fell 71 commits behind `main` before it was updated. The review suggests this left little time for cross-feature checks before the iteration closed; the team should confirm whether that matches their experience.
- **CI does not check everything it appears to.** The try-on gate E2E test is skipped in CI, the uploaded Playwright report is probably empty, CI does not run `npm run build`, and the Oxygen workflow deploys every push without waiting for the tests (see [architecture.md, known issues 13 and 18](../../architecture.md#known-issues)).

## Puzzles

- **US-058 storage uniqueness.** Issue #79 is closed, but the latest documentation ([architecture.md, staging verification](../../architecture.md#staging-verification), dated 2026-11-20) still lists the staging checks for storage uniqueness and concurrency (A1, A2, B4) as pending acceptance checks. No later result is recorded in the repository. **Needs confirmation:** were the checks run, and what was the outcome?
- **Iteration commitment.** The stories committed to iteration 2 are tracked in the GitHub Project's `Iteration` field, which could not be read for this draft. Which stories were committed, and which of them meet the Definition of Done, needs to be confirmed from the board.
- **Deployment evidence.** The production and staging links for this iteration are not recorded in [CLAIM.md](./CLAIM.md) yet.

## Lessons learned

- Tests against fakes do not show how the live platform behaves. In US-058, the first real
  browser test found two defects the automated tests had not caught: Admin API calls failing
  in the Workers runtime ("Illegal invocation") and genuine submissions rejected as
  cross-origin behind the TLS-terminating dev tunnel.
- A closed issue is not the same as a met Definition of Done; recording the verification
  status next to the code (as the ratings documentation does) makes the difference visible.
- Copying the previous iteration's documents as a starting point is quick, but the copies
  need a review against the code and the issues before the iteration closes.
- Backlog scope (milestones), iteration commitment (Project field) and delivered work (code
  on `main`) are recorded in different places and are easier to report when kept apart.

## Proposed actions for the next iteration

| Proposed action | Rationale | Owner | Target |
| --- | --- | --- | --- |
| Check `docs/` and the iteration documents as part of each feature PR review, and once more before tagging the iteration | Documentation drifted behind several merged features | To be agreed | To be agreed |
| When closing a story, compare the issue with the code and list any DoD items that are still open (for example staging checks) | Issue state and delivered code diverged (US-019, US-026, US-001/BUG-001, US-058) | To be agreed | To be agreed |
| Merge features into `main` earlier and in smaller steps where possible | 8 of 14 PRs merged in the last two days before this draft | To be agreed | To be agreed |
| Fix the CI gaps: set `PUBLIC_STORE_DOMAIN` for the E2E step, upload a usable Playwright report, and consider running `npm run build` in CI | The try-on gate test is skipped and failure reports are probably empty | To be agreed | To be agreed |
| Run and record the US-058 staging storage checks, or record the decision if they are not run | The closed issue and the documented acceptance checks do not match | To be agreed | To be agreed |
| Record the iteration commitment and the deployment links in the iteration documents | Neither could be verified from the repository | To be agreed | To be agreed |

## Board at the end of Sprint 2

<!-- Add ./board.png (the board at the end of the sprint) and reference it here: ![board](./board.png) -->

Not added yet.
