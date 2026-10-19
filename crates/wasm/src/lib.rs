//! WebAssembly adapter for the compiler.
//!
//! The host calls `reset`, copies source and options into memory returned by `alloc`, then calls
//! `render`. The result is one buffer of length-prefixed fields: a status byte (0 for success, 1
//! for an error) followed by little-endian `u32` lengths and UTF-8 bytes.
//!
//! - Success fields: type, width, height, links (`href`, `id`, and `internal` repeated), SVG.
//! - Error fields: code, type, line, column, snippet, message.
//!
//! Memory comes from a bump arena that `reset` empties, so each render starts with a clean heap.
#![cfg_attr(target_arch = "wasm32", no_main)]
#![cfg_attr(
    target_arch = "wasm32",
    expect(
        unsafe_code,
        reason = "The arena allocator and the exported ABI work with raw linear memory."
    )
)]

#[cfg(target_arch = "wasm32")]
mod arena {
    //! A bump allocator over WebAssembly linear memory. Rendering is short-lived, so memory is
    //! reclaimed all at once by `reset` instead of per allocation.

    use core::alloc::{GlobalAlloc, Layout};
    use core::cell::Cell;

    /// Bytes in one WebAssembly page.
    const PAGE: usize = 65_536;

    /// The arena's start, next free byte, and end.
    pub(crate) struct Arena {
        end: Cell<usize>,
        next: Cell<usize>,
        start: Cell<usize>,
    }

    // SAFETY: WebAssembly modules built for this crate run on one thread, so the cells are never
    // accessed concurrently.
    unsafe impl Sync for Arena {}

    impl Arena {
        /// An arena that claims memory on first use.
        pub(crate) const fn new() -> Self {
            Self {
                end: Cell::new(0),
                next: Cell::new(0),
                start: Cell::new(0),
            }
        }

        /// Frees every allocation. Callers must hold no pointers into the arena.
        pub(crate) fn reset(&self) {
            self.next.set(self.start.get());
        }

        fn grow(&self, needed: usize) -> bool {
            let pages = needed.div_ceil(PAGE);
            let previous = core::arch::wasm32::memory_grow(0, pages);
            if previous == usize::MAX {
                return false;
            }

            let base = previous * PAGE;
            if self.start.get() == 0 {
                self.start.set(base);
                self.next.set(base);
            }
            // Fresh pages are contiguous with the arena, since nothing else grows memory.
            self.end.set(base + pages * PAGE);
            true
        }
    }

    // SAFETY: `alloc` returns aligned, unique ranges inside memory the arena owns, and never hands
    // out memory twice before `reset`.
    unsafe impl GlobalAlloc for Arena {
        unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
            let align = layout.align();
            let mut at = (self.next.get() + align - 1) & !(align - 1);

            if self.start.get() == 0 || at + layout.size() > self.end.get() {
                let shortfall = (at + layout.size()).saturating_sub(self.end.get()) + align;
                if !self.grow(shortfall.max(PAGE)) {
                    return core::ptr::null_mut();
                }
                at = (self.next.get() + align - 1) & !(align - 1);
            }

            self.next.set(at + layout.size());
            at as *mut u8
        }

        unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
            // The most recent allocation is returned to the arena, which makes push-and-pop
            // patterns free.
            if ptr as usize + layout.size() == self.next.get() {
                self.next.set(ptr as usize);
            }
        }

        unsafe fn realloc(&self, ptr: *mut u8, layout: Layout, size: usize) -> *mut u8 {
            // The most recent allocation grows in place when the arena has room.
            if ptr as usize + layout.size() == self.next.get()
                && ptr as usize + size <= self.end.get()
            {
                self.next.set(ptr as usize + size);
                return ptr;
            }

            // SAFETY: the new layout has the original alignment and a nonzero size.
            let new =
                unsafe { self.alloc(Layout::from_size_align_unchecked(size, layout.align())) };
            if !new.is_null() {
                // SAFETY: both ranges are valid for the smaller size and do not overlap, since the
                // arena never reuses live memory.
                unsafe { core::ptr::copy_nonoverlapping(ptr, new, layout.size().min(size)) };
            }
            new
        }
    }
}

