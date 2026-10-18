/** @module Messages crossing the playground's compiler-worker boundary. */

/** An isolated source compilation request. */
export type Request = {
  /** Request identity used to discard stale results. */
  readonly id: number
  /** Output color scheme. */
  readonly scheme: 'dark' | 'light'
  /** Mermaid source. */
  readonly source: string
}

/** Compiler lifecycle and result events. */
export type Response =
  | { readonly type: 'ready' }
  | { readonly type: 'fatal'; readonly error: string }
  | { readonly type: 'result'; readonly id: number; readonly duration: number; readonly svg: string }
  | { readonly type: 'error'; readonly id: number; readonly error: string }
