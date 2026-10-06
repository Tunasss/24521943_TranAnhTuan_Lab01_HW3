# TASK_DECOMPOSITION_HW3: Resilient Event Hub & AI Failure Audit

Course: Web Application Development, Lab 1: Modern Web Foundations & AI-Assisted Engineering
Assignment: HW3. HW1 is in [TASK_DECOMPOSITION.md](TASK_DECOMPOSITION.md) and HW2 in [TASK_DECOMPOSITION_HW2.md](TASK_DECOMPOSITION_HW2.md).

## 0. Overview

### Goal
A resilient event landing page built in three slices (drift-free countdown, state-machine form, double-submit prevention and input sanitization), plus a mandatory `AI_FAILURE_AUDIT.md` (15% of the grade) documenting three AI-induced defects I actually found during review.

### Rules I must follow
- **Three slices**, each with its own atomic commit(s): Slice 1 countdown, Slice 2 state-machine form, Slice 3 double-submit prevention and sanitization.
- **Git audit rule:** at least **5 atomic commits** corresponding to the slices.
- **No one-shot prompting:** I never pass the whole assignment to an AI in one prompt. One narrow prompt per slice.
- **Draft -> review -> fix:** the raw AI draft of a slice is committed first (message says "draft"), then reviewed, then fixed in separate commits, so `git diff` shows exactly what I caught.
- **Honest report:** `AI_FAILURE_AUDIT.md` contains only defects I really observed, with real evidence.
- **Same quality bar as HW1/HW2:** strict CSP, no inline handlers or scripts, accessible markup.
- **Live defense:** I must be able to explain any line in my git history.

### Planned commit order
| # | Slice | Commit message |
|---|-------|----------------|
| 0 | Plan | `docs: add HW3 task decomposition and audit template` |
| 1 | Markup | `feat(hub): add event hub markup with UTC event time` |
| 2 | Slice 1 | `feat(countdown): draft countdown engine (AI, unreviewed)` + one `fix(countdown): ...` commit per defect + `feat(countdown): wire countdown to the page` |
| 3 | Slice 2 | `feat(form): add state-machine form (idle/submitting/success/error)` |
| 4 | Slice 3a | `fix(form): prevent double submit` |
| 5 | Slice 3b | `fix(security): sanitize input and render with textContent` |
| 6 | Audit | `docs(audit): add AI_FAILURE_AUDIT.md` |

### Architecture
```
index.html (UTC time in <time datetime="...Z">, form, status, list)
      |
main.js ──> countdown.js   (pure math + clock-based scheduling, no DOM)
      └───> form.js ───────> form-machine.js (pure state machine, no DOM)
```
- `countdown.js` and `form-machine.js` are pure and testable without a browser.
- `form.js` is the only layer that touches the form's DOM; it reads the machine state and renders it.

### Target structure
```
event-hub/
├── index.html
├── css/hub.css
└── js/
    ├── countdown.js
    ├── form-machine.js
    ├── form.js
    └── main.js
AI_FAILURE_AUDIT.md
docs/evidence/        # hw3-*.png screenshots
```

### Git workflow for each slice
1. `git checkout main && git pull`, then `git checkout -b <branch>`.
2. Commit the raw AI draft, review it, then commit each fix separately.
3. Open a small PR and merge with a **merge commit** (not squash), delete the branch.

### How to run and test
- `npx serve .` then open `http://localhost:3000/event-hub/`.
- Do not use Live Server for CSP checks (it injects an inline script).

---

## Slice 0: Markup
- **Branch:** `feat/hw3-markup`
- **Goal:** semantic page whose single source of truth for the event time is a UTC ISO 8601 timestamp.
- **Files touched:** `event-hub/index.html`, `event-hub/css/hub.css`
- **Sub-steps:**
  1. Create the page with `lang`, title, description, viewport, favicon, and the strict CSP meta tag.
  2. Add `<time id="event-time" datetime="...Z">` (UTC, ISO 8601 with `Z`).
  3. Add the countdown block (`role="timer"`) with four spans.
  4. Add the registration form (`novalidate`, `data-state="idle"`), labeled inputs for name, email (`type="email" required`) and notes, all with `maxlength`.
  5. Add `<p id="form-status" role="status">` and `<ul id="attendees">`.
- **Definition of done:** valid landmarks, one `<h1>`, labeled inputs, no inline script/handler/style, Console free of errors.
- **Commit:** `feat(hub): add event hub markup with UTC event time`

