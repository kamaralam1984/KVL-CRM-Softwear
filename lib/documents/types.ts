// Types for the Phase 7 Proposal / Document Generator.
//
// A DocInput drives every template. Only `type` and `company` are required;
// everything else is optional and templates fall back to sensible defaults.

export type DocType =
  | "proposal"
  | "quotation"
  | "invoice"
  | "agreement"
  | "nda"
  | "amc";

export type DocFormat = "html" | "pdf" | "docx";

export type DocService = {
  name: string;
  price: number;
  description?: string;
};

export type DocInput = {
  type: DocType;
  company: string;
  clientName?: string;
  services?: DocService[];
  total?: number;
  senderCompany?: string;
  senderName?: string;
  validityDays?: number;
  notes?: string;
  date?: string;
};

export type GeneratedDoc = {
  type: DocType;
  title: string;
  html: string;
  filename: string;
};
