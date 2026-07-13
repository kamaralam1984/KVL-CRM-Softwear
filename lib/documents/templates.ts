// Print-friendly, self-contained HTML templates for each business document type.
//
// Every template is a pure function of DocInput — no `new Date()` at module load,
// no external assets, all CSS inlined so the output prints cleanly to PDF from a
// browser and also opens in Word when served with an application/msword MIME.
//
// Dates: always taken from input.date (the route/generator supplies a value).

import type { DocInput, DocService, DocType } from "./types";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function safeDate(input: DocInput): string {
  return input.date && String(input.date).trim() ? String(input.date) : "—";
}

function sender(input: DocInput): string {
  return input.senderCompany?.trim() || "Your Company";
}

function senderPerson(input: DocInput): string {
  return input.senderName?.trim() || "";
}

function client(input: DocInput): string {
  return input.clientName?.trim() || input.company || "Client";
}

function servicesOf(input: DocInput): DocService[] {
  return Array.isArray(input.services) ? input.services : [];
}

function computedTotal(input: DocInput): number {
  if (typeof input.total === "number" && Number.isFinite(input.total)) {
    return input.total;
  }
  return servicesOf(input).reduce(
    (sum, s) => sum + (Number.isFinite(s.price) ? s.price : 0),
    0
  );
}

// ---------------------------------------------------------------------------
// Shared chrome: page shell + reusable blocks
// ---------------------------------------------------------------------------

