// Phase 24 — Funnel / Landing-Page Drag-Drop Builder.
// Typed block schema matching the block palette that already existed in
// components/crm/sections/KVlPages.tsx (Headline/Paragraph/Button/Image/
// Two-Columns/Form/Testimonial/Stats-Row) — this gives that palette an
// actual data model to place onto a real, persisted, reorderable canvas.

export type BlockKind =
  | "headline" | "paragraph" | "button" | "image"
  | "two_columns" | "form" | "testimonial" | "stats_row";

export interface HeadlineBlock { kind: "headline"; text: string; subtext: string }
export interface ParagraphBlock { kind: "paragraph"; text: string }
export interface ButtonBlock { kind: "button"; text: string; href: string }
export interface ImageBlock { kind: "image"; src: string; alt: string }
export interface TwoColumnsBlock { kind: "two_columns"; left: string; right: string }
export interface FormBlock { kind: "form"; heading: string; fields: string[]; submitLabel: string }
export interface TestimonialBlock { kind: "testimonial"; quote: string; author: string }
export interface StatsRowBlock { kind: "stats_row"; stats: { value: string; label: string }[] }

export type PageBlockData =
  | HeadlineBlock | ParagraphBlock | ButtonBlock | ImageBlock
  | TwoColumnsBlock | FormBlock | TestimonialBlock | StatsRowBlock;

export interface PlacedBlock {
  id: string;
  data: PageBlockData;
}

export const BLOCK_PALETTE: { kind: BlockKind; label: string }[] = [
  { kind: "headline", label: "Headline" },
  { kind: "paragraph", label: "Paragraph" },
  { kind: "button", label: "Button" },
  { kind: "image", label: "Image" },
  { kind: "two_columns", label: "Two Columns" },
  { kind: "form", label: "Form" },
  { kind: "testimonial", label: "Testimonial" },
  { kind: "stats_row", label: "Stats Row" },
];

export function defaultBlockData(kind: BlockKind): PageBlockData {
  switch (kind) {
    case "headline": return { kind, text: "Your Headline Here", subtext: "A supporting line of copy." };
    case "paragraph": return { kind, text: "Write a paragraph of body copy here." };
    case "button": return { kind, text: "Click Me", href: "#" };
    case "image": return { kind, src: "", alt: "" };
    case "two_columns": return { kind, left: "Left column copy.", right: "Right column copy." };
    case "form": return { kind, heading: "Get Started", fields: ["Full Name", "Work Email"], submitLabel: "Submit" };
    case "testimonial": return { kind, quote: "This product changed how we work.", author: "A happy customer" };
    case "stats_row": return { kind, stats: [{ value: "100+", label: "Customers" }, { value: "4.9★", label: "Rating" }] };
  }
}

let seq = 1;
export function newBlockId(): string {
  return `blk-${Date.now().toString(36)}-${seq++}`;
}
