"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function DocumentActions() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"new" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createBlank() {
    setBusy("new");
    setError(null);

    const response = await fetch("/api/documents", { method: "POST" });
    const body = await response.json().catch(() => ({}));

    setBusy(null);

    if (!response.ok) {
      setError(body.error ?? "The document could not be created.");
      return;
    }

    router.push(`/doc/${body.id}`);
  }

  async function importFile(file: File) {
    setBusy("import");
    setError(null);

    const form = new FormData();
    form.set("file", file);

    const response = await fetch("/api/documents/import", { method: "POST", body: form });
    const body = await response.json().catch(() => ({}));

    setBusy(null);
    if (fileInput.current) fileInput.current.value = "";

    if (!response.ok) {
      setError(body.error ?? "That file could not be imported.");
      return;
    }

    router.push(`/doc/${body.id}${body.droppedRichContent ? "?imported=partial" : ""}`);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy !== null}
            className="min-h-11 rounded-lg border border-[#D9DDD6] bg-white px-4 text-sm text-[#22282A] hover:border-[#0F5E5A] disabled:opacity-60"
          >
            {busy === "import" ? "Importing…" : "Import a file"}
          </button>
          <span className="font-mono text-[11px] text-[#4A5250]">.txt .md .docx · max 2 MB</span>
        </div>

        <label htmlFor="import-file" className="sr-only">
          Choose a file to import
        </label>
        <input
          id="import-file"
          ref={fileInput}
          type="file"
          accept=".txt,.md,.docx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importFile(file);
          }}
        />

        <button
          type="button"
          onClick={createBlank}
          disabled={busy !== null}
          className="min-h-11 rounded-lg bg-[#0F5E5A] px-5 text-sm font-medium text-white hover:bg-[#0A3F3C] disabled:opacity-60"
        >
          {busy === "new" ? "Creating…" : "New document"}
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="max-w-[420px] rounded-lg border border-[#E4C98C] bg-[#FBF1DF] px-4 py-3 text-right text-[13px] text-[#6B4600]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
