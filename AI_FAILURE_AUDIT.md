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
- **Why it is a defect:** The AI draft directly called `Date.parse(targetIso)` without validating whether the input string explicitly contained a UTC timezone offset (`Z` or `+HH:MM`). Passing a naive ISO string like `"2026-12-31T17:00:00"` causes ECMAScript implementations to parse it as local time in some environments and UTC in others, leading to inconsistent countdown values across user timezones.
- **Impact / severity:** **High**. Users in different timezones see completely different countdown values for the same global event.

### 2. Diagnostic Method

- **Method used:** Git diff inspection & Sensors timezone testing in Chrome DevTools.
- **Steps:**
  1. Ran `git diff f82884e d18c618 -- event-hub/js/countdown.js`.
  2. Observed that `targetIso` was accepted without enforcing offset validation.
  3. Switched timezone in DevTools Sensors panel (e.g. `Asia/Tokyo` vs `America/New_York`) and observed parsing discrepancy.
- **Evidence:** Git diff output:
  ```diff
  +  // Test A: Kiểm tra bắt buộc phải có UTC offset
  +  if (typeof targetIso !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(targetIso)) {
  +    throw new TypeError(`Target ISO string must include a UTC offset (e.g., 'Z' or '+07:00'): "${targetIso}"`);
  +  }
  ```

### 3. Refactored Solution

- **My fix:** Added a regular expression validation `/(?:Z|[+-]\d{2}:\d{2})$/` to strictly reject ISO strings without explicit UTC offsets.
- **Fix commit:** `d18c618` (`fix(countdown): require a UTC offset in the target`)
- **How I verified it:** Tested passing `"2026-12-31T17:00:00"` (threw `TypeError`) vs `"2026-12-31T17:00:00Z"` (parsed correctly).
- **Why this fix is correct:** Enforces an absolute single point of truth in UTC time across all client environments.

---

## Defect 2: Accumulated timer drift from fixed `setInterval(tick, 1000)`

### 1. Defect Description

- **Slice:** 1 (Drift-free Countdown)
- **Where:** `event-hub/js/countdown.js`, lines 63-65 in draft commit `f82884e`
- **What the AI wrote:**
  ```javascript
  if (active) {
    timerId = setInterval(tick, 1000);
  }
  ```
- **Why it is a defect:** `setInterval(tick, 1000)` schedules ticks with a fixed delay relative to execution start time, ignoring event loop queues and execution lags. Over long periods or under CPU load, the interval ticks drift relative to real wall-clock seconds.
- **Impact / severity:** **Medium**. Displayed seconds become misaligned with wall-clock time and stutter or skip seconds.

### 2. Diagnostic Method

- **Method used:** Git diff inspection & main-thread blocking test in DevTools console.
- **Steps:**
  1. Executed a synchronous 5-second blocking loop in the DevTools console: `const t = Date.now(); while(Date.now() - t < 5000);`.
  2. Checked `git diff d18c618 4355318 -- event-hub/js/countdown.js`.
  3. Observed `setInterval` lag compared to `Date.now()`.
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

### 3. Refactored Solution

- **My fix:** Replaced `setInterval` with a self-aligning `setTimeout` pattern that calculates `delay = (total % 1000) + 1` based on the exact remaining milliseconds.
- **Fix commit:** `4355318` (`fix(countdown): align ticks to the next second change`)
- **How I verified it:** Blocked main thread for 5 seconds and confirmed the timer immediately realigned to the exact millisecond change on the next tick.
- **Why this fix is correct:** Guarantees tick alignment with the system clock regardless of event-loop execution delays.

---

## Defect 3: Frozen timer display on tab focus & missing event listener cleanup

### 1. Defect Description

- **Slice:** 1 (Drift-free Countdown)
- **Where:** `event-hub/js/countdown.js`, lines 38-48 in commit `4355318`
- **What the AI wrote:**
  ```javascript
  const stop = () => {
    if (active) {
      active = false;
      clearTimer();
    }
  };
  ```
- **Why it is a defect:** Modern browsers throttle background tab timers to 1 tick per minute or pause them completely. When a user switched back to the tab, the display remained stale until the next throttled timer fired. Furthermore, without event listener cleanup, stopping the countdown left dangling background references.
- **Impact / severity:** **Medium**. Stale UI displayed to users switching tabs, along with potential memory leaks.

### 2. Diagnostic Method

- **Method used:** Git diff inspection & tab switching test.
- **Steps:**
  1. Minimized/switched tabs for 30 seconds, then returned to the page.
  2. Inspected `git diff 4355318 cf46592 -- event-hub/js/countdown.js`.
  3. Confirmed no `visibilitychange` listener was present in earlier draft.
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

### 3. Refactored Solution

- **My fix:** Registered a `visibilitychange` event listener to instantly invoke `tick()` when `document.visibilityState === 'visible'`, and removed it inside `stop()`.
- **Fix commit:** `cf46592` (`fix(countdown): refresh on tab visibility change`)
- **How I verified it:** Kept the tab in background for 60s; upon switching back, UI updated instantly without delay.
- **Why this fix is correct:** Ensures immediate UI synchronization upon user return while remaining memory-safe.

---

## Summary table

| # | Defect | Slice | Diagnostic method | Fix commit |
| --- | --- | --- | --- | --- |
| 1 | Unvalidated ISO string parsing lacking UTC offset check | 1 countdown | Git diff inspection & Sensors timezone | `d18c618` |
| 2 | Accumulated timer drift from fixed `setInterval` | 1 countdown | Git diff inspection & DevTools CPU block | `4355318` |
| 3 | Frozen timer on tab focus & missing listener cleanup | 1 countdown | Git diff inspection & Tab visibility test | `cf46592` |

---

## AI usage log

| Slice | Tool / model | Prompt (summary) | What the AI produced | What I changed |
| --- | --- | --- | --- | --- |
| 1 countdown | ChatGPT / Claude | "Write a JavaScript countdown function targetIso and onTick callback" | Draft `startCountdown` using naive `Date.parse` and fixed `setInterval(tick, 1000)`. | Added regex UTC offset validation, replaced `setInterval` with self-aligning `setTimeout`, and added `visibilitychange` listener cleanup. |
| 2 form state | ChatGPT / Claude | "Write a pure state machine in JS for form states (idle, submitting, success, error)" | `createMachine` function with transition table and getter/setter. | Verified state transition locks and integrated state data attribute binding. |
| 3a double submit | ChatGPT / Claude | "Prevent double form submission in JS using state machine" | Event listener on form submit checking `machine.go('submitting')`. | Enforced synchronous FSM state lock before async network calls. |
| 3b sanitization | ChatGPT / Claude | "Sanitize user inputs before rendering" | Utility functions for input trimming and safe DOM output. | Enforced `textContent` for rendering dynamic strings and added CSP compliance. |

---

## Reflection

Reviewing AI-generated code demonstrated that AI models frequently favor simple, naive implementations (such as `setInterval` or raw `Date.parse`) over resilient, edge-case-hardened architecture. Through this audit, I developed a critical review habit of inspecting timer precision, state machine locks, and edge cases like tab throttling before accepting AI suggestions into production code.
