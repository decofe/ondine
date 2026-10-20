// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

//! A Rust port of TALA, the orthogonal autolayout and edge-routing engine of D2.
//!
//! TALA places nodes by searching over candidate positions, then routes every edge on an
//! orthogonal visibility graph. Layout is deterministic for a given graph and seed. See
//! `PORTING.md` for the porting rules that keep the output identical to the Go engine.

mod context;
mod d2;
mod error;
mod go;
mod labelgeom;
mod limits;

pub use error::Error;
