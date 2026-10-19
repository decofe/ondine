//! Pending port of Pele's `src/diagrams/usecase/`.

use super::{Diagram, Input, Rendered};
use crate::error::{Code, Error};
use crate::svg::root::RenderOptions;
use crate::util::url::UrlOptions;

/// The `usecase` diagram type.
pub(crate) const DIAGRAM: Diagram = Diagram {
    keep_comments: false,
    render,
    section: None,
};

fn render(
    _input: &Input<'_>,
    _options: &RenderOptions,
    _url: &UrlOptions<'_>,
) -> Result<Rendered, Error> {
    let mut error = Error::new(
        Code::UnsupportedDiagram,
        "Diagram type \"usecase\" is not supported yet.",
    );
    error.r#type = Some("usecase");
    Err(error)
}
