# AI_FAILURE_AUDIT

Course: Web Application Development, Lab 1: Modern Web Foundations & AI-Assisted Engineering
Assignment: HW3, Resilient Event Hub

This report documents three defects introduced by AI-generated code that I caught during my own review. Every entry describes something I actually observed in my repository, with evidence and commit hashes.

> **Instructions (delete this block before submitting):**
> - Replace every `TODO` with real content from your own repository.
> - Only document defects you really observed in the AI's output. Do not copy examples from the assignment text or from any guide.
> - If an AI draft was correct, say so in the AI usage log and keep reviewing; do not invent defects.
> - Evidence means screenshots in `docs/evidence/`, diffs, and commit hashes you can reproduce with `git show <hash>`.

---

## Defect 1: TODO short title

### 1. Defect Description
- **Slice:** TODO (1 countdown / 2 form / 3 double-submit or sanitization)
- **Where:** TODO file, line(s), and the draft commit hash (`git log --oneline -- <file>`)
- **What the AI wrote:** TODO the faulty code (paste the relevant lines)
- **Why it is a defect:** TODO explain the mechanism (what goes wrong and when)
- **Impact / severity:** TODO what a user or attacker would experience (low / medium / high and why)

### 2. Diagnostic Method
- **Method used:** TODO choose one or both: Git diff inspection / DevTools breakpoint
- **Steps:** TODO the exact steps, so someone else can reproduce the finding
  - For Git diff inspection: `git diff <draft-hash> <fix-hash> -- <file>`; paste the diff and mark the faulty lines.
  - For a DevTools breakpoint: where the breakpoint was set (file and line, or Event Listener Breakpoint), which variable or expression was watched, and the value observed.
- **Evidence:** TODO `docs/evidence/hw3-defect1-*.png` and the pasted diff or console output

### 3. Refactored Solution
- **My fix:** TODO paste the corrected code (written and understood by me)
- **Fix commit:** TODO hash and message
- **How I verified it:** TODO the test, the result before the fix, and the result after the fix
- **Why this fix is correct:** TODO one or two sentences

---

## Defect 2: TODO short title

### 1. Defect Description
- **Slice:** TODO
- **Where:** TODO
- **What the AI wrote:** TODO
- **Why it is a defect:** TODO
- **Impact / severity:** TODO

### 2. Diagnostic Method
- **Method used:** TODO
- **Steps:** TODO
- **Evidence:** TODO

### 3. Refactored Solution
- **My fix:** TODO
- **Fix commit:** TODO
- **How I verified it:** TODO
- **Why this fix is correct:** TODO

---

## Defect 3: TODO short title

### 1. Defect Description
- **Slice:** TODO
- **Where:** TODO
- **What the AI wrote:** TODO
- **Why it is a defect:** TODO
- **Impact / severity:** TODO

### 2. Diagnostic Method
- **Method used:** TODO
- **Steps:** TODO
- **Evidence:** TODO

### 3. Refactored Solution
- **My fix:** TODO
- **Fix commit:** TODO
- **How I verified it:** TODO
- **Why this fix is correct:** TODO

---

## Summary table
| # | Defect | Slice | Diagnostic method | Fix commit |
|---|--------|-------|-------------------|------------|
| 1 | TODO | TODO | TODO | TODO |
| 2 | TODO | TODO | TODO | TODO |
| 3 | TODO | TODO | TODO | TODO |

## AI usage log
| Slice | Tool / model | Prompt (summary) | What the AI produced | What I changed |
|-------|--------------|------------------|----------------------|----------------|
| 1 countdown | TODO | TODO | TODO | TODO |
| 2 form state | TODO | TODO | TODO | TODO |
| 3a double submit | TODO | TODO | TODO | TODO |
| 3b sanitization | TODO | TODO | TODO | TODO |

## Reflection
TODO: two or three sentences on what reviewing AI output taught me, and which review habit I will keep.
