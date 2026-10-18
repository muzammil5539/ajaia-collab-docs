import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { endSession, startSession } from "@/lib/session";
import { errorResponse } from "@/lib/api";

const body = z.object({ userId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const parsed = body.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "A userId is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user) return Response.json({ error: "Unknown account." }, { status: 404 });

    await startSession(user.id);
    return Response.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  await endSession();
  return Response.json({ ok: true });
}
