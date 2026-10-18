import { describe, expect, it } from "vitest";
import { accessLevel, canManage, canRead, canWrite } from "./access";

const doc = {
  ownerId: "owner",
  shares: [
    { userId: "editor", role: "EDITOR" },
    { userId: "viewer", role: "VIEWER" },
  ],
};

describe("access", () => {
  it("names the level each kind of user has", () => {
    expect(accessLevel("owner", doc)).toBe("owner");
    expect(accessLevel("editor", doc)).toBe("editor");
    expect(accessLevel("viewer", doc)).toBe("viewer");
    expect(accessLevel("stranger", doc)).toBe("none");
    expect(accessLevel(null, doc)).toBe("none");
  });

  it("lets the owner, an editor and a viewer read, and nobody else", () => {
    expect(canRead("owner", doc)).toBe(true);
    expect(canRead("editor", doc)).toBe(true);
    expect(canRead("viewer", doc)).toBe(true);
    expect(canRead("stranger", doc)).toBe(false);
    expect(canRead(undefined, doc)).toBe(false);
  });

  it("lets only the owner and an editor write", () => {
    expect(canWrite("owner", doc)).toBe(true);
    expect(canWrite("editor", doc)).toBe(true);
    expect(canWrite("viewer", doc)).toBe(false);
    expect(canWrite("stranger", doc)).toBe(false);
  });

  it("lets only the owner share, revoke or delete", () => {
    expect(canManage("owner", doc)).toBe(true);
    expect(canManage("editor", doc)).toBe(false);
    expect(canManage("viewer", doc)).toBe(false);
    expect(canManage("stranger", doc)).toBe(false);
  });

  it("treats an unrecognised role as view-only rather than as edit access", () => {
    const odd = { ownerId: "owner", shares: [{ userId: "someone", role: "ADMIN" }] };

    expect(accessLevel("someone", odd)).toBe("viewer");
    expect(canWrite("someone", odd)).toBe(false);
  });

  it("gives no access on a document with no shares", () => {
    const solo = { ownerId: "owner", shares: [] };

    expect(canRead("editor", solo)).toBe(false);
    expect(canRead("owner", solo)).toBe(true);
  });
});
