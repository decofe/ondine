//! Pending port of Pele's `src/diagrams/xychart/`.

use super::{Diagram, Input, Rendered};
use crate::error::{Code, Error};
use crate::svg::root::RenderOptions;
use crate::util::url::UrlOptions;

/// The `xychart` diagram type.
pub(crate) const DIAGRAM: Diagram = Diagram {
    keep_comments: false,
    render,
    section: Some("xyChart"),
};

fn render(
    _input: &Input<'_>,
    _options: &RenderOptions,
    _url: &UrlOptions<'_>,
) -> Result<Rendered, Error> {
    let mut error = Error::new(
        Code::UnsupportedDiagram,
        "Diagram type \"xychart\" is not supported yet.",
    );
    error.r#type = Some("xychart");
    Err(error)
}
