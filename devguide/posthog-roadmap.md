# PostHog Integration Roadmap

## Status: In Progress

---

## Phase 1: Verification (Do First)

- [ ] Verify all 10 events are firing in PostHog Live Events
- [ ] Confirm dashboard shows data after a few test runs
- [ ] Test the reverse proxy (`/ingest`) is working (check Network tab)
- [ ] Verify EU region data residency (events should appear at eu.posthog.com)

---

## Phase 2: Fix Known Issues

### 2.1 Returning User Identification
The wizard noted `posthog.identify()` only fires on fresh registration.
A returning user via saved localStorage starts on an anonymous ID.

**Fix:**
```ts
// In __root.tsx or index.tsx, on app load:
const saved = localStorage.getItem('tb40_umum')
if (saved) {
  const { nickName, fullName, usia } = JSON.parse(saved)
  posthog.identify(nickName, { name: fullName, age: usia })
}
```

- [ ] Add returning user `identify` call
- [ ] Test: close browser, reopen, check PostHog person profile merges

### 2.2 Source Map Upload for Error Tracking
Production stack traces will be minified without source maps.

- [ ] Add `posthog-cli sourcemap` to CI/CD pipeline
- [ ] Or configure Vite to upload source maps on build

---

## Phase 3: Analytics & Insights

### 3.1 Assessment Completion Funnel
Track the full user journey:
```
Registration → Tier 1 → Tier 2 → Tier 3 → Result → Share
```
- [ ] Create funnel in PostHog dashboard
- [ ] Identify biggest drop-off point
- [ ] Set up alert if completion rate drops below threshold

### 3.2 Time-to-Complete Analysis
- [ ] Add `assessment_started` event (timestamp when user enters test page)
- [ ] Calculate time from start to submit
- [ ] Compare v0.1 (precision) vs v0.2 (adaptive) completion times

### 3.3 Result Sharing Viral Loop
- [ ] Track `result_viewed` with `shared: true` to measure viral coefficient
- [ ] Calculate: shared views / total views = viral multiplier
- [ ] Goal: > 0.3 (30% of results bring new users)

### 3.4 Cohort Retention
- [ ] Create cohort: users who completed assessment this week
- [ ] Track return rate (users who come back to retake)
- [ ] Measure if shared links bring repeat visitors

---

## Phase 4: Feature Flags & Experiments

### 4.1 Assessment Version Toggle
Use feature flags to gradually roll out v0.2 to users:
```ts
import { useFeatureFlagEnabled } from 'posthog-js/react'

const showV02 = useFeatureFlagEnabled('v0.2-assessment')
```
- [ ] Create flag `v0.2-assessment` in PostHog
- [ ] Start with 10% rollout, monitor completion rate
- [ ] Gradually increase to 100% if metrics hold

### 4.2 A/B Test: Short vs Long Assessment
Statistically test which version performs better:
- **Control:** v0.1 (40 questions, precision mode)
- **Variant:** v0.2 (tiered, adaptive mode)
- **Primary metric:** Assessment completion rate
- **Secondary metrics:** Share rate, time-to-complete, result accuracy (if measurable)

- [ ] Set up experiment in PostHog Experiments
- [ ] Run for 2 weeks minimum
- [ ] Analyze results, pick winner

### 4.3 UI Experiments
- [ ] Test different registration form layouts
- [ ] Test CTA button text ("Mulai Tes" vs "Kenali Dirimu")
- [ ] Test result page share prompt placement

---

## Phase 5: Advanced Features

### 5.1 Session Replay 🔥
Watch real users take the assessment:
- [ ] Enable Session Replay in PostHog settings
- [ ] Review 10 sessions weekly to identify UX issues
- [ ] Look for: hesitation points, rage clicks, confusion areas
- [ ] Filter by: completed vs abandoned assessments

### 5.2 Heatmaps
Visual click maps of each page:
- [ ] Enable heatmaps for landing page
- [ ] Enable heatmaps for assessment pages
- [ ] Enable heatmaps for result page
- [ ] Use data to optimize button placement and layout

### 5.3 Error Tracking & Alerting
- [ ] Enable exception autocapture in PostHog
- [ ] Set up alert for spike in JS errors
- [ ] Create dashboard panel for error frequency
- [ ] Test: trigger a known error, verify it appears

### 5.4 User Paths (Navigation Analysis)
See actual user navigation patterns:
- [ ] Create path analysis: Landing → ? → Result
- [ ] Identify unexpected navigation patterns
- [ ] Find dead ends or loops users get stuck in

---

## Phase 6: Reporting & Automation

### 6.1 Weekly Analytics Email
- [ ] Set up PostHog subscription for dashboard
- [ ] Send weekly summary to team email
- [ ] Include: new registrations, completions, shares, top errors

### 6.2 Slack/Discord Integration
- [ ] Connect PostHog to Slack/Discord
- [ ] Alert on: error spikes, completion rate drops, viral moments
- [ ] Daily digest of key metrics

### 6.3 Custom SQL Queries (HogQL)
Advanced queries for deeper insights:
```sql
-- Average assessment completion time by version
SELECT 
  properties.test_mode,
  AVG(toUnixTimestamp(timestamp) - toUnixTimestamp(
    (SELECT timestamp FROM events WHERE event = 'assessment_step_completed' 
     AND properties.tier = 'tier_1' AND distinct_id = e.distinct_id LIMIT 1)
  )) as avg_seconds
FROM events e
WHERE event = 'assessment_submitted'
GROUP BY properties.test_mode
```
- [ ] Create HogQL queries for custom metrics
- [ ] Save as insights for reuse
- [ ] Build advanced dashboard panels

---

## PostHog MCP Server

Optional: Connect PostHog MCP to query data from chat.
```bash
npx @posthog/wizard@latest mcp add
```
- [ ] Install MCP for Claude Code (or VS Code)
- [ ] Test: ask "how many users completed the assessment this week?"
- [ ] Use for quick ad-hoc queries without opening dashboard

---

## Quick Reference

| Event | When | Key Properties |
|-------|------|----------------|
| `registration_completed` | Form submitted | age, test_mode, api_type |
| `registration_form_error` | Validation fail | — |
| `assessment_step_completed` | Tier finished | tier, introvert/extrovert or ranking |
| `assessment_submitted` | Full submit | mode (precision/adaptive) |
| `assessment_reset_confirmed` | User resets | — |
| `result_viewed` | Result page load | shared, test_mode |
| `share_button_clicked` | Share modal open | — |
| `share_link_copied` | Link copied | — |
| `upgrade_to_precision_clicked` | v0.2 → v0.1 CTA | — |
| `pdf_printed` | Print dialog | — |

---

## Dashboard Links

- [Analytics basics (wizard)](https://eu.posthog.com/project/208918/dashboard/771422)
- [Assessment Completion Funnel](https://eu.posthog.com/project/208918/insights/o5Aa3JIa)
- [Daily Registrations](https://eu.posthog.com/project/208918/insights/jICtxmOf)
- [Assessment Submissions by Mode](https://eu.posthog.com/project/208918/insights/vk6sLagS)
- [Result Sharing Funnel](https://eu.posthog.com/project/208918/insights/qH0j7X8T)
- [Assessment Abandonment (Reset)](https://eu.posthog.com/project/208918/insights/vNmeq7ee)

---

## Notes

- `.env` vars: `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN`, `VITE_PUBLIC_POSTHOG_HOST`
- Reverse proxy: `/ingest` path in vite.config.ts
- Provider: `PostHogProvider` from `posthog-js/react` in `__root.tsx`
- Region: EU (eu.posthog.com)
- Source: PostHog Wizard v2.30.0
