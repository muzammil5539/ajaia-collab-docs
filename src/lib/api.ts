import { DocumentError } from "./documents";
import { ImportError } from "./import-file";

const DOCUMENT_STATUS = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  BAD_REQUEST: 400,
} as const;

/** Maps module errors onto responses. Unknown errors never leak their message. */
export function errorResponse(error: unknown): Response {
  if (error instanceof DocumentError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: DOCUMENT_STATUS[error.code] },
    );
  }

  if (error instanceof ImportError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.code === "TOO_LARGE" ? 413 : 400 },
    );
  }

  console.error(error);
  return Response.json({ error: "Something went wrong." }, { status: 500 });
}

export function unauthorized(): Response {
  return Response.json({ error: "Sign in first." }, { status: 401 });
}
