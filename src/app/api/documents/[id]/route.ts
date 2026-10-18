import { z } from "zod";
import { deleteDocument, getForUser, updateDocument } from "@/lib/documents";
import { currentUser } from "@/lib/session";
import { errorResponse, unauthorized } from "@/lib/api";

const patchBody = z
  .object({
    title: z.string().max(200).optional(),
    content: z.string().max(500_000).optional(),
  })
  .refine((value) => value.title !== undefined || value.content !== undefined, {
    message: "Send a title, content, or both.",
  });

export async function GET(_request: Request, ctx: RouteContext<"/api/documents/[id]">) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();

    const { id } = await ctx.params;
    return Response.json(await getForUser(user.id, id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/documents/[id]">) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();

    const parsed = patchBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Send a title, content, or both." }, { status: 400 });
    }

    const { id } = await ctx.params;
    const doc = await updateDocument(user.id, id, parsed.data);
    return Response.json({ id: doc.id, updatedAt: doc.updatedAt });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/documents/[id]">) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();

    const { id } = await ctx.params;
    await deleteDocument(user.id, id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
