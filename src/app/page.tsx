import Link from "next/link";
import { redirect } from "next/navigation";
import { listForUser, type DocumentSummary } from "@/lib/documents";
import { currentUser } from "@/lib/session";
import { AccountBar } from "@/components/account-bar";
import { DocumentActions } from "@/components/document-actions";
import { DeleteDocumentButton } from "@/components/delete-document-button";

function when(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function OwnedRow({ doc }: { doc: DocumentSummary }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#D9DDD6] bg-white px-4.5 py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <Link href={`/doc/${doc.id}`} className="text-base font-medium hover:underline">
          {doc.title}
        </Link>
        <span className="text-[13px] text-[#4A5250]">Edited {when(doc.updatedAt)}</span>
      </div>
      <div className="flex items-center gap-2.5">
        {doc.shareCount > 0 ? (
          <span className="rounded-full bg-[#E3EEEC] px-2.5 py-1 text-xs text-[#0A3F3C]">
            Shared with {doc.shareCount}
          </span>
        ) : (
          <span className="text-xs text-[#4A5250]">Private</span>
        )}
        <DeleteDocumentButton documentId={doc.id} title={doc.title} />
      </div>
    </li>
  );
}

function SharedRow({ doc }: { doc: DocumentSummary }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#D9DDD6] bg-white px-4.5 py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <Link href={`/doc/${doc.id}`} className="text-base font-medium hover:underline">
          {doc.title}
        </Link>
        <span className="text-[13px] text-[#4A5250]">
          Owner: {doc.ownerName} · edited {when(doc.updatedAt)}
        </span>
      </div>
      <span
        className={
          doc.level === "editor"
            ? "rounded-full bg-[#E3EEEC] px-3 py-1.5 text-xs font-medium text-[#0A3F3C]"
            : "rounded-full bg-[#EDEFEA] px-3 py-1.5 text-xs font-medium text-[#3A4240]"
        }
      >
        {doc.level === "editor" ? "You can edit" : "View only"}
      </span>
    </li>
  );
}

export default async function DocumentsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const { owned, shared } = await listForUser(user.id);

  return (
    <>
      <header className="border-b border-[#D9DDD6] bg-white">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 px-8 py-4">
          <span className="font-serif text-xl font-semibold">Ajaia Docs</span>
          <AccountBar name={user.name} email={user.email} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-7 px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-3xl font-semibold">Documents</h1>
            <p className="text-sm text-[#4A5250]">
              {owned.length} owned · {shared.length} shared with you
            </p>
          </div>
          <DocumentActions />
        </div>

        <section className="flex flex-col gap-2.5">
          <h2 className="font-mono text-xs uppercase tracking-[0.08em] text-[#4A5250]">
            Owned by you
          </h2>
          {owned.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {owned.map((doc) => (
                <OwnedRow key={doc.id} doc={doc} />
              ))}
            </ul>
          ) : (
            <p className="rounded-[10px] border border-[#D9DDD6] bg-white p-8 text-center text-sm text-[#3A4240]">
              Nothing here yet. Create a blank document, or import a .txt, .md or .docx file to
              start from something you already wrote.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="font-mono text-xs uppercase tracking-[0.08em] text-[#4A5250]">
            Shared with you
          </h2>
          {shared.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {shared.map((doc) => (
                <SharedRow key={doc.id} doc={doc} />
              ))}
            </ul>
          ) : (
            <p className="rounded-[10px] border border-[#D9DDD6] bg-white p-8 text-center text-sm text-[#3A4240]">
              No one has shared a document with you yet.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
