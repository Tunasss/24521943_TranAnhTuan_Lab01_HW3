# AI_FAILURE_AUDIT

Course: Web Application Development, Lab 1: Modern Web Foundations & AI-Assisted Engineering
Assignment: HW3, Resilient Event Hub

This report documents three defects introduced by AI-generated code that I caught during my own review. Every entry describes something I actually observed in my repository, with evidence and commit hashes.

---

## Defect 1: Unvalidated ISO string parsing lacking mandatory UTC offset check

### 1. Defect Description

- **Slice:** 1 (Drift-free Countdown)
- **Where:** `event-hub/js/countdown.js`, lines 30-35 in draft commit `f82884e`
- **What the AI wrote:**
  ```javascript
  export function startCountdown(targetIso, onTick) {
    const targetMs = Date.parse(targetIso);

    if (Number.isNaN(targetMs)) {
      throw new TypeError(`Invalid ISO 8601 target: "${targetIso}"`);
    }
  ```
- **Why it is a defect:** The AI draft called `Date.parse(targetIso)` without checking that the string carries an explicit offset (`Z` or `+HH:MM`). Per the ECMAScript spec, a date-time string such as `"2026-12-31T17:00:00"` (no offset) is interpreted as the *viewer's local time*, so the same string yields a different instant for viewers in different timezones, and the countdown would differ per user.
- **Impact / severity:** **High** (latent). `index.html` currently uses a `Z` timestamp so the page is correct today, but anyone editing `datetime` and dropping the `Z` would silently break the countdown for every viewer outside the author's timezone.

### 2. Diagnostic Method

- **Method used:** Git diff inspection & Sensors timezone testing in Chrome DevTools.
- **Steps:**
  1. Ran `git diff f82884e d18c618 -- event-hub/js/countdown.js`.
  2. Observed that `targetIso` was accepted without enforcing offset validation.
  3. Ran `node docs/evidence/hw3-countdown-tests/evidence.mjs` with `TZ=Asia/Tokyo`, `TZ=America/Los_Angeles` and `TZ=Asia/Ho_Chi_Minh` (the Node equivalent of the DevTools Sensors timezone switch). It imports the draft `f82884e` and the fix `d18c618` and compares `Date.parse` of the same string with and without `Z`.
- **Evidence:** Git diff output:
  ```diff
  +  // Test A: Kiểm tra bắt buộc phải có UTC offset
  +  if (typeof targetIso !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(targetIso)) {
  +    throw new TypeError(`Target ISO string must include a UTC offset (e.g., 'Z' or '+07:00'): "${targetIso}"`);
  +  }
  ```
  Measured output (`docs/evidence/hw3-countdown-tests/output.log`):
  ```
  TZ=Asia/Tokyo           Date.parse(naive) - Date.parse(Z) = -32400000 ms (-9 h)
  TZ=America/Los_Angeles  Date.parse(naive) - Date.parse(Z) = +28800000 ms (+8 h)
  TZ=Asia/Ho_Chi_Minh     Date.parse(naive) - Date.parse(Z) = -25200000 ms (-7 h)
  draft f82884e: naive string ACCEPTED
  fix   d18c618: naive string REJECTED (TypeError)
  ```

### 3. Refactored Solution

- **My fix:** Added a regular expression validation `/(?:Z|[+-]\d{2}:\d{2})$/` to strictly reject ISO strings without explicit UTC offsets.
- **Fix commit:** `d18c618` (`fix(countdown): require a UTC offset in the target`)
- **How I verified it:** The same script, before vs after. Before (`f82884e`): the naive string was accepted and gave an instant that moved by -9 h / +8 h / -7 h depending on `TZ`. After (`d18c618`): the naive string throws `TypeError` in all three timezones, and the `Z` string is accepted.
- **Why this fix is correct:** Enforces an absolute single point of truth in UTC time across all client environments.

---

## Defect 2: Accumulated timer drift from fixed `setInterval(tick, 1000)`

### 1. Defect Description

- **Slice:** 1 (Drift-free Countdown)
- **Where:** `event-hub/js/countdown.js`, line 65 in draft commit `f82884e`
- **What the AI wrote:**
  ```javascript
  if (active) {
    timerId = setInterval(tick, 1000);
  }
  ```
