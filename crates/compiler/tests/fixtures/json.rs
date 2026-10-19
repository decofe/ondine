//! Reads the JSON parity fixtures in this folder for the diagram modules' `#[cfg(test)]` suites,
//! which include it with `#[path]`.

/// A JSON value.
#[derive(Debug)]
pub(crate) enum Json {
    Arr(Vec<Json>),
    Bool(bool),
    Null,
    Num(f64),
    Obj(Vec<(String, Json)>),
    Str(String),
}

impl Json {
    /// The member `key` of an object.
    pub(crate) fn get(&self, key: &str) -> Option<&Json> {
        let Json::Obj(entries) = self else {
            return None;
        };
        entries.iter().find(|(k, _)| k == key).map(|(_, v)| v)
    }

    /// The string member `key` of an object.
    pub(crate) fn str(&self, key: &str) -> Option<&str> {
        match self.get(key) {
            Some(Json::Str(s)) => Some(s),
            _ => None,
        }
    }

    /// The number member `key` of an object.
    pub(crate) fn num(&self, key: &str) -> Option<f64> {
        match self.get(key) {
            Some(Json::Num(n)) => Some(*n),
            _ => None,
        }
    }
}

/// The items of a fixture's top-level array.
pub(crate) fn cases(text: &str) -> Vec<Json> {
    let mut reader = Reader {
        bytes: text.as_bytes(),
        at: 0,
    };
    match reader.value() {
        Json::Arr(items) => items,
        _ => panic!("fixture is not an array"),
    }
}

struct Reader<'a> {
    bytes: &'a [u8],
    at: usize,
}

impl Reader<'_> {
    fn ws(&mut self) {
        while self.bytes.get(self.at).is_some_and(u8::is_ascii_whitespace) {
            self.at += 1;
        }
    }

    fn next(&mut self) -> u8 {
        let c = self.bytes[self.at];
        self.at += 1;
        c
    }

    fn value(&mut self) -> Json {
        self.ws();
        match self.bytes[self.at] {
            b'{' => {
                self.at += 1;
                let mut entries = Vec::new();
                loop {
                    self.ws();
                    match self.bytes[self.at] {
                        b'}' => {
                            self.at += 1;
                            return Json::Obj(entries);
                        }
                        b',' => self.at += 1,
                        _ => {
                            let Json::Str(key) = self.value() else {
                                panic!("key")
                            };
                            self.ws();
                            assert_eq!(self.next(), b':');
                            entries.push((key, self.value()));
                        }
                    }
                }
            }
            b'[' => {
                self.at += 1;
                let mut items = Vec::new();
                loop {
                    self.ws();
                    match self.bytes[self.at] {
                        b']' => {
                            self.at += 1;
                            return Json::Arr(items);
                        }
                        b',' => self.at += 1,
                        _ => items.push(self.value()),
                    }
                }
            }
            b'"' => {
                self.at += 1;
                let mut units: Vec<u16> = Vec::new();
                loop {
                    match self.next() {
                        b'"' => break,
                        b'\\' => {
                            let unit = match self.next() {
                                b'n' => 10,
                                b'r' => 13,
                                b't' => 9,
                                b'b' => 8,
                                b'f' => 12,
                                b'u' => {
                                    let hex =
                                        std::str::from_utf8(&self.bytes[self.at..self.at + 4])
                                            .unwrap();
                                    self.at += 4;
                                    u16::from_str_radix(hex, 16).unwrap()
                                }
                                other => u16::from(other),
                            };
                            units.push(unit);
                        }
                        c => {
                            let start = self.at - 1;
                            let len = match c {
                                0..0x80 => 1,
                                0xc0..0xe0 => 2,
                                0xe0..0xf0 => 3,
                                _ => 4,
                            };
                            let s = std::str::from_utf8(&self.bytes[start..start + len]).unwrap();
                            units.extend(s.encode_utf16());
                            self.at = start + len;
                        }
                    }
                }
                Json::Str(String::from_utf16(&units).unwrap())
            }
            b't' => {
                self.at += 4;
                Json::Bool(true)
            }
            b'f' => {
                self.at += 5;
                Json::Bool(false)
            }
            b'n' => {
                self.at += 4;
                Json::Null
            }
            _ => {
                let start = self.at;
                while self
                    .bytes
                    .get(self.at)
                    .is_some_and(|b| b"+-.eE0123456789".contains(b))
                {
                    self.at += 1;
                }
                let text = std::str::from_utf8(&self.bytes[start..self.at]).unwrap();
                Json::Num(text.parse().unwrap())
            }
        }
    }
}
