import { z } from "zod";
import { shareDocument } from "@/lib/documents";
import { currentUser } from "@/lib/session";
import { errorResponse, unauthorized } from "@/lib/api";

const body = z.object({
  email: z.email(),
  role: z.enum(["VIEWER", "EDITOR"]),
});

export async function POST(request: Request, ctx: RouteContext<"/api/documents/[id]/shares">) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();

    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: "An email address and a role of VIEWER or EDITOR are required." },
        { status: 400 },
      );
    }

    const { id } = await ctx.params;
    const share = await shareDocument(user.id, id, parsed.data);
    return Response.json({ userId: share.userId, role: share.role }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