## Slice 1: Drift-free countdown (UTC ISO 8601)
- **Branch:** `feat/hw3-countdown`
- **Goal:** a countdown that stays correct under timer throttling, a busy main thread, hidden tabs, and any viewer timezone.
- **Files touched:** `event-hub/js/countdown.js`, `event-hub/js/main.js`, `event-hub/index.html`
- **Sub-steps:**
  1. Prompt an AI with a narrow, countdown-only prompt; save the output verbatim and commit it as a draft.
  2. **Review checklist:**
     - How is the target parsed? (Must be `Date.parse` of an ISO string with `Z`; no `new Date(y, m, d)` and no offset-less strings.)
     - Is remaining time computed from `Date.now()` on every tick, or is a counter decremented?
     - `setInterval` drift: does an error accumulate?
     - Is the timer stopped at zero, and does `stop()` clear the timer and remove listeners?
     - What happens when it is started twice?
     - Is the DOM rebuilt with `innerHTML` every second?
  3. **DevTools tests:**
     - Compare displayed seconds with `Date.parse(datetime) - Date.now()`.
     - Block the main thread for 5 s (`while (Date.now() - t < 5000) {}`) and check the countdown catches up.
     - Hide the tab for 60 s and compare on return.
     - Sensors panel: switch Timezone ID (for example `Asia/Tokyo`, `America/Los_Angeles`), reload, and confirm identical seconds.
     - Performance monitor: JS event listeners and DOM nodes must stay flat; `console.count('tick')` confirms only one loop runs.
     - Breakpoint in the tick function to inspect `total` against `Date.now()`.
  4. Fix every defect found in its own commit (clock-based remaining time, `setTimeout` aligned to the next second change, `Date.parse` with validation, `stop()` cleanup, `visibilitychange` refresh).
  5. Wire the countdown in `main.js`, updating the DOM only through `textContent`, and show the viewer's local time with `Intl.DateTimeFormat`.
- **Definition of done:**
  - Displayed seconds match the real clock within 1 s after throttling, blocking, and hidden-tab tests.
  - Identical countdown across timezones.
  - The loop stops at zero and `stop()` leaves no timers or listeners.
  - No `innerHTML` in the countdown path.
- **Evidence:** `docs/evidence/hw3-countdown-*.png` (timezone test, blocked-thread test, Performance monitor).
- **Commits:** draft commit, one `fix(countdown): ...` per defect, `feat(countdown): wire countdown to the page`

## Slice 2: State-machine form
- **Branch:** `feat/hw3-form-state`
- **Goal:** the form is always in exactly one state and moves only along allowed transitions.
- **Files touched:** `event-hub/js/form-machine.js`, `event-hub/js/form.js`, `event-hub/index.html`, `event-hub/js/main.js`
- **Transition table:**

  | From | Allowed next states |
  |------|---------------------|
  | idle | submitting |
  | submitting | success, error |
  | success | idle |
  | error | submitting, idle |

- **Sub-steps:**
  1. Prompt an AI (narrow prompts, one for the pure machine and one for the DOM layer); commit the drafts unchanged.
  2. **Review checklist:** can an illegal transition succeed? Is state stored in one place? Are states visible to users and screen readers (`role="status"` / `role="alert"`)? Is data kept after an error? Is validation done before `submitting`? Any `alert()`, `onsubmit=`, or missing `preventDefault()`?
  3. Implement `createMachine(onChange)` with `go(next)` returning `true` or `false`, and render state through `form.dataset.state`, disabled inputs, and messages in `#form-status`.
  4. Mock the server: async function resolving after about 1 s and rejecting for emails ending in `@fail.test`.
  5. **Test:** valid submit goes to success; `@fail.test` goes to error with data preserved and a successful retry; every illegal transition returns `false`.
- **Definition of done:** only table transitions are possible; each state is visible and announced; errors are recoverable without retyping.
- **Commit:** `feat(form): add state-machine form (idle/submitting/success/error)`

## Slice 3a: Double-submit prevention
- **Branch:** `feat/hw3-double-submit`
- **Goal:** one logical submission produces exactly one request, however the user or code triggers it.
- **Files touched:** `event-hub/js/form.js`
- **Sub-steps:**
  1. Guard the handler with `if (!machine.go('submitting')) return;` so the synchronous transition rejects repeats. `disabled` on the button is only a visual aid, not the guard.
  2. Optionally attach a `crypto.randomUUID()` idempotency key to each submission.
  3. Add `console.count('request sent')` to the mock server during testing.
  4. **Test:** rapid double click, held Enter, and `form.requestSubmit(); form.requestSubmit();` all leave the counter at 1; a retry after an error still works.
