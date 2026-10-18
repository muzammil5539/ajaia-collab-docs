"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ShareDialog, type Candidate, type ShareEntry } from "./share-dialog";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_DEBOUNCE_MS = 800;

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? "h-11 min-w-11 rounded-lg border border-[#0F5E5A] bg-[#E3EEEC] px-3 text-[15px] text-[#0A3F3C]"
          : "h-11 min-w-11 rounded-lg border border-[#D9DDD6] bg-white px-3 text-[15px] text-[#22282A] hover:border-[#0F5E5A]"
      }
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const blockValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "p";

  return (
    <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-2 px-8 py-2">
      <div className="flex gap-1">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
      </div>

      <span className="h-7 w-px bg-[#D9DDD6]" />

      <div className="flex items-center gap-2">
        <label htmlFor="block-style" className="text-[13px] text-[#3A4240]">
          Style
        </label>
        <select
          id="block-style"
          value={blockValue}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "p") editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 })
                .run();
          }}
          className="h-11 rounded-lg border border-[#D9DDD6] bg-white px-3 text-sm text-[#22282A]"
        >
          <option value="p">Body text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>

      <span className="h-7 w-px bg-[#D9DDD6]" />

      <div className="flex gap-1">
        <ToolbarButton
          label="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Bulleted list
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered list
        </ToolbarButton>
      </div>
    </div>
  );
}

export function DocumentEditor({
  documentId,
  initialTitle,
  initialContent,
  level,
  ownerName,
  shares,
  candidates,
  importedPartially,
}: {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  level: "owner" | "editor" | "viewer" | "none";
  ownerName: string;
  shares: ShareEntry[];
  candidates: Candidate[];
  importedPartially: boolean;
}) {
  const router = useRouter();
  const canEdit = level === "owner" || level === "editor";

  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ title?: string; content?: string }>({});

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (patch.title === undefined && patch.content === undefined) return;

    setSaveState("saving");

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setSaveState("error");
        setSaveError(body.error ?? "The last change could not be saved.");
        return;
      }

      setSaveState("saved");
      setSaveError(null);
    } catch {
      setSaveState("error");
      setSaveError("The last change could not be saved. Check your connection.");
    }
  }, [documentId]);

  const schedule = useCallback(
    (patch: { title?: string; content?: string }) => {
      pending.current = { ...pending.current, ...patch };
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent || "<p></p>",
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: { "aria-label": "Document content", role: "textbox" },
    },
    onUpdate: ({ editor: instance }) => schedule({ content: instance.getHTML() }),
    onTransaction: () => rerender(),
  });

  useEffect(() => {
    if (saveState !== "saving" && saveState !== "error") return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const statusLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Not saved"
          : "Up to date";

  return (
    <>
      <header className="border-b border-[#D9DDD6] bg-white">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 px-8 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="flex min-h-11 items-center text-sm text-[#0F5E5A]">
              ← Documents
            </Link>
            <label htmlFor="doc-title" className="sr-only">
              Document title
            </label>
            <input
              id="doc-title"
              type="text"
              value={title}
              readOnly={!canEdit}
              onChange={(event) => {
                setTitle(event.target.value);
                if (canEdit) schedule({ title: event.target.value });
              }}
              className="min-h-11 w-[320px] max-w-full rounded-md border border-transparent bg-transparent px-2.5 py-2 font-serif text-xl font-semibold hover:border-[#D9DDD6] focus:border-[#0F5E5A] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3.5">
            <span
              className={
                saveState === "error"
                  ? "font-mono text-xs text-[#8A2B06]"
                  : "font-mono text-xs text-[#3A4240]"
              }
            >
              {statusLabel}
            </span>
            {level === "owner" ? (
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="min-h-11 rounded-lg bg-[#0F5E5A] px-5 text-sm font-medium text-white hover:bg-[#0A3F3C]"
              >
                Share
              </button>
            ) : null}
          </div>
        </div>

        {canEdit && editor ? (
          <div className="border-t border-[#EDEFEA]">
            <Toolbar editor={editor} />
          </div>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-3.5 px-8 pb-12 pt-7">
        {!canEdit ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#D9DDD6] bg-[#EDEFEA] px-4.5 py-3">
            <span className="text-[13px] text-[#22282A]">
              View only — shared by {ownerName}
            </span>
          </div>
        ) : null}

        {importedPartially ? (
          <div className="rounded-lg border border-[#E4C98C] bg-[#FBF1DF] px-4.5 py-3 text-[13px] text-[#6B4600]">
            Imported. Headings, lists and emphasis were kept; images, tables and links in the
            source file were dropped.
          </div>
        ) : null}

        {saveError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#2B1B00] px-4.5 py-3.5 text-[#FFF6E6]"
          >
            <span className="text-sm">{saveError} Your last edit is still on screen.</span>
            <button
              type="button"
              onClick={() => {
                pending.current = {
                  title,
                  content: editor?.getHTML() ?? initialContent,
                };
                void flush();
              }}
              className="min-h-11 rounded-lg border border-[#7A6136] px-3.5 text-[13px] text-[#FFF6E6]"
            >
              Retry now
            </button>
          </div>
        ) : null}

        <div className="document-surface w-full max-w-[820px] rounded-[10px] border border-[#D9DDD6] bg-white px-16 py-14">
          <EditorContent editor={editor} />
        </div>

        <p className="font-mono text-xs text-[#4A5250]">
          {canEdit
            ? "Autosaves while you type · simultaneous edits resolve last-write-wins"
            : "Ask the owner for edit access to make changes"}
        </p>
      </main>

      {shareOpen ? (
        <ShareDialog
          documentId={documentId}
          title={title}
          shares={shares}
          candidates={candidates}
          onClose={() => {
            setShareOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
