---
name: powershell-not-bash
description: The developer works exclusively in PowerShell 7; never hand over Bash syntax, and there is no Python
metadata:
  type: feedback
---

The developer runs **PowerShell 7 only**, never Bash. Every command handed over must be valid
PowerShell, in `powershell` code blocks, and repository scripts are `.ps1`. **Python is not
installed** (`python`/`python3` are Microsoft Store stubs that exit with code 49), so no `.py` tools.

**Why:** carried over from eTrustee (08/09/2026): a one-liner mixing Git Bash idioms
(`cmd //c dir "%USERPROFILE%\..."`) did not error in PowerShell — `%USERPROFILE%` does not expand and
`cmd //c` waits on stdin, so the terminal simply hung. A Bash-flavoured command silently fails here.

**How to apply:** `$env:USERPROFILE`, not `%USERPROFILE%`; `Test-Path`, not `[ -f ]`;
`Get-ChildItem`, not `ls -la`. Prefer the PowerShell tool for anything the developer might rerun.
Watch `2>/dev/null`, backtick command substitution and `$(...)` with Unix semantics. Throwaway
analysis scripts: PowerShell, in the scratchpad.
