import { notFound, redirect } from "next/navigation";
import { getForUser } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { DocumentEditor } from "@/components/document-editor";

export default async function DocumentPage({ params, searchParams }: PageProps<"/doc/[id]">) {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const { id } = await params;
  const detail = await getForUser(user.id, id).catch(() => null);
  if (!detail) notFound();

  const candidates =
    detail.level === "owner"
      ? await prisma.user.findMany({
          where: { id: { not: user.id } },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true },
        })
      : [];

  const query = await searchParams;

  return (
    <DocumentEditor
      documentId={detail.id}
      initialTitle={detail.title}
      initialContent={detail.content}
      level={detail.level}
      ownerName={detail.ownerName}
      shares={detail.shares}
      candidates={candidates}
      importedPartially={query.imported === "partial"}
    />
  );
}
