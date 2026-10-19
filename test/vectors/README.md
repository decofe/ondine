# Test vectors

Inputs that every Melee diagram type is tested against. Each file is copied unchanged from [Pele](https://github.com/obsidianmd/pele) at `458322a5b8abb1ae57ddf127c32017ab9fb14a92` (October 17, 2026).

| File | Source | Contents |
| --- | --- | --- |
| `corpus/<type>.json` | `tests/corpus/<type>-docs.json` | 503 examples from Mermaid's syntax documentation, across 33 types |
| `samples.json` | `sampleGroups()` in `website/src/lib/examples.ts` | 167 samples shown in the pele.run playground, grouped by type |
| `layout-cases.json` | `website/src/lib/layout-cases.ts` | 81 layout cases with notes on what each checks |
| `agentflow-reference.json` | `tests/corpus/agentflow-reference.json` | 239 agentflow models captured from Mermaid |

`samples.json` and `layout-cases.json` were produced by evaluating Pele's TypeScript modules and writing their values as JSON.

## Pinned References

- Mermaid `12.1.0` is the syntax reference.
- Pele `1.6.0` is the reference for parsed models, layout quality, speed, and size.

## Licenses

The documentation examples come from Mermaid ([`LICENSE-mermaid`](LICENSE-mermaid), MIT, Copyright (c) 2014 - 2022 Knut Sveidqvist). Pele's samples, layout cases, and corpus selection are covered by [`LICENSE-pele`](LICENSE-pele) (MIT, Copyright (c) 2026 kepano).
