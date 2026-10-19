//! Pending port of Pele's `src/diagrams/treemap/`.

use super::{Diagram, Input, Rendered};
use crate::error::{Code, Error};
use crate::svg::root::RenderOptions;
use crate::util::url::UrlOptions;

/// The `treemap` diagram type.
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
        "Diagram type \"treemap\" is not supported yet.",
    );
    error.r#type = Some("treemap");
    Err(error)
}
