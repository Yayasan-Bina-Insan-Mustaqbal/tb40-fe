# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the TB40 (Tafsir Bakat 40) assessment application. The following changes were made:

- **`src/routes/__root.tsx`** — Replaced the raw `posthog.init()` inside a `useEffect` with `PostHogProvider` from `posthog-js/react`. The provider wraps the entire app shell, handles SSR-safe initialization, enables exception capture, and routes all telemetry through the `/ingest` reverse proxy.
- **`vite.config.ts`** — Added EU PostHog reverse proxy rules for `/ingest`, `/ingest/static`, and `/ingest/array` to improve reliability and avoid ad-blocker interference.
- **`.env`** — Added `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` environment variables.
- **`src/routes/index.tsx`** — Added `registration_form_error` event capture when the registration form fails validation (missing fields or invalid age).
- **`src/routes/test.tsx`** — Added `assessment_reset_confirmed` event capture when the user confirms deleting all their data and restarting from scratch.
- **`src/routes/result.tsx`** — Added `upgrade_to_precision_clicked` event capture when a v0.2 adaptive result user clicks the upgrade CTA; added `share_link_copied` event capture when the user copies the share URL.

| Event | Description | File |
|---|---|---|
| `registration_completed` | User successfully submitted the registration form and began the assessment | `src/routes/index.tsx` |
| `registration_form_error` | Registration form submission failed due to client-side validation | `src/routes/index.tsx` |
| `assessment_step_completed` | User completed an adaptive assessment tier step (tier_1 or tier_2) | `src/routes/test.tsx` |
| `assessment_submitted` | User submitted the full assessment (precision or adaptive mode) | `src/routes/test.tsx` |
| `assessment_reset_confirmed` | User confirmed the destructive reset to restart the assessment from scratch | `src/routes/test.tsx` |
| `result_viewed` | User landed on the result page (locally stored or from a shared link) | `src/routes/result.tsx` |
| `share_button_clicked` | User opened the share modal on the result page | `src/routes/result.tsx` |
| `share_link_copied` | User copied the shareable result link to their clipboard | `src/routes/result.tsx` |
| `upgrade_to_precision_clicked` | User on the v0.2 adaptive result clicked the upgrade CTA to start the 40-question assessment | `src/routes/result.tsx` |
| `pdf_printed` | User triggered the browser print/PDF dialog from the result page | `src/routes/result.tsx` |

## Next steps

We've built a dashboard and five insights to keep an eye on key user behaviors:

- **Dashboard**: [Analytics basics (wizard)](https://eu.posthog.com/project/208918/dashboard/771422)
- **Assessment Completion Funnel**: [Registration → Assessment → Result](https://eu.posthog.com/project/208918/insights/o5Aa3JIa)
- **Daily Registrations**: [User growth trend](https://eu.posthog.com/project/208918/insights/jICtxmOf)
- **Assessment Submissions by Mode**: [Precision vs Adaptive](https://eu.posthog.com/project/208918/insights/vk6sLagS)
- **Result Sharing Funnel**: [Result viewed → Share clicked → Link copied](https://eu.posthog.com/project/208918/insights/qH0j7X8T)
- **Assessment Abandonment (Reset)**: [Reset confirmations over time](https://eu.posthog.com/project/208918/insights/vNmeq7ee)

## Verify before merging

- [ ] Run a full production build (`pnpm build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` to `.env.example` and any deployment scripts so collaborators and CI environments know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — currently `posthog.identify()` only fires on fresh registration. A user who returns via a saved localStorage session starts on an anonymous ID until they re-register.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-tanstack-start/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
