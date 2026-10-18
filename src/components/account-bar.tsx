"use client";

import { useRouter } from "next/navigation";

export function AccountBar({ name, email }: { name: string; email: string }) {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/session", { method: "DELETE" });
    router.push("/signin");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <span className="flex min-h-11 items-center gap-2.5 rounded-full border border-[#D9DDD6] py-1.5 pl-1.5 pr-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F5E5A] text-[13px] font-semibold text-white">
          {name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
        <span className="text-sm" title={email}>
          {name}
        </span>
      </span>
      <button
        type="button"
        onClick={signOut}
        className="min-h-11 rounded-lg border border-[#D9DDD6] bg-white px-4 text-sm text-[#22282A] hover:border-[#0F5E5A]"
      >
        Sign out
      </button>
    </div>
  );
}
