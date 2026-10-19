# Melee

Melee renders Mermaid diagrams to monochrome, monospace SVG. A Rust compiler parses, lays out, and draws each diagram ahead of time, so pages load only the SVG and a 210-byte runtime.

```ts
// vite.config.ts
import { melee } from 'melee/vite'

export default { plugins: [melee()] }
```

```ts
// Any module: `.mmd` imports compile at build time.
import { mount } from 'melee'
import flow from './flow.mmd'

mount(document.getElementById('flow')!, flow)
```

The compiler also runs in Node (`melee/compiler`), in Markdown and MDX builds (`melee/remark`), from the `melee` CLI, as an image Worker for READMEs, and in browsers when needed (`melee/compiler/wasm`).

> [!NOTE]
> Melee is being rewritten. [`.agents/plan.md`](.agents/plan.md) tracks progress. The previous prototype lives on the `poc` branch.

## License

[MIT](LICENSE)
