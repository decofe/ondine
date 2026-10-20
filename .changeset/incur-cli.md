---
'ondine': patch
---

Rebuilt the `ondine` CLI on Incur. The command keeps its arguments, options, and reports, and adds `--llms-full`, `--schema`, `--mcp`, `mcp add`, and `skills add` for agents. A failed render or `--check` now also writes a summary error on standard output.
