/**
 * The only module that touches document storage. Every entry point takes the
 * acting user and asks `access` before it reads or writes, so a route handler
 * cannot reach a document without a decision being made about it.
 */
import { prisma } from "./prisma";
import { sanitizeDocumentHtml } from "./import-file";
import {
  accessLevel,
  canManage,
  canRead,
  canWrite,
  type AccessLevel,
  type Role,
} from "./access";

export type DocumentErrorCode = "NOT_FOUND" | "FORBIDDEN" | "BAD_REQUEST";

export class DocumentError extends Error {
  constructor(
    readonly code: DocumentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DocumentError";
  }
}

const notFound = () => new DocumentError("NOT_FOUND", "Document not found.");

export type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: Date;
  ownerName: string;
  shareCount: number;
  level: AccessLevel;
};

export type DocumentDetail = {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
  ownerId: string;
  ownerName: string;
  level: AccessLevel;
  shares: { userId: string; name: string; email: string; role: Role }[];
};

const withRelations = {
  include: { owner: { select: { name: true } }, shares: true },
} as const;

export async function listForUser(userId: string): Promise<{
  owned: DocumentSummary[];
  shared: DocumentSummary[];
}> {
  const [owned, shared] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      ...withRelations,
    }),
    prisma.document.findMany({
      where: { shares: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      ...withRelations,
    }),
  ]);

  const toSummary = (doc: (typeof owned)[number]): DocumentSummary => ({
    id: doc.id,
    title: doc.title,
    updatedAt: doc.updatedAt,
    ownerName: doc.owner.name,
    shareCount: doc.shares.length,
    level: accessLevel(userId, doc),
  });

  return { owned: owned.map(toSummary), shared: shared.map(toSummary) };
}

export async function getForUser(userId: string, documentId: string): Promise<DocumentDetail> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: { select: { id: true, name: true } },
      shares: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (!doc || !canRead(userId, doc)) throw notFound();

  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    updatedAt: doc.updatedAt,
    ownerId: doc.ownerId,
    ownerName: doc.owner.name,
    level: accessLevel(userId, doc),
    shares: doc.shares.map((share) => ({
      userId: share.userId,
      name: share.user.name,
      email: share.user.email,
      role: share.role === "EDITOR" ? "EDITOR" : "VIEWER",
    })),
  };
}

export async function createDocument(
  userId: string,
  input: { title?: string; content?: string } = {},
) {
  const title = (input.title ?? "Untitled document").trim().slice(0, 200) || "Untitled document";

  return prisma.document.create({
    data: {
      title,
      content: input.content ? sanitizeDocumentHtml(input.content) : "<p></p>",
      ownerId: userId,
    },
  });
}

export async function updateDocument(
  userId: string,
  documentId: string,
  patch: { title?: string; content?: string },
) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { shares: true },
  });

  if (!doc || !canRead(userId, doc)) throw notFound();
  if (!canWrite(userId, doc)) {
    throw new DocumentError("FORBIDDEN", "You have view-only access to this document.");
  }

  const data: { title?: string; content?: string } = {};

  if (patch.title !== undefined) {
    const title = patch.title.trim().slice(0, 200);
    if (title.length === 0) throw new DocumentError("BAD_REQUEST", "A title cannot be empty.");
    data.title = title;
  }

  if (patch.content !== undefined) {
    data.content = sanitizeDocumentHtml(patch.content);
  }

  if (Object.keys(data).length === 0) {
    throw new DocumentError("BAD_REQUEST", "Nothing to update.");
  }

  return prisma.document.update({ where: { id: documentId }, data });
}

export async function deleteDocument(userId: string, documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { shares: true },
  });

  if (!doc || !canRead(userId, doc)) throw notFound();
  if (!canManage(userId, doc)) {
    throw new DocumentError("FORBIDDEN", "Only the owner can delete this document.");
  }

  await prisma.document.delete({ where: { id: documentId } });
}

export async function shareDocument(
  userId: string,
  documentId: string,
  input: { email: string; role: Role },
) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { shares: true },
  });

  if (!doc || !canRead(userId, doc)) throw notFound();
  if (!canManage(userId, doc)) {
    throw new DocumentError("FORBIDDEN", "Only the owner can share this document.");
  }

  const target = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!target) throw new DocumentError("BAD_REQUEST", "No account with that email address.");
  if (target.id === doc.ownerId) {
    throw new DocumentError("BAD_REQUEST", "The owner already has access.");
  }

  return prisma.share.upsert({
    where: { documentId_userId: { documentId, userId: target.id } },
    create: { documentId, userId: target.id, role: input.role },
    update: { role: input.role },
  });
}

export async function unshareDocument(
  userId: string,
  documentId: string,
  targetUserId: string,
) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { shares: true },
  });

  if (!doc || !canRead(userId, doc)) throw notFound();
  if (!canManage(userId, doc)) {
    throw new DocumentError("FORBIDDEN", "Only the owner can change access.");
  }

  await prisma.share.deleteMany({ where: { documentId, userId: targetUserId } });
}
