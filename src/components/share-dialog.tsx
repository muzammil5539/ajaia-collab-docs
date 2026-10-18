"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type ShareEntry = { userId: string; name: string; email: string; role: "VIEWER" | "EDITOR" };
export type Candidate = { id: string; name: string; email: string };

export function ShareDialog({
  documentId,
  title,
  shares,
  candidates,
  onClose,
}: {
  documentId: string;
  title: string;
  shares: ShareEntry[];
  candidates: Candidate[];
  onClose: () => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(shares);
  const [email, setEmail] = useState(candidates[0]?.email ?? "");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  async function share() {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/documents/${documentId}/shares`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    const body = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(body.error ?? "That person could not be given access.");
      return;
    }

    const person = candidates.find((candidate) => candidate.email === email);
    if (person) {
      setCurrent((entries) => [
        ...entries.filter((entry) => entry.userId !== person.id),
        { userId: person.id, name: person.name, email: person.email, role },
      ]);
    }

    router.refresh();
  }

  async function revoke(userId: string) {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/documents/${documentId}/shares/${userId}`, {
      method: "DELETE",
    });

    setBusy(false);

    if (!response.ok) {
      setError("Access could not be revoked.");
      return;
    }

    setCurrent((entries) => entries.filter((entry) => entry.userId !== userId));
    router.refresh();
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-xl border border-[#D9DDD6] bg-white p-6 text-[#16181A] backdrop:bg-black/30"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Share “{title}”</h2>
          <p className="text-[13px] text-[#4A5250]">
            Only people you add can open this document.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <div className="flex min-w-0 flex-1 basis-[220px] flex-col gap-1.5">
            <label htmlFor="share-person" className="text-[13px] text-[#3A4240]">
              Teammate
            </label>
            <select
              id="share-person"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-lg border border-[#D9DDD6] bg-white px-3 text-sm"
            >
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.email}>
                  {candidate.email} — {candidate.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex w-[150px] flex-col gap-1.5">
            <label htmlFor="share-role" className="text-[13px] text-[#3A4240]">
              Access
            </label>
            <select
              id="share-role"
              value={role}
              onChange={(event) => setRole(event.target.value as "EDITOR" | "VIEWER")}
              className="h-11 rounded-lg border border-[#D9DDD6] bg-white px-3 text-sm"
            >
              <option value="EDITOR">Can edit</option>
              <option value="VIEWER">Can view</option>
            </select>
          </div>

          <button
            type="button"
            onClick={share}
            disabled={busy || candidates.length === 0}
            className="h-11 rounded-lg bg-[#0F5E5A] px-5 text-sm font-medium text-white disabled:opacity-60"
          >
            Share
          </button>
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-[#8A2B06]">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-[#EDEFEA] pt-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">
              You <span className="text-[#4A5250]">(owner)</span>
            </span>
            <span className="text-[13px] text-[#3A4240]">Owner</span>
          </div>

          {current.map((entry) => (
            <div key={entry.userId} className="flex items-center justify-between gap-3">
              <span className="text-sm">{entry.name}</span>
              <div className="flex items-center gap-2.5">
                <span
                  className={
                    entry.role === "EDITOR"
                      ? "rounded-full bg-[#E3EEEC] px-2.5 py-1 text-xs text-[#0A3F3C]"
                      : "rounded-full bg-[#EDEFEA] px-2.5 py-1 text-xs text-[#3A4240]"
                  }
                >
                  {entry.role === "EDITOR" ? "Can edit" : "Can view"}
                </span>
                <button
                  type="button"
                  onClick={() => revoke(entry.userId)}
                  disabled={busy}
                  className="h-11 rounded-lg border border-[#D9DDD6] px-3 text-[13px] disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {current.length === 0 ? (
            <p className="text-[13px] text-[#4A5250]">Not shared with anyone yet.</p>
          ) : null}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="h-11 rounded-lg border border-[#D9DDD6] px-4 text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