const BASE_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a2230; background: #f4f6fb; line-height: 1.55;
    font-size: 14px;
  }
  .page {
    background: #ffffff; max-width: 820px; margin: 24px auto; padding: 48px 56px;
    box-shadow: 0 2px 18px rgba(20,30,60,.10); border-radius: 6px;
  }
  .head {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #2b59ff; padding-bottom: 20px; margin-bottom: 28px;
  }
  .brand { font-size: 22px; font-weight: 700; color: #16233d; letter-spacing: .2px; }
  .brand small { display: block; font-size: 12px; font-weight: 500; color: #6b7688; margin-top: 4px; }
  .doc-meta { text-align: right; font-size: 12.5px; color: #4a5568; }
  .doc-title { font-size: 20px; font-weight: 700; color: #2b59ff; text-transform: uppercase; letter-spacing: 1px; }
  .parties { display: flex; gap: 40px; margin-bottom: 28px; flex-wrap: wrap; }
  .party { flex: 1 1 220px; }
  .party h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .8px; color: #8a94a6; }
  .party p { margin: 0; font-weight: 600; color: #16233d; }
  table.items { width: 100%; border-collapse: collapse; margin: 8px 0 20px; }
  table.items th {
    text-align: left; background: #16233d; color: #fff; font-size: 12px;
    text-transform: uppercase; letter-spacing: .5px; padding: 11px 14px;
  }
  table.items th.num, table.items td.num { text-align: right; }
  table.items td { padding: 12px 14px; border-bottom: 1px solid #e6e9f0; vertical-align: top; }
  table.items td .desc { display: block; font-size: 12px; color: #6b7688; margin-top: 3px; }
  table.items tr:last-child td { border-bottom: 1px solid #e6e9f0; }
  .totals { margin-left: auto; width: 300px; }
  .totals .row { display: flex; justify-content: space-between; padding: 8px 14px; }
  .totals .grand {
    background: #eef2ff; font-weight: 700; font-size: 16px; color: #16233d;
    border-radius: 4px; margin-top: 4px;
  }
  .section { margin: 22px 0; }
  .section h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .6px; color: #2b59ff; margin: 0 0 8px; }
  .notes { background: #f7f9fc; border-left: 3px solid #2b59ff; padding: 12px 16px; font-size: 13px; color: #45506a; border-radius: 0 4px 4px 0; }
  .legal p { margin: 0 0 14px; text-align: justify; }
  .legal ol { padding-left: 20px; }
  .legal li { margin-bottom: 12px; }
  .clause-h { font-weight: 700; color: #16233d; }
  .signatures { display: flex; gap: 60px; margin-top: 56px; flex-wrap: wrap; }
  .sign { flex: 1 1 220px; }
  .sign .line { border-top: 1px solid #45506a; padding-top: 6px; font-size: 12.5px; color: #45506a; }
  .foot { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e6e9f0; font-size: 11.5px; color: #8a94a6; text-align: center; }
  @media print {
    body { background: #fff; }
    .page { box-shadow: none; margin: 0; max-width: none; border-radius: 0; padding: 24px 32px; }
    @page { size: A4; margin: 14mm; }
  }
`;

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="page">
${body}
</div>
</body>
</html>`;
}

function header(input: DocInput, titleLabel: string, refPrefix: string): string {
  const ref = `${refPrefix}-${(safeDate(input).replace(/[^0-9]/g, "") || "0000").slice(0, 8)}`;
  return `<div class="head">
    <div class="brand">${esc(sender(input))}<small>${esc(senderPerson(input) || "Business Document")}</small></div>
    <div class="doc-meta">
      <div class="doc-title">${esc(titleLabel)}</div>
      <div>Ref: ${esc(ref)}</div>
      <div>Date: ${esc(safeDate(input))}</div>
    </div>
  </div>`;
}

function parties(input: DocInput, leftLabel = "From", rightLabel = "To"): string {
  return `<div class="parties">
    <div class="party"><h4>${esc(leftLabel)}</h4><p>${esc(sender(input))}</p>${
    senderPerson(input) ? `<p style="font-weight:500;color:#6b7688">${esc(senderPerson(input))}</p>` : ""
  }</div>
    <div class="party"><h4>${esc(rightLabel)}</h4><p>${esc(input.company || client(input))}</p>${
    input.clientName ? `<p style="font-weight:500;color:#6b7688">Attn: ${esc(input.clientName)}</p>` : ""
  }</div>
  </div>`;
}

function itemsTable(input: DocInput, priceLabel = "Amount"): string {
  const rows = servicesOf(input);
  const body = rows.length
    ? rows
        .map(
          (s, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td>${esc(s.name || "Item")}${s.description ? `<span class="desc">${esc(s.description)}</span>` : ""}</td>
        <td class="num">${money(s.price)}</td>
      </tr>`
        )
        .join("\n")
    : `<tr><td colspan="3" style="color:#8a94a6">No line items provided.</td></tr>`;
  const total = computedTotal(input);
  return `<table class="items">
    <thead><tr><th class="num" style="width:44px">#</th><th>Description</th><th class="num" style="width:150px">${esc(priceLabel)} (INR)</th></tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${money(total)}</span></div>
    <div class="row grand"><span>Total</span><span>INR ${money(total)}</span></div>
  </div>`;
}

function notesBlock(input: DocInput): string {
  if (!input.notes?.trim()) return "";
  return `<div class="section"><h3>Notes</h3><div class="notes">${esc(input.notes)}</div></div>`;
}

function validity(input: DocInput): string {
  const days = typeof input.validityDays === "number" && input.validityDays > 0 ? input.validityDays : 30;
  return `<p style="font-size:12.5px;color:#6b7688">This document is valid for ${days} day(s) from the date of issue.</p>`;
}

function signatures(input: DocInput, leftRole = "For " + sender(input), rightRole = "For " + (input.company || client(input))): string {
  return `<div class="signatures">
    <div class="sign"><div class="line">${esc(leftRole)}<br/>${esc(senderPerson(input) || "Authorised Signatory")}</div></div>
    <div class="sign"><div class="line">${esc(rightRole)}<br/>${esc(client(input))}</div></div>
  </div>`;
}

function foot(input: DocInput): string {
  return `<div class="foot">${esc(sender(input))} · Generated ${esc(safeDate(input))} · This is a system-generated document.</div>`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function proposal(input: DocInput): string {
  const body = `${header(input, "Proposal", "PROP")}
  ${parties(input)}
  <div class="section">
    <h3>Overview</h3>
    <p>Dear ${esc(client(input))}, thank you for the opportunity to work with ${esc(
    input.company || client(input)
  )}. Based on our understanding of your requirements, ${esc(
    sender(input)
  )} is pleased to present the following proposal outlining the recommended scope of services and associated investment.</p>
  </div>
  <div class="section">
    <h3>Recommended Services</h3>
    ${itemsTable(input, "Investment")}
  </div>
  ${notesBlock(input)}
  <div class="section">${validity(input)}</div>
  ${signatures(input, "Prepared by", "Accepted by")}
  ${foot(input)}`;
  return shell(`Proposal — ${input.company}`, body);
}

function quotation(input: DocInput): string {
  const body = `${header(input, "Quotation", "QUO")}
  ${parties(input)}
  <div class="section">
    <h3>Quoted Items</h3>
    ${itemsTable(input, "Rate")}
  </div>
  ${notesBlock(input)}
  <div class="section">
    <h3>Terms</h3>
    <p style="font-size:12.5px;color:#45506a">Prices are exclusive of applicable taxes unless stated. ${
      typeof input.validityDays === "number" && input.validityDays > 0
        ? `Quotation valid for ${input.validityDays} day(s).`
        : "Quotation valid for 30 day(s)."
    } Payment terms as mutually agreed.</p>
  </div>
  ${signatures(input, "Quoted by", "Approved by")}
  ${foot(input)}`;
  return shell(`Quotation — ${input.company}`, body);
}

function invoice(input: DocInput): string {
  const total = computedTotal(input);
  const body = `${header(input, "Invoice", "INV")}
  ${parties(input, "Billed From", "Billed To")}
  <div class="section">
    <h3>Invoice Details</h3>
    ${itemsTable(input, "Amount")}
  </div>
  <div class="section">
    <div class="notes"><strong>Amount Due: INR ${money(total)}</strong><br/>Kindly remit payment as per the agreed terms.</div>
  </div>
  ${notesBlock(input)}
  ${signatures(input, "For " + sender(input), "Received by")}
  ${foot(input)}`;
  return shell(`Invoice — ${input.company}`, body);
}

function agreement(input: DocInput): string {
  const body = `${header(input, "Service Agreement", "AGR")}
  <div class="section legal">
    <p>This Service Agreement ("Agreement") is entered into as of ${esc(safeDate(input))} by and between <span class="clause-h">${esc(
    sender(input)
  )}</span> ("Service Provider") and <span class="clause-h">${esc(
    input.company || client(input)
  )}</span> ("Client").</p>
    <ol>
      <li><span class="clause-h">Scope of Services.</span> The Service Provider agrees to provide the services described in the attached schedule or as mutually agreed in writing between the parties.</li>
      <li><span class="clause-h">Fees & Payment.</span> The Client shall pay the fees set out for the services, being INR ${money(
        computedTotal(input)
      )} in aggregate, in accordance with the agreed payment schedule.</li>
      <li><span class="clause-h">Term & Termination.</span> This Agreement commences on the effective date and continues until the services are completed, unless terminated earlier by either party with reasonable written notice.</li>
      <li><span class="clause-h">Confidentiality.</span> Each party shall keep confidential all non-public information disclosed by the other party and use it solely for the purposes of this Agreement.</li>
      <li><span class="clause-h">Intellectual Property.</span> Deliverables produced under this Agreement shall vest in the Client upon full payment, save for the Service Provider's pre-existing materials.</li>
      <li><span class="clause-h">Liability.</span> Neither party shall be liable for indirect or consequential losses. The Service Provider's aggregate liability shall not exceed the total fees paid under this Agreement.</li>
      <li><span class="clause-h">Governing Law.</span> This Agreement shall be governed by and construed in accordance with applicable law, and the parties submit to the exclusive jurisdiction of the competent courts.</li>
    </ol>
  </div>
  ${notesBlock(input)}
  ${signatures(input)}
  ${foot(input)}`;
  return shell(`Service Agreement — ${input.company}`, body);
}

function nda(input: DocInput): string {
  const body = `${header(input, "Non-Disclosure Agreement", "NDA")}
  <div class="section legal">
    <p>This Non-Disclosure Agreement ("Agreement") is made on ${esc(safeDate(input))} between <span class="clause-h">${esc(
    sender(input)
  )}</span> and <span class="clause-h">${esc(input.company || client(input))}</span> (each a "Party" and together the "Parties").</p>
    <ol>
      <li><span class="clause-h">Confidential Information.</span> "Confidential Information" means any non-public business, technical, financial or commercial information disclosed by one Party ("Discloser") to the other ("Recipient"), whether orally, in writing or otherwise.</li>
      <li><span class="clause-h">Obligations.</span> The Recipient shall (a) keep the Confidential Information strictly confidential, (b) use it solely to evaluate or perform the intended relationship, and (c) not disclose it to any third party without prior written consent.</li>
      <li><span class="clause-h">Exclusions.</span> Confidential Information does not include information that is or becomes public through no fault of the Recipient, is lawfully received from a third party, or is independently developed.</li>
      <li><span class="clause-h">Term.</span> The confidentiality obligations shall survive for a period of ${
        typeof input.validityDays === "number" && input.validityDays > 0 ? input.validityDays : 730
      } day(s) from the date of disclosure.</li>
      <li><span class="clause-h">Return of Materials.</span> Upon request, the Recipient shall promptly return or destroy all Confidential Information and any copies thereof.</li>
      <li><span class="clause-h">No License.</span> Nothing in this Agreement grants any right or license under any intellectual property except as expressly stated.</li>
      <li><span class="clause-h">Governing Law.</span> This Agreement shall be governed by applicable law and the Parties submit to the exclusive jurisdiction of the competent courts.</li>
    </ol>
  </div>
  ${notesBlock(input)}
  ${signatures(input, "For " + sender(input), "For " + (input.company || client(input)))}
  ${foot(input)}`;
  return shell(`NDA — ${input.company}`, body);
}

function amc(input: DocInput): string {
  const body = `${header(input, "Annual Maintenance Contract", "AMC")}
  ${parties(input, "Service Provider", "Client")}
  <div class="section legal">
    <p>This Annual Maintenance Contract ("Contract") is made on ${esc(safeDate(input))} between <span class="clause-h">${esc(
    sender(input)
  )}</span> ("Service Provider") and <span class="clause-h">${esc(
    input.company || client(input)
  )}</span> ("Client") for the maintenance and support of the systems and services set out below.</p>
  </div>
  <div class="section">
    <h3>Covered Services</h3>
    ${itemsTable(input, "Annual Fee")}
  </div>
  <div class="section legal">
    <ol>
      <li><span class="clause-h">Term.</span> This Contract is valid for a period of twelve (12) months from the effective date and may be renewed by mutual agreement.</li>
      <li><span class="clause-h">Scope.</span> The Service Provider shall provide preventive and corrective maintenance, support, and updates for the covered services during the term.</li>
      <li><span class="clause-h">Response.</span> Support requests shall be acknowledged and addressed within reasonable service levels as mutually agreed.</li>
      <li><span class="clause-h">Exclusions.</span> This Contract excludes hardware replacement, third-party licensing costs, and issues arising from misuse unless otherwise agreed.</li>
      <li><span class="clause-h">Fees.</span> The annual maintenance fee is INR ${money(
        computedTotal(input)
      )}, payable as per the agreed schedule.</li>
    </ol>
  </div>
  ${notesBlock(input)}
  ${signatures(input)}
  ${foot(input)}`;
  return shell(`AMC — ${input.company}`, body);
}

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const TEMPLATES: Record<DocType, (input: DocInput) => string> = {
  proposal,
  quotation,
  invoice,
  agreement,
  nda,
  amc,
};
