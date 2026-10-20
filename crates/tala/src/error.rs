// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// Ported from TALA (terrastruct/d2, d2layouts/d2talalayout/internal/invariant/errors.go).

//! Layout errors: a message plus the sentinel tags of the Go wrap chain, so `errors.Is` checks
//! port as [`Error::is`].

/// The identity of a Go sentinel error (`var ErrX = errors.New(...)`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Tag(pub(crate) &'static str);

/// Marks a broken engine invariant. Mirrors `invariant.ErrViolation`.
pub(crate) const VIOLATION: Tag = Tag("invariant violation");

/// A failed layout operation.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Error {
    message: String,
    tags: Vec<Tag>,
}

/// The result of a fallible layout operation.
pub(crate) type Result<T> = core::result::Result<T, Error>;

impl Error {
    /// An untagged error, as `errors.New` or `fmt.Errorf` without `%w`.
    #[cold]
    pub(crate) fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            tags: Vec::new(),
        }
    }

    /// An error that `errors.Is` matches against `tag`.
    #[cold]
    pub(crate) fn tagged(tag: Tag, message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            tags: vec![tag],
        }
    }

    /// An invariant violation, as `invariant.New` or `invariant.Errorf`.
    #[cold]
    pub(crate) fn invariant(message: impl Into<String>) -> Self {
        Self::tagged(VIOLATION, message)
    }

    /// Adds `tag` to the wrap chain, as `fmt.Errorf("%w: %w", tag, err)`.
    #[cold]
    #[must_use]
    pub(crate) fn with_tag(mut self, tag: Tag) -> Self {
        self.tags.push(tag);
        self
    }

    /// Prefixes the message and keeps the wrap chain, as `fmt.Errorf("context: %w", err)`.
    #[cold]
    #[must_use]
    pub(crate) fn wrap(mut self, context: &str) -> Self {
        let mut message = String::with_capacity(context.len() + 2 + self.message.len());
        message.push_str(context);
        message.push_str(": ");
        message.push_str(&self.message);
        self.message = message;
        self
    }

    /// Whether the wrap chain contains `tag`, as `errors.Is`.
    pub(crate) fn is(&self, tag: Tag) -> bool {
        self.tags.contains(&tag)
    }

    /// The human-readable message.
    pub fn message(&self) -> &str {
        &self.message
    }
}
