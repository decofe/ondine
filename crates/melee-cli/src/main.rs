//! Compile stdin to SVG, with an optional JSON-line protocol for persistent hosts.

use melee_core::{Compiler, Scheme};
use std::io::{BufRead, Read, Write};

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args
        .iter()
        .any(|arg| !matches!(arg.as_str(), "--dark" | "--stdio"))
    {
        return Err("Usage: melee-native [--dark] [--stdio] < diagram.mmd".into());
    }
    let compiler = Compiler::new(if args.iter().any(|arg| arg == "--dark") {
        Scheme::Dark
    } else {
        Scheme::Light
    })?;
    let mut stdout = std::io::stdout().lock();
    if args.iter().any(|arg| arg == "--stdio") {
        for line in std::io::stdin().lock().lines() {
            let line = line?;
            let result = serde_json::from_str::<String>(&line)
                .map_err(|error| error.to_string())
                .and_then(|source| compiler.compile(&source).map_err(|error| error.to_string()));
            let output = match result {
                Ok(svg) => serde_json::json!({ "svg": svg }),
                Err(error) => serde_json::json!({ "error": error }),
            };
            writeln!(stdout, "{output}")?;
            stdout.flush()?;
        }
    } else {
        let mut source = String::new();
        std::io::stdin()
            .take(1_000_001)
            .read_to_string(&mut source)?;
        stdout.write_all(compiler.compile(&source)?.as_bytes())?;
    }
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("melee-native: {error}");
        std::process::exit(2);
    }
}
