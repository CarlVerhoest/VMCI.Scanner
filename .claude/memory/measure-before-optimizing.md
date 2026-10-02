---
name: measure-before-optimizing
description: When something is slow, measure first — in eTrustee it was always remote round-trips, never the database or CPU
metadata:
  type: feedback
---

**Measure before optimizing, and count remote calls before anything else.** In eTrustee every
performance complaint turned out to be the number of Microsoft Graph round-trips (~500 ms each) —
never the database (a 31-employee commit spent 160 ms in SQL), never the arithmetic. Two fixes that
came straight out of measuring took one import from 18.4 s to 5.1 s; both sat in code that looked
perfectly reasonable.

**How to apply:** the question is "how many calls per item?", not "how fast is this call?". Once the
app has integrations, give it one configuration switch that turns timing on (off = not measured at
all), and read its log line before guessing.
