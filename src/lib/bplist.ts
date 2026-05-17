// Minimal binary property list (bplist00) encoder.
// Handles only the value types needed for generating Apple Shortcuts files:
// null, boolean, integer, ASCII/UTF-16 string, array, and plain object (dict).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BplistValue = any;

// Integer encoding — bplist integers are big-endian signed; use the smallest
// byte width that represents the value as a non-negative signed integer.
function encodeInt(n: number): Buffer {
  if (n <= 0x7f) return Buffer.from([0x10, n]);
  if (n <= 0x7fff) { const b = Buffer.alloc(3); b[0] = 0x11; b.writeInt16BE(n, 1); return b; }
  if (n < 0x80000000) { const b = Buffer.alloc(5); b[0] = 0x12; b.writeInt32BE(n, 1); return b; }
  const b = Buffer.alloc(9); b[0] = 0x13; b.writeBigInt64BE(BigInt(n), 1); return b;
}

export function buildBplist(root: BplistValue): Buffer {
  type Obj =
    | { kind: "null" }
    | { kind: "bool"; v: boolean }
    | { kind: "int"; v: number }
    | { kind: "str"; v: string }
    | { kind: "array"; children: number[] }
    | { kind: "dict"; keys: number[]; vals: number[] };

  const objects: Obj[] = [];

  // Flatten the tree depth-first: children are added before their parent,
  // so the root ends up with the highest index (topObject in the trailer).
  function flatten(v: BplistValue): number {
    if (v === null || v === undefined) {
      return objects.push({ kind: "null" }) - 1;
    }
    if (typeof v === "boolean") {
      return objects.push({ kind: "bool", v }) - 1;
    }
    if (typeof v === "number") {
      return objects.push({ kind: "int", v }) - 1;
    }
    if (typeof v === "string") {
      return objects.push({ kind: "str", v }) - 1;
    }
    if (Array.isArray(v)) {
      const children = v.map(flatten);
      return objects.push({ kind: "array", children }) - 1;
    }
    // plain object → dict
    const entries = Object.entries(v);
    const keys = entries.map(([k]) => flatten(k));
    const vals = entries.map(([, val]) => flatten(val));
    return objects.push({ kind: "dict", keys, vals }) - 1;
  }

  const rootIdx = flatten(root);
  const n = objects.length;
  const refSize = n <= 0xff ? 1 : n <= 0xffff ? 2 : 4;

  function ref(idx: number): Buffer {
    if (refSize === 1) return Buffer.from([idx]);
    if (refSize === 2) { const b = Buffer.alloc(2); b.writeUInt16BE(idx, 0); return b; }
    const b = Buffer.alloc(4); b.writeUInt32BE(idx, 0); return b;
  }

  // Encode each collected object to bytes.
  const encoded: Buffer[] = objects.map((obj) => {
    switch (obj.kind) {
      case "null":  return Buffer.from([0x00]);
      case "bool":  return Buffer.from([obj.v ? 0x09 : 0x08]);
      case "int":   return encodeInt(obj.v);
      case "str": {
        const isASCII = /^[\x00-\x7F]*$/.test(obj.v);
        if (isASCII) {
          const data = Buffer.from(obj.v, "ascii");
          const len  = data.length;
          const hdr  = len < 15 ? Buffer.from([0x50 | len]) : Buffer.concat([Buffer.from([0x5f]), encodeInt(len)]);
          return Buffer.concat([hdr, data]);
        }
        // UTF-16 BE
        const le = Buffer.from(obj.v, "utf16le");
        const be = Buffer.alloc(le.length);
        for (let i = 0; i < le.length; i += 2) { be[i] = le[i + 1]; be[i + 1] = le[i]; }
        const len = le.length / 2;
        const hdr = len < 15 ? Buffer.from([0x60 | len]) : Buffer.concat([Buffer.from([0x6f]), encodeInt(len)]);
        return Buffer.concat([hdr, be]);
      }
      case "array": {
        const len = obj.children.length;
        const hdr = len < 15 ? Buffer.from([0xa0 | len]) : Buffer.concat([Buffer.from([0xaf]), encodeInt(len)]);
        return Buffer.concat([hdr, ...obj.children.map(ref)]);
      }
      case "dict": {
        const len = obj.keys.length;
        const hdr = len < 15 ? Buffer.from([0xd0 | len]) : Buffer.concat([Buffer.from([0xdf]), encodeInt(len)]);
        // bplist dict layout: all keys first, then all values (in the same order)
        return Buffer.concat([hdr, ...obj.keys.map(ref), ...obj.vals.map(ref)]);
      }
    }
  });

  // Build offset table.
  const offsets: number[] = [];
  let off = 8; // skip "bplist00" header
  for (const buf of encoded) { offsets.push(off); off += buf.length; }

  const offsetTableOffset = off;
  const offIntSize = off < 0x100 ? 1 : off < 0x10000 ? 2 : off < 0x1000000 ? 3 : 4;

  function writeOff(o: number): Buffer {
    if (offIntSize === 1) return Buffer.from([o]);
    if (offIntSize === 2) { const b = Buffer.alloc(2); b.writeUInt16BE(o, 0); return b; }
    if (offIntSize === 3) { const b = Buffer.alloc(3); b.writeUIntBE(o, 0, 3); return b; }
    const b = Buffer.alloc(4); b.writeUInt32BE(o, 0); return b;
  }

  // 32-byte trailer: [5 unused][sortVer][offIntSize][refSize][numObj 8B][topObj 8B][offsetTableOff 8B]
  const trailer = Buffer.alloc(32, 0);
  trailer[6] = offIntSize;
  trailer[7] = refSize;
  trailer.writeBigUInt64BE(BigInt(n), 8);
  trailer.writeBigUInt64BE(BigInt(rootIdx), 16);
  trailer.writeBigUInt64BE(BigInt(offsetTableOffset), 24);

  return Buffer.concat([
    Buffer.from("bplist00", "ascii"),
    ...encoded,
    Buffer.concat(offsets.map(writeOff)),
    trailer,
  ]);
}
