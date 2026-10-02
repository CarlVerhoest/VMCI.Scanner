---
name: data-before-code
description: A wrong value on a generated document is more often bad or empty data than a code bug — count the evidence before proposing a fix
metadata:
  type: feedback
---

Before reporting a deviating field on a generated document (or screen) as a code bug: (1) check
whether the database column is filled and how other records fill it, (2) count it against the real
sample documents, and (3) say what the majority does. Report the count with the finding.

**Why:** in eTrustee (02/09/2026) four "code bugs" were reported after comparing ten generated
documents with ten filled in by hand; three were data, and one was the expert's own deviation from
what 27 of 27 samples did. A code fix on a data error hides the problem; a code fix on something
already correct makes the output worse. One hand-made document is one data point, not the norm.

Related: [[reproducing-is-not-proving]].
