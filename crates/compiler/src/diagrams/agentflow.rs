//! Pending port of Pele's `src/diagrams/agentflow/`.

use super::{Diagram, Input, Rendered};
use crate::error::{Code, Error};
use crate::svg::root::RenderOptions;
use crate::util::url::UrlOptions;

/// The `agentflow` diagram type.
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
        "Diagram type \"agentflow\" is not supported yet.",
    );
    error.r#type = Some("agentflow");
    Err(error)
}
