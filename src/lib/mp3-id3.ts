export type ParsedMp3Metadata = {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  bpm?: number;
  lyrics?: string;
  cover?: {
    blob: Blob;
    fileName: string;
    mimeType: string;
    previewUrl: string;
  };
};

function syncSafeToInt(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] & 0x7f) << 21) | ((bytes[offset + 1] & 0x7f) << 14) | ((bytes[offset + 2] & 0x7f) << 7) | (bytes[offset + 3] & 0x7f);
}

function uint32ToInt(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
}

function decodeTextFrame(bytes: Uint8Array) {
  if (bytes.length <= 1) return "";
  const encoding = bytes[0];
  const payload = bytes.slice(1);
  let text = "";

  try {
    if (encoding === 1) {
      text = new TextDecoder("utf-16").decode(payload);
    } else if (encoding === 2) {
      text = new TextDecoder("utf-16be").decode(payload);
    } else if (encoding === 3) {
      text = new TextDecoder("utf-8").decode(payload);
    } else {
      text = new TextDecoder("iso-8859-1").decode(payload);
    }
  } catch {
    text = new TextDecoder("utf-8").decode(payload);
  }

  return text.replace(/\0/g, "").trim();
}

function findTerminator(bytes: Uint8Array, start: number, encoding: number) {
  if (encoding === 1 || encoding === 2) {
    for (let i = start; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) return i;
    }
    return -1;
  }

  for (let i = start; i < bytes.length; i += 1) {
    if (bytes[i] === 0) return i;
  }
  return -1;
}

function parseApicFrame(bytes: Uint8Array) {
  if (bytes.length < 8) return null;
  const encoding = bytes[0];
  let cursor = 1;
  const mimeEnd = findTerminator(bytes, cursor, 0);
  if (mimeEnd < 0) return null;

  const mimeType = new TextDecoder("iso-8859-1").decode(bytes.slice(cursor, mimeEnd)).trim() || "image/jpeg";
  cursor = mimeEnd + 1;
  cursor += 1; // picture type

  const descriptionEnd = findTerminator(bytes, cursor, encoding);
  if (descriptionEnd < 0) return null;
  cursor = descriptionEnd + (encoding === 1 || encoding === 2 ? 2 : 1);

  const imageBytes = bytes.slice(cursor);
  if (imageBytes.length === 0) return null;
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const blob = new Blob([imageBytes], { type: mimeType });
  return {
    blob,
    fileName: `embedded-cover.${ext}`,
    mimeType,
    previewUrl: URL.createObjectURL(blob),
  };
}

function parseUnsynchronisedLyricsFrame(bytes: Uint8Array) {
  if (bytes.length < 5) return "";
  const encoding = bytes[0];
  let cursor = 4; // text encoding + 3-byte language
  const descriptionEnd = findTerminator(bytes, cursor, encoding);
  if (descriptionEnd >= 0) {
    cursor = descriptionEnd + (encoding === 1 || encoding === 2 ? 2 : 1);
  }
  return decodeTextFrame(new Uint8Array([encoding, ...bytes.slice(cursor)]));
}

export async function parseMp3Metadata(file: File): Promise<ParsedMp3Metadata> {
  const header = new Uint8Array(await file.slice(0, 10).arrayBuffer());
  if (header[0] !== 0x49 || header[1] !== 0x44 || header[2] !== 0x33) return {};

  const majorVersion = header[3];
  const tagSize = syncSafeToInt(header, 6);
  if (!tagSize || tagSize > 2 * 1024 * 1024) return {};

  const bytes = new Uint8Array(await file.slice(0, tagSize + 10).arrayBuffer());
  const result: ParsedMp3Metadata = {};
  let cursor = 10;

  while (cursor + 10 <= bytes.length) {
    const frameId = new TextDecoder("iso-8859-1").decode(bytes.slice(cursor, cursor + 4));
    if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

    const frameSize = majorVersion === 4 ? syncSafeToInt(bytes, cursor + 4) : uint32ToInt(bytes, cursor + 4);
    cursor += 10;
    if (!frameSize || cursor + frameSize > bytes.length) break;

    const frame = bytes.slice(cursor, cursor + frameSize);
    const value = frameId.startsWith("T") ? decodeTextFrame(frame) : "";
    if (frameId === "TIT2" && value) result.title = value;
    if (frameId === "TPE1" && value) result.artist = value;
    if (frameId === "TALB" && value) result.album = value;
    if (frameId === "TCON" && value) result.genre = value;
    if (frameId === "TBPM" && value) {
      const bpm = Number.parseInt(value, 10);
      if (Number.isFinite(bpm) && bpm > 0) result.bpm = bpm;
    }
    if (frameId === "APIC" && !result.cover) {
      result.cover = parseApicFrame(frame) ?? undefined;
    }
    if (frameId === "USLT" && !result.lyrics) {
      result.lyrics = parseUnsynchronisedLyricsFrame(frame) || undefined;
    }

    cursor += frameSize;
  }

  return result;
}
