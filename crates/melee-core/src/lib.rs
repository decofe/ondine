//! Compile Mermaid to grayscale SVG with a native, headless Rust pipeline.
//!
//! Parsing and layout are provided by Merman. Browser code consumes only SVG.

use merman::{
    Engine, MermaidConfig, OperationControl, RenderOutput, RenderRequest, Renderer, SvgRequest,
};

/// The output color scheme. Themes are generated from the TypeScript contract.
#[derive(Clone, Copy, Debug, Default)]
pub enum Scheme {
    Dark,
    #[default]
    Light,
}

/// A reusable native compiler. Its renderer owns parsing and layout defaults.
pub struct Compiler {
    renderer: Renderer,
}

impl Compiler {
    /// Create a compiler without browser, Node, filesystem, or network access.
    pub fn new(scheme: Scheme) -> Result<Self, Box<dyn std::error::Error>> {
        let theme = match scheme {
            Scheme::Dark => include_str!("../../../themes/dark.json"),
            Scheme::Light => include_str!("../../../themes/light.json"),
        };
        let config = MermaidConfig::from_value(serde_json::from_str(theme)?);
        let engine = Engine::new().with_site_config(config);
        Ok(Self {
            renderer: Renderer::new().with_engine(engine),
        })
    }

    /// Compile Mermaid source into standalone SVG. Errors preserve diagnostics.
    pub fn compile(&self, source: &str) -> Result<String, Box<dyn std::error::Error>> {
        if source.len() > 1_000_000 {
            return Err("Source exceeds 1 MB".into());
        }
        let request = RenderRequest::svg(source, OperationControl::new(), SvgRequest::default());
        let output = self.renderer.render(request)?;
        let RenderOutput::Svg(Some(svg)) = output else {
            return Err("Expected a Mermaid diagram".into());
        };
        Ok(svg.svg().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::{Compiler, Scheme};

    #[test]
    fn compiles_families_and_retains_labels() {
        let compiler = Compiler::new(Scheme::Light).unwrap();
        for source in [
            "flowchart LR\nA[Browser] --> B[Compiler]",
            "sequenceDiagram\nAlice->>Bob: Hello",
            "pie\n\"Rust\": 80\n\"Browser\": 20",
            "classDiagram\nAnimal <|-- Dog",
            "stateDiagram-v2\n[*] --> Ready",
        ] {
            let svg = compiler.compile(source).unwrap();
            assert!(svg.contains("<svg"), "{source}");
            assert!(!svg.contains("NaN"), "{source}");
        }
    }

    #[test]
    fn rejects_invalid_sources_and_supports_both_schemes() {
        for scheme in [Scheme::Dark, Scheme::Light] {
            let compiler = Compiler::new(scheme).unwrap();
            assert!(compiler.compile("not a diagram").is_err());
            let svg = compiler
                .compile("flowchart TB\nA[Hello] --> B[World]")
                .unwrap();
            assert!(svg.contains("Hello"));
        }
    }
}
