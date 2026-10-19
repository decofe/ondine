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
