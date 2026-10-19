//! Pending port of Pele's `src/diagrams/quadrant/`.

use super::{Diagram, Input, Rendered};
use crate::error::{Code, Error};
use crate::svg::root::RenderOptions;
use crate::util::url::UrlOptions;

/// The `quadrantChart` diagram type.
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
        "Diagram type \"quadrantChart\" is not supported yet.",
    );
    error.r#type = Some("quadrantChart");
    Err(error)
}
