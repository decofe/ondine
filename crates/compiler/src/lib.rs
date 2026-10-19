//! Compiles Mermaid source to monochrome SVG.
//!
//! The pipeline follows Pele (MIT): preprocessing removes front matter, directives, and comments,
//! detection picks a diagram type, and each type parses into a model, lays it out, and emits SVG.

mod detect;
mod error;
mod preprocess;
mod yaml;

mod layout {
    pub(crate) mod compound;
    pub(crate) mod layered;
}

mod svg {
    pub(crate) mod builder;
    pub(crate) mod cluster;
    pub(crate) mod edges;
    pub(crate) mod root;
    pub(crate) mod shapes;
    pub(crate) mod theme;
    pub(crate) mod title;
}

mod text {
    pub(crate) mod entities;
    pub(crate) mod icons;
    pub(crate) mod label;
    pub(crate) mod measure;
}

mod util {
    pub(crate) mod chars;
    pub(crate) mod unicode;
    pub(crate) mod url;
}

mod diagrams {
    pub(crate) mod common {
        pub(crate) mod fit_width;
        pub(crate) mod scan;
        pub(crate) mod tokens;
    }

    #[cfg(feature = "flowchart")]
    pub(crate) mod flowchart;
}

pub use error::{Code, Error};

/// A link drawn in a diagram, as Pele's `LinkInfo` reports it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Link {
    /// The address.
    pub href: String,
    /// The id of the element that carries the link.
    pub id: String,
    /// Whether the address points inside the page.
    pub internal: bool,
}

/// A rendered diagram.
#[derive(Clone, Debug, PartialEq)]
pub struct Rendered {
    /// Height in pixels.
    pub height: f64,
    /// Links in drawing order.
    pub links: Vec<Link>,
    /// The SVG document.
    pub svg: String,
    /// The detected diagram type, using Pele's names.
    pub r#type: &'static str,
    /// Width in pixels.
    pub width: f64,
}

/// Renders Mermaid `source` to SVG. `options` is a JSON object with Pele's `RenderOptions`
/// fields, or empty for defaults.
///
/// # Errors
///
/// Returns an [`Error`] for unsupported diagram types, syntax errors, and exceeded limits.
pub fn render(source: &str, options: &str) -> Result<Rendered, Error> {
    let _ = (source, options);
    Err(Error::new(Code::UnsupportedDiagram, "No diagram type detected for the given text."))
}
