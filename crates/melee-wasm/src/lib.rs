//! Browser adapter for Melee's Rust compiler. The browser runtime remains separate.

use melee_core::Scheme;
use wasm_bindgen::prelude::*;

/// A persistent browser compiler with one selected output scheme.
#[wasm_bindgen]
pub struct Compiler {
    inner: melee_core::Compiler,
}

#[wasm_bindgen]
impl Compiler {
    /// Create the same compiler used by the native CLI, without a server.
    #[wasm_bindgen(constructor)]
    pub fn new(dark: bool) -> Result<Compiler, JsValue> {
        let scheme = if dark { Scheme::Dark } else { Scheme::Light };
        let inner = melee_core::Compiler::new(scheme)
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        Ok(Compiler { inner })
    }

    /// Compile Mermaid syntax to standalone SVG, preserving compiler diagnostics.
    pub fn compile(&self, source: &str) -> Result<String, JsValue> {
        self.inner
            .compile(source)
            .map_err(|error| JsValue::from_str(&error.to_string()))
    }
}