- **Definition of done:** exactly one request in all three tests; retry after error allowed.
- **Commit:** `fix(form): prevent double submit`

## Slice 3b: Input sanitization (zero XSS)
- **Branch:** `feat/hw3-sanitize`
- **Goal:** no user-provided string can ever be interpreted as HTML.
- **Files touched:** `event-hub/js/form.js`, `event-hub/js/form-machine.js`, `event-hub/index.html`
- **Sub-steps:**
  1. Add output sites for user data: a thank-you message with the name and the `#attendees` list.
  2. Normalize input: trim, collapse whitespace, strip control characters, limit length (plus `maxlength` in HTML).
  3. Render user data only with `textContent` or `createElement` + `textContent`. Keep an `escapeHTML` helper only for the rare case of string-building.
  4. Search for risky sinks: `grep -rnE 'innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(' event-hub/js`.
  5. **Test payloads:** `<img src=x onerror=alert(1)>`, `<script>alert(1)</script>`, `"><svg onload=alert(1)>`, `<h1>HACKED</h1>`. All must appear as literal text. The `<h1>` payload is the reliable test, because the CSP already blocks event-handler payloads even when `innerHTML` is used.
  6. Treat CSP as defense in depth, not as a substitute for correct output handling.
- **Definition of done:** every payload is displayed verbatim as text; no risky sink handles user data.
- **Evidence:** `docs/evidence/hw3-xss.png`
- **Commit:** `fix(security): sanitize input and render with textContent`

---

## Part B: AI_FAILURE_AUDIT.md (15%)
- **Branch:** `docs/hw3-audit`
- **Goal:** document three AI-induced defects I caught during review, each with description, diagnosis, and a verified fix.
- **Files touched:** `AI_FAILURE_AUDIT.md`, `docs/evidence/*`
- **Sub-steps:**
  1. For each defect, write the **Defect Description**: what, where (file, line, commit), impact, severity.
  2. Write the **Diagnostic Method**: either Git diff inspection (`git diff <draft> <fix> -- <file>`, pasted with the faulty lines marked) or a DevTools breakpoint (where, which variable, what value, screenshot).
  3. Write the **Refactored Solution**: my code, the fix commit hash, and how I verified it (test, result before and after).
  4. Fill the AI usage log (tool, prompt summary, what I changed) at the end of the file.
  5. Only include defects I really observed. If a draft was correct, say so and keep looking with the checklists; if I cannot find three real defects, ask the instructor instead of inventing any.
- **Definition of done:** three real defects, each with all three parts, evidence, and commit hashes; AI usage log complete.
- **Commit:** `docs(audit): add AI_FAILURE_AUDIT.md`

---

## Live defense plan
1. Practice `git log --oneline --graph --all`, `git show <hash>`, `git log -p -- <file>`, `git blame <file>`, and `git diff <draft> <fix>`.
2. For every line of `countdown.js`, `form-machine.js`, and `form.js`, be ready to say what it does, why it is written that way, and what breaks without it.
3. Be ready to demonstrate live: timezone switch in Sensors, blocking the main thread, double submit via `requestSubmit()`, and an XSS payload.

### Questions I must be able to answer
1. Why UTC ISO 8601 with a `Z` suffix?
2. Why must the countdown never decrement a counter?
3. Why `setTimeout` re-armed each tick instead of `setInterval`?
4. What happens in a hidden tab, and why is the display still correct on return?
5. Where could a memory leak occur and how is it prevented?
6. What does a state machine prevent compared with boolean flags?
7. Why is `disabled` not enough against double submit?
8. Why is `textContent` safe and `innerHTML` not?
9. Why is CSP not a replacement for sanitizing?
10. Which defect in my audit was the most severe, and why?

## Self-check before submission
- [ ] At least 5 atomic commits, each tied to a slice, with accurate messages
- [ ] Countdown reads only the UTC `datetime`; identical across timezones
- [ ] Blocked-thread and hidden-tab tests pass; loop stops at zero; `stop()` cleans up
- [ ] Form follows the transition table only
- [ ] One request for double click, held Enter, and `requestSubmit()` twice
- [ ] All XSS payloads render as literal text; no risky sinks for user data
- [ ] No inline handlers, scripts, or styles; no CSP errors in the Console
- [ ] `AI_FAILURE_AUDIT.md` has three real defects with evidence and hashes, plus the AI usage log
- [ ] I can explain every line of my history without notes