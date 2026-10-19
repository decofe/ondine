//! A small YAML reader covering what Mermaid feeds to js-yaml with the JSON schema. Port of Pele's
//! `src/util/yaml.ts`, pending.

/// A parsed YAML value, shaped like the JavaScript value Pele's reader returns.
#[derive(Clone, Debug, PartialEq)]
pub(crate) enum Value {
    /// A sequence.
    Array(Vec<Value>),
    /// `true` or `false`.
    Bool(bool),
    /// `null`, `~`, or an empty value.
    Null,
    /// A number.
    Number(f64),
    /// A mapping, in JavaScript property order: integer-like keys ascending, then insertion order.
    Object(Vec<(String, Value)>),
    /// A string.
    String(String),
}

/// Parses `src`. Errors carry js-yaml's message.
pub(crate) fn parse(_src: &str) -> Result<Value, String> {
    Ok(Value::Null)
}
