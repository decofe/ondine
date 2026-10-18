/** @module Build-only browser worker for the pinned Mermaid compatibility oracle. */

import zenuml from '@mermaid-js/mermaid-zenuml'
import mermaid from 'mermaid'

await mermaid.registerExternalDiagrams([zenuml])
export default mermaid
