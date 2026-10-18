/**
 * Mock authentication, deliberately shallow: pick a seeded account, get a
 * signed HTTP-only cookie holding its id. No passwords, no registration.
 * Swapping this for a real identity provider should not touch any other module.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "ajaia_session";
const SECRET = process.env.SESSION_SECRET ?? "dev-only-secret-change-me";

export function signUserId(userId: string): string {
  const mac = createHmac("sha256", SECRET).update(userId).digest("hex");
  return `${userId}.${mac}`;
}

/** Returns the user id if the cookie is intact, otherwise null. Pure — used in tests. */
export function readSignedUserId(value: string | undefined | null): string | null {
  if (!value) return null;

  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const userId = value.slice(0, separator);
  const provided = Buffer.from(value.slice(separator + 1), "hex");
  const expected = createHmac("sha256", SECRET).update(userId).digest();

  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? userId : null;
}

export async function currentUser() {
  const cookieStore = await cookies();
  const userId = readSignedUserId(cookieStore.get(COOKIE_NAME)?.value);
  if (!userId) return null;

  return prisma.user.findUnique({ where: { id: userId } });
}

export async function startSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signUserId(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function endSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
