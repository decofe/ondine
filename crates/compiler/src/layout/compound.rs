//! Lays out nested groups, each in its own direction, on top of the layered layout.
//! Port of Pele's `src/layout/compound.ts`. The algorithms are pending; see `.agents/plan.md`.

/// A flow direction.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Dir {
    /// Bottom to top.
    Bt,
    /// Left to right.
    Lr,
    /// Right to left.
    Rl,
    /// Top to bottom.
    Tb,
}

/// The direction a diagram names, or top to bottom for anything else.
pub(crate) fn direction(dir: Option<&str>) -> Dir {
    match dir {
        Some("BT") => Dir::Bt,
        Some("LR") => Dir::Lr,
        Some("RL") => Dir::Rl,
        _ => Dir::Tb,
    }
}

/// A node or group in a compound layout. Mirrors Pele's `CNode`.
#[derive(Clone, Debug)]
pub(crate) struct CNode {
    /// The direction inside a group, when it sets its own.
    pub(crate) dir: Option<Dir>,
    /// Height.
    pub(crate) h: f64,
    /// Whether the node is a group.
    pub(crate) is_group: bool,
    /// Least width of a group.
    pub(crate) min_w: f64,
    /// Padding below a group's members.
    pub(crate) pad_bottom: f64,
    /// Padding beside a group's members.
    pub(crate) pad_x: f64,
    /// Padding above a group's members.
    pub(crate) pad_top: f64,
    /// Index of the enclosing group, or -1 at the top level.
    pub(crate) parent: i32,
    /// Declaration order; a group takes the smallest value among its members.
    pub(crate) seq: f64,
    /// How much of a side its edges may spread along, measured across the flow; 0 keeps them at
    /// its middle.
    pub(crate) span: f64,
    /// Width.
    pub(crate) w: f64,
    /// Center x after layout.
    pub(crate) x: f64,
    /// Center y after layout.
    pub(crate) y: f64,
}

/// An edge in a compound layout. Mirrors Pele's `CEdge`.
#[derive(Clone, Debug, Default)]
pub(crate) struct CEdge {
    /// Index of the head node.
    pub(crate) dst: usize,
    /// Label height.
    pub(crate) label_h: f64,
    /// Label width.
    pub(crate) label_w: f64,
    /// Label center x after layout.
    pub(crate) label_x: f64,
    /// Label center y after layout.
    pub(crate) label_y: f64,
    /// Least number of ranks the edge spans.
    pub(crate) minlen: u32,
    /// `x, y, axis` triples. Axis is 0 where the edge runs vertically into the point, 1
    /// horizontally.
    pub(crate) route: Vec<f64>,
    /// Index of the tail node.
    pub(crate) src: usize,
}

/// A node of the given size inside `parent`, as Pele's `cnode` creates it.
pub(crate) fn cnode(w: f64, h: f64, parent: i32) -> CNode {
    CNode {
        dir: None,
        h,
        is_group: false,
        min_w: 0.0,
        pad_bottom: 0.0,
        pad_x: 0.0,
        pad_top: 0.0,
        parent,
        seq: 0.0,
        span: 0.0,
        w,
        x: 0.0,
        y: 0.0,
    }
}
