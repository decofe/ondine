//! Pending port of Pele's `src/diagrams/eventmodeling/`.

use super::{Diagram, Input, Rendered};
use crate::error::{Code, Error};
use crate::svg::root::RenderOptions;
use crate::util::url::UrlOptions;

/// The `eventmodeling` diagram type.
pub(crate) const DIAGRAM: Diagram = Diagram {
    keep_comments: true,
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
        "Diagram type \"eventmodeling\" is not supported yet.",
    );
    error.r#type = Some("eventmodeling");
    Err(error)
}
