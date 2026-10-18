import { createDocument } from "@/lib/documents";
import { importFile, MAX_IMPORT_BYTES } from "@/lib/import-file";
import { currentUser } from "@/lib/session";
import { errorResponse, unauthorized } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Attach a file to import." }, { status: 400 });
    }

    if (file.size > MAX_IMPORT_BYTES) {
      return Response.json(
        { error: `${file.name} is larger than 2 MB.`, code: "TOO_LARGE" },
        { status: 413 },
      );
    }

    const imported = await importFile({
      filename: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });

    const doc = await createDocument(user.id, {
      title: imported.title,
      content: imported.html,
    });

    return Response.json(
      { id: doc.id, droppedRichContent: imported.droppedRichContent },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
