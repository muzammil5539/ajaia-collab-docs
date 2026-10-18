/**
 * Pure authorization rules. No database, no request objects — a user id and a
 * document's ownership/share records in, a decision out. Everything that reads
 * or writes a document asks these questions first.
 */

export type Role = "VIEWER" | "EDITOR";
export type AccessLevel = "owner" | "editor" | "viewer" | "none";

export type DocumentAccess = {
  ownerId: string;
  shares: readonly { userId: string; role: string }[];
};

export function accessLevel(
  userId: string | null | undefined,
  doc: DocumentAccess,
): AccessLevel {
  if (!userId) return "none";
  if (doc.ownerId === userId) return "owner";

  const share = doc.shares.find((s) => s.userId === userId);
  if (!share) return "none";
  return share.role === "EDITOR" ? "editor" : "viewer";
}

/** Can open the document and read its content. */
export function canRead(userId: string | null | undefined, doc: DocumentAccess): boolean {
  return accessLevel(userId, doc) !== "none";
}

/** Can change the title or the content. */
export function canWrite(userId: string | null | undefined, doc: DocumentAccess): boolean {
  const level = accessLevel(userId, doc);
  return level === "owner" || level === "editor";
}

/** Can share, revoke access, or delete. Owner only. */
export function canManage(userId: string | null | undefined, doc: DocumentAccess): boolean {
  return accessLevel(userId, doc) === "owner";
}

export function isRole(value: unknown): value is Role {
  return value === "VIEWER" || value === "EDITOR";
}