#[cfg(target_arch = "wasm32")]
#[global_allocator]
static ARENA: arena::Arena = arena::Arena::new();

/// Encodes a render result as the length-prefixed buffer described in the module docs.
#[cfg(target_arch = "wasm32")]
fn encode(result: Result<compiler::Rendered, compiler::Error>) -> Vec<u8> {
    let mut out = Vec::new();

    match result {
        Ok(rendered) => {
            out.push(0);
            field(&mut out, rendered.r#type.as_bytes());
            field(&mut out, &rendered.width.to_le_bytes());
            field(&mut out, &rendered.height.to_le_bytes());
            field(
                &mut out,
                &u32::try_from(rendered.links.len())
                    .unwrap_or(u32::MAX)
                    .to_le_bytes(),
            );
            for link in &rendered.links {
                field(&mut out, link.href.as_bytes());
                field(&mut out, link.id.as_bytes());
                field(&mut out, &[u8::from(link.internal)]);
            }
            field(&mut out, rendered.svg.as_bytes());
        }
        Err(error) => {
            out.push(1);
            field(&mut out, error.code.as_str().as_bytes());
            field(&mut out, error.r#type.unwrap_or("").as_bytes());
            field(&mut out, &error.line.to_le_bytes());
            field(&mut out, &error.column.to_le_bytes());
            field(&mut out, error.snippet.as_bytes());
            field(&mut out, error.message.as_bytes());
        }
    }

    out
}

#[cfg(target_arch = "wasm32")]
fn field(out: &mut Vec<u8>, bytes: &[u8]) {
    out.extend_from_slice(&u32::try_from(bytes.len()).unwrap_or(u32::MAX).to_le_bytes());
    out.extend_from_slice(bytes);
}

#[cfg(target_arch = "wasm32")]
mod exports {
    //! The C ABI the TypeScript wrapper calls.

    use core::cell::Cell;

    /// The last result's address and length, read by the host after `render`.
    struct Output {
        len: Cell<usize>,
        ptr: Cell<usize>,
    }

    // SAFETY: WebAssembly modules built for this crate run on one thread.
    unsafe impl Sync for Output {}

    static OUTPUT: Output = Output {
        len: Cell::new(0),
        ptr: Cell::new(0),
    };

    /// Empties the arena. Every pointer previously returned becomes invalid.
    #[unsafe(no_mangle)]
    extern "C" fn reset() {
        super::ARENA.reset();
    }

    /// Reserves `len` bytes for the host to write input into.
    #[unsafe(no_mangle)]
    extern "C" fn alloc(len: usize) -> *mut u8 {
        let mut buffer = Vec::<u8>::with_capacity(len);
        let ptr = buffer.as_mut_ptr();
        core::mem::forget(buffer);
        ptr
    }

    /// Renders the UTF-8 source and options the host wrote, and returns the result's address.
    /// The length is available from `result_len`.
    #[unsafe(no_mangle)]
    extern "C" fn render(
        source: *const u8,
        source_len: usize,
        options: *const u8,
        options_len: usize,
    ) -> *const u8 {
        // SAFETY: the host wrote `source_len` and `options_len` bytes at addresses from `alloc`.
        let (source, options) = unsafe {
            (
                core::slice::from_raw_parts(source, source_len),
                core::slice::from_raw_parts(options, options_len),
            )
        };

        let result = match (core::str::from_utf8(source), core::str::from_utf8(options)) {
            (Ok(source), Ok(options)) => compiler::render(source, options),
            _ => Err(compiler::Error {
                code: compiler::Code::Limit,
                column: 0,
                line: 0,
                message: String::from("Input is not valid UTF-8."),
                snippet: String::new(),
                r#type: None,
            }),
        };

        let bytes = super::encode(result).into_boxed_slice();
        OUTPUT.len.set(bytes.len());
        let ptr = Box::into_raw(bytes).cast::<u8>();
        OUTPUT.ptr.set(ptr as usize);
        ptr
    }

    /// The length of the last result.
    #[unsafe(no_mangle)]
    extern "C" fn result_len() -> usize {
        OUTPUT.len.get()
    }
}
