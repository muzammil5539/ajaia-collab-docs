/**
 * One integration test covering the whole sharing promise against a real
 * database: owner shares, the other side sees it, a viewer cannot write, a
 * stranger cannot even tell the document exists, and revoking takes it away.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type DocumentsModule = typeof import("@/lib/documents");

let documents: DocumentsModule;
let prisma: (typeof import("@/lib/prisma"))["prisma"];
let directory: string;

const OWNER = "it_owner";
const COLLEAGUE = "it_colleague";
const STRANGER = "it_stranger";

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "ajaia-docs-test-"));
  process.env.DATABASE_URL = `file:${join(directory, "test.db")}`;

  execFileSync("npx", ["prisma", "db", "push"], {
    env: process.env,
    stdio: "pipe",
  });

  documents = await import("@/lib/documents");
  ({ prisma } = await import("@/lib/prisma"));

  await prisma.user.createMany({
    data: [
      { id: OWNER, email: "owner@test.local", name: "Owner" },
      { id: COLLEAGUE, email: "colleague@test.local", name: "Colleague" },
      { id: STRANGER, email: "stranger@test.local", name: "Stranger" },
    ],
  });
}, 180_000);

afterAll(async () => {
  await prisma?.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

describe("sharing a document", () => {
  it("moves a document from one person's list to another's, with the access the owner chose", async () => {
    const created = await documents.createDocument(OWNER, { title: "Launch plan" });

    const beforeSharing = await documents.listForUser(COLLEAGUE);
    expect(beforeSharing.shared).toHaveLength(0);

    await documents.shareDocument(OWNER, created.id, {
      email: "colleague@test.local",
      role: "VIEWER",
    });

    const afterSharing = await documents.listForUser(COLLEAGUE);
    expect(afterSharing.owned).toHaveLength(0);
    expect(afterSharing.shared.map((doc) => doc.title)).toEqual(["Launch plan"]);
    expect(afterSharing.shared[0].level).toBe("viewer");
    expect(afterSharing.shared[0].ownerName).toBe("Owner");

    // A viewer reads but cannot write.
    const asViewer = await documents.getForUser(COLLEAGUE, created.id);
    expect(asViewer.level).toBe("viewer");
    await expect(
      documents.updateDocument(COLLEAGUE, created.id, { content: "<p>edited</p>" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Nobody else can tell the document exists.
    await expect(documents.getForUser(STRANGER, created.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // Promoting to editor makes the write land, and the owner sees it.
    await documents.shareDocument(OWNER, created.id, {
      email: "colleague@test.local",
      role: "EDITOR",
    });
    await documents.updateDocument(COLLEAGUE, created.id, {
      content: "<p>edited by the colleague</p>",
    });

    const asOwner = await documents.getForUser(OWNER, created.id);
    expect(asOwner.content).toBe("<p>edited by the colleague</p>");
    expect(asOwner.shares).toEqual([
      expect.objectContaining({ userId: COLLEAGUE, role: "EDITOR" }),
    ]);

    // Only the owner can share or delete.
    await expect(
      documents.shareDocument(COLLEAGUE, created.id, {
        email: "stranger@test.local",
        role: "VIEWER",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(documents.deleteDocument(COLLEAGUE, created.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    // Revoking takes it off the colleague's list entirely.
    await documents.unshareDocument(OWNER, created.id, COLLEAGUE);
    const afterRevoke = await documents.listForUser(COLLEAGUE);
    expect(afterRevoke.shared).toHaveLength(0);
    await expect(documents.getForUser(COLLEAGUE, created.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("stores content as sanitized HTML, whoever writes it", async () => {
    const created = await documents.createDocument(OWNER, {
      title: "Imported draft",
      content: '<h2>Heading</h2><script>steal()</script><p onclick="x()">Body</p>',
    });

    const stored = await documents.getForUser(OWNER, created.id);

    expect(stored.content).toContain("<h2>Heading</h2>");
    expect(stored.content).not.toContain("script");
    expect(stored.content).not.toContain("onclick");
  });

  it("refuses to share with an address that has no account", async () => {
    const created = await documents.createDocument(OWNER, { title: "Private" });

    await expect(
      documents.shareDocument(OWNER, created.id, { email: "nobody@test.local", role: "VIEWER" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
