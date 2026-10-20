// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

//! The values TALA stores on a Go `context.Context`, passed explicitly as `&mut Ctx`.
//!
//! Go scopes a context value to the call tree below `context.WithValue`. A port sets the field
//! before that call tree and restores the previous value after it.

/// Layout-wide state that Go threads through `context.Context` values.
#[derive(Debug, Default)]
pub(crate) struct Ctx {}
