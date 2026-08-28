// Phase 43 — Forms, Surveys & Quiz Builder. One typed field model shared by
// all three "kinds": a `scoreWeight` on a field's option is what turns a
// plain survey into a scored quiz (sum the selected options' weights, then
// map the total through `scoring_rules` bands to an outcome) — generalizes
// the hardcoded `recommendPlan()` pattern already in components/marketing/
// Quiz.tsx rather than building three separate builders.

export type FieldType = "text" | "email" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "rating";

export interface FormFieldOption {
  label: string;
  value: string;
  scoreWeight?: number;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: FormFieldOption[]; // only for select/radio/checkbox
}

export interface ScoreBand {
  minScore: number;
  maxScore: number;
  outcomeTitle: string;
  outcomeText: string;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short Text",
  email: "Email",
  phone: "Phone",
  textarea: "Long Text",
  select: "Dropdown",
  radio: "Multiple Choice",
  checkbox: "Checkboxes",
  rating: "Rating (1-5)",
};

export const FIELD_TYPES: FieldType[] = ["text", "email", "phone", "textarea", "select", "radio", "checkbox", "rating"];

let seq = 1;
export function newFieldId(): string {
  return `fld-${Date.now().toString(36)}-${seq++}`;
}

export function defaultField(type: FieldType): FormField {
  const base = { id: newFieldId(), type, label: FIELD_TYPE_LABELS[type], required: false };
  if (type === "email") return { ...base, required: true };
  if (type === "select" || type === "radio" || type === "checkbox") {
    return {
      ...base,
      options: [
        { label: "Option 1", value: "option_1", scoreWeight: 0 },
        { label: "Option 2", value: "option_2", scoreWeight: 0 },
      ],
    };
  }
  return base;
}

// Sums the scoreWeight of every selected option across all fields. A field
// with no `options` (text/email/phone/textarea/rating) never contributes.
export function computeScore(fields: FormField[], answers: Record<string, string | string[]>): number {
  let total = 0;
  for (const field of fields) {
    if (!field.options) continue;
    const answer = answers[field.id];
    const selected = Array.isArray(answer) ? answer : answer ? [answer] : [];
    for (const value of selected) {
      const opt = field.options.find((o) => o.value === value);
      if (opt?.scoreWeight) total += opt.scoreWeight;
    }
  }
  return total;
}

export function matchScoreBand(bands: ScoreBand[], score: number): ScoreBand | null {
  return bands.find((b) => score >= b.minScore && score <= b.maxScore) ?? null;
}
