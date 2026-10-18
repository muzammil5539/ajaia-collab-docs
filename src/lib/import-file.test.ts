import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ImportError,
  MAX_IMPORT_BYTES,
  importFile,
  sanitizeDocumentHtml,
  titleFromFilename,
} from "./import-file";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("importFile", () => {
  it("turns plain text into paragraphs", async () => {
    const result = await importFile({
      filename: "notes.txt",
      bytes: bytes("First line\n\nSecond paragraph"),
    });

    expect(result.html).toBe("<p>First line</p><p>Second paragraph</p>");
    expect(result.title).toBe("notes");
  });

  it("keeps single newlines inside a paragraph as line breaks", async () => {
    const result = await importFile({
      filename: "address.txt",
      bytes: bytes("Line one\nLine two"),
    });

    expect(result.html).toBe("<p>Line one<br />Line two</p>");
  });

  it("escapes markup that arrives as plain text", async () => {
    const result = await importFile({
      filename: "raw.txt",
      bytes: bytes("<script>alert(1)</script>"),
    });

    expect(result.html).not.toContain("<script");
    expect(result.html).toContain("&lt;script&gt;");
  });

  it("preserves headings, lists and emphasis from markdown", async () => {
    const result = await importFile({
      filename: "release-plan.md",
      bytes: bytes("# Plan\n\nShip **today**, review _tomorrow_.\n\n- one\n- two\n\n1. first\n"),
    });

    expect(result.html).toContain("<h1>Plan</h1>");
    expect(result.html).toContain("<strong>today</strong>");
    expect(result.html).toContain("<em>tomorrow</em>");
    expect(result.html).toContain("<ul>");
    expect(result.html).toContain("<ol>");
    expect(result.title).toBe("release plan");
  });

  it("strips scripts and dangerous attributes from markdown HTML", async () => {
    const result = await importFile({
      filename: "sneaky.md",
      bytes: bytes('Hello <script>steal()</script><p onclick="steal()">there</p>'),
    });

    expect(result.html).not.toContain("script");
    expect(result.html).not.toContain("onclick");
    expect(result.html).toContain("there");
  });

  it("reports when content the editor cannot hold was dropped", async () => {
    const withImage = await importFile({
      filename: "post.md",
      bytes: bytes("![a chart](chart.png)\n\nBody text"),
    });
    const plain = await importFile({ filename: "post.md", bytes: bytes("Body text") });

    expect(withImage.droppedRichContent).toBe(true);
    expect(withImage.html).not.toContain("<img");
    expect(plain.droppedRichContent).toBe(false);
  });

  it("rejects an unsupported file type", async () => {
    await expect(
      importFile({ filename: "forecast.xlsx", bytes: bytes("anything") }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_TYPE" });
  });

  it("rejects a file over the size limit", async () => {
    const big = new Uint8Array(MAX_IMPORT_BYTES + 1);
    big.fill(65);

    await expect(importFile({ filename: "huge.txt", bytes: big })).rejects.toBeInstanceOf(
      ImportError,
    );
  });

  it("rejects an empty file", async () => {
    await expect(
      importFile({ filename: "empty.md", bytes: new Uint8Array(0) }),
    ).rejects.toMatchObject({ code: "EMPTY_FILE" });
  });

  it("preserves headings, emphasis and both list kinds from a real .docx", async () => {
    const fixture = new URL("../../tests/fixtures/quarterly-brief.docx", import.meta.url);

    const result = await importFile({
      filename: "quarterly-brief.docx",
      bytes: new Uint8Array(readFileSync(fixture)),
    });

    expect(result.title).toBe("quarterly brief");
    expect(result.html).toContain("<h1>Quarterly brief</h1>");
    expect(result.html).toContain("<strong>today</strong>");
    expect(result.html).toContain("<em>tomorrow</em>");
    expect(result.html).toContain("<ul><li>First bullet</li><li>Second bullet</li></ul>");
    expect(result.html).toContain("<ol><li>Step one</li><li>Step two</li></ol>");
    expect(result.droppedRichContent).toBe(false);
  });

  it("fails cleanly when a .docx is not a real Word file", async () => {
    await expect(
      importFile({ filename: "fake.docx", bytes: bytes("not a zip archive") }),
    ).rejects.toMatchObject({ code: "UNREADABLE" });
  });
});

describe("sanitizeDocumentHtml", () => {
  it("keeps the tags the editor can render and drops the rest", () => {
    const html = sanitizeDocumentHtml(
      '<h2>Title</h2><p>Body <b>bold</b> <i>italic</i> <u>under</u></p><table><tr><td>cell</td></tr></table>',
    );

    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<u>under</u>");
    expect(html).not.toContain("<table");
    expect(html).toContain("cell");
  });
});

describe("titleFromFilename", () => {
  it("uses the file stem and tidies separators", () => {
    expect(titleFromFilename("/tmp/q4_planning-notes.docx")).toBe("q4 planning notes");
  });

  it("falls back when there is no usable stem", () => {
    expect(titleFromFilename(".md")).toBe("Untitled document");
  });
});