- **Why it is a defect:** `setInterval(tick, 1000)` is not tied to the wall clock. The first tick fires at an arbitrary millisecond offset after start, so the display flips to the new second late by that offset, and every later tick keeps (and slowly worsens) that offset. (The draft does read `Date.now()` inside `getRemaining`, so the number shown is never wrong by more than one second; the defect is the tick phase, not an accumulating counter.)
- **Impact / severity:** **Low to medium**. Measured: the draft repaints about 0.5 s after the real second boundary and the offset grows about 3-4 ms per tick (see below), so the on-screen seconds are visibly out of step with the real clock over a long session.

### 2. Diagnostic Method

- **Method used:** Git diff inspection & main-thread blocking test in DevTools console.
- **Steps:**
  1. Wrote a Node script (`docs/evidence/hw3-countdown-tests/evidence.mjs`). Test A starts the countdown on a target 20.5 s away and, at each tick, records `(target - Date.now()) % 1000`, i.e. the ms left until the next real second boundary at the moment of painting. A value near 999 means the tick fired right after the boundary (aligned); a value near 500 means the display is about 500 ms late. Test B blocks the main thread for 5 s (`const t = Date.now(); while (Date.now() - t < 5000) {}`), the Node equivalent of the DevTools console test.
  2. Checked `git diff d18c618 4355318 -- event-hub/js/countdown.js`.
  3. Same script, second test: after the 5 s block, waited 1.5 s and compared the displayed seconds with the real seconds.
- **Evidence:** Git diff output:
  ```diff
  -  if (active) {
  -    timerId = setInterval(tick, 1000);
  -  }
  +  const scheduleNextTick = (total) => {
  +    clearTimer();
  +    if (!active || total <= 0) return;
  +    const delay = (total % 1000) + 1;
  +    timerId = setTimeout(tick, delay);
  +  };
  ```
  Measured (`docs/evidence/hw3-countdown-tests/output.log`), ms until next boundary at ticks 2..8:
  ```
  draft setInterval  f82884e: 487, 475, 473, 472, 469, 466, 463   (about 500 ms late, drifting about 4 ms per tick)
  fix   setTimeout   4355318: 998, 997, 996, 998, 988, 984, 994   (fires about 1-15 ms after the boundary)
  ```

### 3. Refactored Solution

- **My fix:** Replaced `setInterval` with a self-aligning `setTimeout` pattern that calculates `delay = (total % 1000) + 1` based on the exact remaining milliseconds.
- **Fix commit:** `4355318` (`fix(countdown): align ticks to the next second change`)
- **How I verified it:** Before: tick phase 487 -> 463 ms (late by about 0.5 s and worsening). After: 998 -> 994 ms (aligned to within about 15 ms). Honest note: the 5 s main-thread block did **not** separate the two versions. Both showed the correct seconds (22 s displayed, 22 s real) after the block, because both recompute from `Date.now()`; this confirms that neither version decrements a counter, and that the real difference is the tick alignment above.
- **Why this fix is correct:** Each tick re-derives the delay to the next second boundary from `Date.now()`, so one late tick never shifts later ticks.

---

## Defect 3: No refresh when the tab becomes visible again (and listener cleanup required by the fix)

### 1. Defect Description

- **Slice:** 1 (Drift-free Countdown)
- **Where:** `event-hub/js/countdown.js`, whole `startCountdown` in commit `4355318` (the `stop` function is at line 51 and no `visibilitychange` handling exists)
- **What the AI wrote:**
  ```javascript
  const stop = () => {
    if (active) {
      active = false;
      clearTimer();
    }
  };
  ```
- **Why it is a defect:** Browsers throttle timers in hidden tabs (as low as about once per minute). Commit `4355318` relies only on the timer, so nothing repaints the countdown at the moment the tab becomes visible; the numbers stay stale until the next (throttled) tick. A fix that adds a `visibilitychange` listener must also remove it in `stop()`, otherwise the listener leaks.
- **Impact / severity:** **Medium**. Users briefly see a wrong countdown after switching back to the tab.

### 2. Diagnostic Method

