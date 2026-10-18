import { z } from "zod";
import { createDocument, listForUser } from "@/lib/documents";
import { currentUser } from "@/lib/session";
import { errorResponse, unauthorized } from "@/lib/api";

const body = z.object({ title: z.string().max(200).optional() });

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();

    return Response.json(await listForUser(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();

    const raw = await request.json().catch(() => ({}));
    const parsed = body.safeParse(raw);
    if (!parsed.success) return Response.json({ error: "Invalid title." }, { status: 400 });

    const doc = await createDocument(user.id, parsed.data);
    return Response.json({ id: doc.id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
