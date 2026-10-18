import { unshareDocument } from "@/lib/documents";
import { currentUser } from "@/lib/session";
import { errorResponse, unauthorized } from "@/lib/api";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/documents/[id]/shares/[userId]">,
) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();

    const { id, userId } = await ctx.params;
    await unshareDocument(user.id, id, userId);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