- **Method used:** Git diff inspection & tab switching test.
- **Steps:**
  1. Reviewed the code of `4355318` against the checklist item "what happens in a hidden tab": no code path reacts to the tab becoming visible.
  2. Inspected `git diff 4355318 cf46592 -- event-hub/js/countdown.js`.
  3. Confirmed `4355318` has no `visibilitychange` listener (`git show 4355318:event-hub/js/countdown.js`), then ran the script with a fake `document` that counts `addEventListener`/`removeEventListener` calls and fires `visibilitychange` once. (Node cannot throttle a real hidden tab, so this checks the code path, not the browser throttling.)
- **Evidence:** Git diff output:
  ```diff
  +  const handleVisibilityChange = () => {
  +    if (document.visibilityState === 'visible' && active) {
  +      tick();
  +    }
  +  };
  +  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  +    document.addEventListener('visibilitychange', handleVisibilityChange);
  +  }
  ```
  Measured (`docs/evidence/hw3-countdown-tests/output.log`):
  ```
  4355318 (before fix): ticks fired on visibilitychange=0; listeners left after stop()=0
  cf46592 (fixed)    : ticks fired on visibilitychange=1; listeners registered=1; left after stop()=0
  ```

### 3. Refactored Solution

- **My fix:** Registered a `visibilitychange` event listener to instantly invoke `tick()` when `document.visibilityState === 'visible'`, and removed it inside `stop()`.
- **Fix commit:** `cf46592` (`fix(countdown): refresh on tab visibility change`)
- **How I verified it:** Before: firing `visibilitychange` caused 0 repaints. After: exactly 1 immediate repaint, 1 listener registered, and 0 listeners left after `stop()` (no leak). Not verified in a real browser: the actual throttling of a hidden tab.
- **Why this fix is correct:** Ensures immediate UI synchronization upon user return while remaining memory-safe.

---

## Summary table

| # | Defect | Slice | Diagnostic method | Fix commit |
| --- | --- | --- | --- | --- |
| 1 | Unvalidated ISO string parsing lacking UTC offset check | 1 countdown | Git diff inspection & timezone test (`TZ=` in Node) | `d18c618` |
| 2 | `setInterval(tick, 1000)` not aligned to the second boundary (about 0.5 s late, drifting) | 1 countdown | Git diff inspection & tick-phase measurement | `4355318` |
| 3 | No refresh on tab visibility change (listener cleanup needed) | 1 countdown | Git diff inspection & fake-`document` listener test | `cf46592` |

---

## AI usage log

| Slice | Tool / model | Prompt (summary) | What the AI produced | What I changed |
| --- | --- | --- | --- | --- |
| 1 countdown | AI coding assistant (draft committed unchanged as `f82884e`) | Narrow prompt: countdown only, target as UTC ISO 8601 string, `onTick` callback, returns a stop function. | Draft `startCountdown` using plain `Date.parse` and `setInterval(tick, 1000)`. | Added UTC offset validation (`d18c618`), `setTimeout` aligned to the next second (`4355318`), `visibilitychange` refresh and cleanup (`cf46592`). |
| 2 form state | AI coding assistant | Narrow prompts: a pure state machine with the transition table, then the DOM layer using it. | `createMachine` with a transition table (`1176f1b`), and the form draft (`8c8b1cb`). | Added `checkValidity()` before `submitting`, dynamic control query, `role="alert"` on error (`27faa95`). |
| 3a double submit | AI coding assistant | "Make the submit handler safe against double submission; use the state machine as the guard." | Draft already guarded with `machine.go('submitting')`, so the review found no defect here. | Added `crypto.randomUUID()` idempotency key and `console.count('request sent')` for testing (`8ae5c3b`). |
| 3b sanitization | AI coding assistant | "Review form.js for XSS; use textContent/createElement; add a normalize(value, max) helper." | Draft already rendered with `textContent` (no `innerHTML`), so the review found no defect here. | Replaced `sanitizeText` with `normalize(value, max)` and added `escapeHTML` (`e48607a`). |

---

## Reflection

All three defects were hidden on the happy path: the countdown looked correct on my own machine, in my own timezone, with the tab in focus. Each only showed up when I changed the conditions (another timezone, tick timing, a tab that becomes visible again), and measuring the tick phase taught me that my first idea for a test (blocking the main thread) did not actually separate the draft from the fix. The review habit I will keep is to ask "what input or environment would make this wrong?" for every AI draft, then write a small measurement for it instead of trusting that the code looks reasonable.
