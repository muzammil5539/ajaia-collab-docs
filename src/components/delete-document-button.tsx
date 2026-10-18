"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteDocumentButton({
  documentId,
  title,
}: {
  documentId: string;
  title: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const response = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    setBusy(false);
    setConfirming(false);

    if (response.ok) router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        aria-label={`Delete ${title}`}
        onClick={() => setConfirming(true)}
        className="min-h-11 rounded-lg border border-[#D9DDD6] bg-white px-3 text-[13px] text-[#22282A] hover:border-[#8A2B06] hover:text-[#8A2B06]"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-[13px] text-[#3A4240]">Delete for everyone?</span>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="min-h-11 rounded-lg bg-[#8A2B06] px-3 text-[13px] font-medium text-white disabled:opacity-60"
      >
        {busy ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="min-h-11 rounded-lg border border-[#D9DDD6] bg-white px-3 text-[13px] text-[#22282A]"
      >
        Cancel
      </button>
    </span>
  );
}
