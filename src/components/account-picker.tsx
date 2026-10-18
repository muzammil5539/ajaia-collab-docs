"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Account = { id: string; name: string; email: string };

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AccountPicker({ users }: { users: Account[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(userId: string) {
    setPending(userId);
    setError(null);

    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      setPending(null);
      setError("That account could not be signed in. Reseed the database and try again.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => signIn(user.id)}
          disabled={pending !== null}
          className="flex items-center gap-4 rounded-[10px] border border-[#D9DDD6] bg-white p-4 text-left hover:border-[#0F5E5A] disabled:opacity-60"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F5E5A] text-sm font-semibold text-white">
            {initials(user.name)}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-medium">{user.name}</span>
            <span className="font-mono text-xs text-[#4A5250]">{user.email}</span>
          </span>
          {pending === user.id ? (
            <span className="ml-auto text-xs text-[#4A5250]">Signing in…</span>
          ) : null}
        </button>
      ))}

      {error ? (
        <p role="alert" className="text-sm text-[#8A2B06]">
          {error}
        </p>
      ) : null}

      {users.length === 0 ? (
        <p className="rounded-lg border border-[#E4C98C] bg-[#FBF1DF] p-4 text-sm text-[#6B4600]">
          No seeded accounts found. Run <code className="font-mono">npm run db:reset</code> to
          create them.
        </p>
      ) : null}
    </div>
  );
}
