import { jsPDF } from "jspdf";

export interface ReceiptData {
  hash: string;
  contractId: string;
  issuer: string;
  /** ISO 8601 UTC timestamp of the confirmed anchor. */
  timestampIso: string;
}

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4, mm
const USABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;

const FIELDS: Array<[label: string, value: (data: ReceiptData) => string]> = [
  ["DOCUMENT HASH (SHA-256)", (d) => d.hash],
  ["NETWORK", () => "Stellar Soroban Testnet"],
  ["SMART CONTRACT ID", (d) => d.contractId],
  ["ISSUER WALLET ADDRESS", (d) => d.issuer],
  ["UTC TIMESTAMP OF ANCHOR", (d) => d.timestampIso],
];

function drawDivider(doc: jsPDF, y: number): void {
  doc.setFillColor(0, 0, 0);
  doc.rect(MARGIN, y, USABLE_WIDTH, 1.5, "F");
}

/**
 * Generates a Brutalist compliance receipt for a confirmed anchor and
 * triggers a browser download. Black on white, courier only, no color —
 * matches the design system's monochrome constraints even on paper.
 */
export function downloadComplianceReceipt(data: ReceiptData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setProperties({
    title: "Axiom Protocol Compliance Receipt",
    subject: data.hash,
    creator: "Axiom Protocol",
  });

  doc.setTextColor(0, 0, 0);

  let y = 28;
  doc.setFont("courier", "bold");
  doc.setFontSize(22);
  doc.text("AXIOM PROTOCOL", MARGIN, y);

  y += 8;
  doc.setFontSize(11);
  doc.text("// CRYPTOGRAPHIC COMPLIANCE RECEIPT", MARGIN, y, {
    charSpace: 0.6,
  });

  y += 6;
  drawDivider(doc, y);
  y += 14;

  for (const [label, getValue] of FIELDS) {
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.text(label, MARGIN, y, { charSpace: 0.4 });

    y += 6;
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(getValue(data), MARGIN, y, { maxWidth: USABLE_WIDTH });

    y += 12;
  }

  drawDivider(doc, y);
  y += 8;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text(
    "THIS RECEIPT IS A LOCAL RECORD OF AN ON-CHAIN ANCHOR. VERIFY " +
      "INDEPENDENTLY ON THE STELLAR TESTNET LEDGER.",
    MARGIN,
    y,
    { maxWidth: USABLE_WIDTH, charSpace: 0.2 }
  );

  doc.save(`axiom-receipt-${data.hash.slice(0, 12)}.pdf`);
}
