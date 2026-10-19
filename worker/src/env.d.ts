/** Wrangler compiles `.wasm` imports ahead of time. */
declare module '*.wasm' {
  const module: WebAssembly.Module
  export default module
}
