//! Layered (Sugiyama-style) layout. Port of Pele's `src/layout/layered.ts`, pending.

/// How far along the flow the handles of a plain S reach, as a share of the way it travels along
/// it. The layout uses this to tell how near two curves will pass, and the drawing to draw them.
pub(crate) fn ease(across: f64, along: f64) -> f64 {
    let across = if across == 0.0 { 1.0 } else { across.abs() };
    (4.0 * along.abs() / across).clamp(0.25, 0.5)
}
