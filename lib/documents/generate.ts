// Orchestrates template selection and builds a GeneratedDoc (title + filename +
// HTML), plus the HTTP headers needed to serve/download it in each format.

import { TEMPLATES } from "./templates";
import type { DocFormat, DocInput, DocType, GeneratedDoc } from "./types";

const TITLES: Record<DocType, string> = {
  proposal: "Proposal",
  quotation: "Quotation",
  invoice: "Invoice",
  agreement: "Service Agreement",
  nda: "Non-Disclosure Agreement",
  amc: "Annual Maintenance Contract",
};

function slug(value: string): string {
  return (value || "document")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "document";
}

// Build the fully-rendered document. Never throws — on failure it returns a
// minimal error document so callers always get valid HTML.
export function generateDocument(input: DocInput): GeneratedDoc {
  try {
    const type = input?.type;
    const render = TEMPLATES[type];
    if (!render) {
      throw new Error(`unknown document type: ${String(type)}`);
    }
    const html = render(input);
    const title = `${TITLES[type]} — ${input.company || "Document"}`;
    const filename = `${slug(TITLES[type])}-${slug(input.company || "document")}`;
    return { type, title, html, filename };
  } catch (err) {
    console.error("[documents] generateDocument failed:", err);
    const type = (input?.type ?? "proposal") as DocType;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Document Error</title></head><body style="font-family:sans-serif;padding:40px"><h1>Unable to generate document</h1><p>The document could not be generated from the supplied input.</p></body></html>`;
    return { type, title: "Document Error", html, filename: "document-error" };
  }
}

// Content-Type + Content-Disposition for a given output format.
//   html → inline text/html
//   pdf  → text/html (the browser prints the page to PDF)
//   docx → application/msword so browsers save/open the HTML as a .doc
export function docResponseHeaders(
  doc: GeneratedDoc,
  format: DocFormat
): Record<string, string> {
  const fmt: DocFormat = format === "docx" || format === "pdf" ? format : "html";

  if (fmt === "docx") {
    return {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${doc.filename}.doc"`,
      "X-Document-Type": doc.type,
    };
  }

  if (fmt === "pdf") {
    // No native PDF conversion here — serve printable HTML. The browser's
    // Print-to-PDF produces the final PDF from this page.
    return {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${doc.filename}.html"`,
      "X-Document-Type": doc.type,
      "X-PDF-Note": "print-to-pdf-from-browser",
    };
  }

  return {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Disposition": `inline; filename="${doc.filename}.html"`,
    "X-Document-Type": doc.type,
  };
}
