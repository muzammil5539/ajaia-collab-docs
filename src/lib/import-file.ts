/**
 * The import pipeline: file bytes in, a title and sanitized HTML out.
 *
 * Pure in the sense that matters for testing — no database, no request, no
 * filesystem. All three source formats converge on one sanitizer, so the editor
 * can only ever receive the small set of tags it knows how to render.
 */
import mammoth from "mammoth";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;

export type ImportErrorCode =
  | "UNSUPPORTED_TYPE"
  | "TOO_LARGE"
  | "EMPTY_FILE"
  | "UNREADABLE";

export class ImportError extends Error {
  constructor(
    readonly code: ImportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ImportError";
  }
}

export type ImportedDocument = {
  title: string;
  html: string;
  /** True when the source held things this editor cannot represent (images, tables, links). */
  droppedRichContent: boolean;
};

/** The only tags a document may contain. Everything else is stripped on import. */
const ALLOWED_TAGS = [
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
];

/** Tags the editor cannot represent; their presence is reported back to the user. */
const DROPPED_TAGS = /<\s*(img|table|a\s|a>|iframe|video|figure|object|embed)/i;

export function sanitizeDocumentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    // Anything outside the allowlist loses its tag but keeps its words,
    // except script/style, whose text is dropped with it.
    nonTextTags: ["script", "style", "textarea", "noscript"],
    transformTags: {
      b: "strong",
      i: "em",
      h4: "h3",
      h5: "h3",
      h6: "h3",
      div: "p",
    },
  });
}

export function titleFromFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const stem = base.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return stem.length > 0 ? stem.slice(0, 120) : "Untitled document";
}

export function extensionOf(filename: string): string {
  const match = /\.[^.]+$/.exec(filename.toLowerCase());
  return match ? match[0] : "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function plainTextToHtml(text: string): string {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`);

  return paragraphs.join("");
}

export async function importFile(input: {
  filename: string;
  bytes: Uint8Array;
}): Promise<ImportedDocument> {
  const extension = extensionOf(input.filename);

  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new ImportError(
      "UNSUPPORTED_TYPE",
      `${input.filename} can't be imported. Supported types are ${SUPPORTED_EXTENSIONS.join(", ")}.`,
    );
  }

  if (input.bytes.byteLength === 0) {
    throw new ImportError("EMPTY_FILE", `${input.filename} is empty.`);
  }

  if (input.bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new ImportError(
      "TOO_LARGE",
      `${input.filename} is larger than ${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} MB.`,
    );
  }

  let rawHtml: string;

  if (extension === ".docx") {
    try {
      const result = await mammoth.convertToHtml({ buffer: Buffer.from(input.bytes) });
      rawHtml = result.value;
    } catch {
      throw new ImportError(
        "UNREADABLE",
        `${input.filename} could not be read as a Word document.`,
      );
    }
  } else {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(input.bytes);
    rawHtml = extension === ".md" ? await marked.parse(text) : plainTextToHtml(text);
  }

  const html = sanitizeDocumentHtml(rawHtml).trim();

  return {
    title: titleFromFilename(input.filename),
    html: html.length > 0 ? html : "<p></p>",
    droppedRichContent: DROPPED_TAGS.test(rawHtml),
  };
}
